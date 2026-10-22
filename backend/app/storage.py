"""Persistent guest sessions and an append-only, environment-scoped reward ledger."""

import hashlib
import os
import secrets
import ssl
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    create_engine,
    event,
    func,
    select,
)
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column
from sqlalchemy.pool import StaticPool

from app.config import Settings


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class GuestSession(Base):
    __tablename__ = "guest_sessions"
    __table_args__ = (CheckConstraint("environment IN ('test', 'live')"),)

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    environment: Mapped[str] = mapped_column(String(4))
    expires_at: Mapped[int] = mapped_column(BigInteger)


class RewardLedger(Base):
    __tablename__ = "reward_ledger"
    __table_args__ = (
        UniqueConstraint("environment", "reward_key", name="uq_reward_environment"),
        CheckConstraint("amount > 0 AND amount <= 2147483647"),
        CheckConstraint("environment IN ('test', 'live')"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    environment: Mapped[str] = mapped_column(String(4), index=True)
    reward_key: Mapped[str] = mapped_column(String(256))
    campaign_key: Mapped[str] = mapped_column(String(50))
    amount: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class StorageUnavailable(Exception):
    pass


class InvalidSession(Exception):
    pass


class UnknownUser(Exception):
    pass


class DuplicateReward(Exception):
    pass


def utc_iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class RewardStore:
    def __init__(self, settings: Settings, *, enabled: bool = True):
        self.settings = settings
        self.engine = None
        self.initialized = False
        if not enabled:
            return
        try:
            self.engine = self._create_engine(settings.database_url)
        except (ValueError, TypeError, OSError, SQLAlchemyError):
            # Never return or log driver errors: they may contain the database URL.
            self.engine = None

    @staticmethod
    def _create_engine(database_url: str | None):
        is_vercel = bool(os.getenv("VERCEL"))
        if database_url is None:
            if is_vercel:
                return None
            path = Path(__file__).resolve().parents[1] / "var" / "apptech.db"
            path.parent.mkdir(parents=True, exist_ok=True)
            database_url = f"sqlite:///{path}"
        url = make_url(database_url)
        if url.get_backend_name() == "sqlite":
            if is_vercel:
                return None
            kwargs = {
                "connect_args": {"check_same_thread": False, "timeout": 10},
                "hide_parameters": True,
            }
            if url.database in {None, "", ":memory:"}:
                kwargs["poolclass"] = StaticPool
            engine = create_engine(url, **kwargs)

            @event.listens_for(engine, "connect")
            def sqlite_foreign_keys(connection, _):
                cursor = connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()

            return engine
        if url.get_backend_name() not in {"postgres", "postgresql"}:
            return None
        query = dict(url.query)
        sslmode = query.pop("sslmode", None)
        connection_args = {"timeout": 5}
        if sslmode is not None:
            if sslmode == "disable":
                connection_args["ssl_context"] = False
            elif sslmode in {"require", "verify-ca", "verify-full"}:
                connection_args["ssl_context"] = ssl.create_default_context()
            else:
                return None
        url = url.set(drivername="postgresql+pg8000", query=query)
        return create_engine(
            url,
            connect_args=connection_args,
            hide_parameters=True,
            pool_pre_ping=True,
            pool_size=2,
            max_overflow=0,
            pool_timeout=5,
        )

    def initialize(self):
        if self.engine is None:
            return
        try:
            Base.metadata.create_all(self.engine)
            self.initialized = True
        except (OSError, SQLAlchemyError):
            self.initialized = False

    def close(self):
        self.initialized = False
        if self.engine is not None:
            self.engine.dispose()

    def is_ready(self) -> bool:
        if not self.initialized or self.engine is None:
            return False
        try:
            with self.engine.connect() as connection:
                connection.execute(select(User.id).limit(1))
                connection.execute(select(GuestSession.token_hash).limit(1))
                connection.execute(select(RewardLedger.id).limit(1))
            return True
        except (OSError, SQLAlchemyError):
            return False

    def require_ready(self):
        if not self.is_ready():
            raise StorageUnavailable

    def create_session(self) -> dict:
        self.require_ready()
        token = secrets.token_urlsafe(32)
        user_id = str(uuid4())
        now = datetime.now(timezone.utc)
        expires_at = int(time.time()) + self.settings.token_ttl_days * 86400
        try:
            with Session(self.engine) as session, session.begin():
                session.add(User(id=user_id, created_at=now))
                session.flush()
                session.add(
                    GuestSession(
                        token_hash=hashlib.sha256(token.encode()).hexdigest(),
                        user_id=user_id,
                        environment=self.settings.adpopcorn_environment,
                        expires_at=expires_at,
                    )
                )
        except (OSError, SQLAlchemyError):
            raise StorageUnavailable from None
        return {
            "token": token,
            "user_id": user_id,
            "environment": self.settings.adpopcorn_environment,
            "expires_at": utc_iso(datetime.fromtimestamp(expires_at, timezone.utc)),
        }

    def wallet(self, token: str) -> dict:
        self.require_ready()
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        environment = self.settings.adpopcorn_environment
        try:
            with Session(self.engine) as session, session.begin():
                guest = session.get(GuestSession, token_hash)
                if (
                    guest is None
                    or guest.environment != environment
                    or guest.expires_at <= int(time.time())
                ):
                    raise InvalidSession
                criteria = (
                    RewardLedger.user_id == guest.user_id,
                    RewardLedger.environment == environment,
                )
                # The aggregate is evaluated before LIMIT in the same statement,
                # so concurrent credits cannot make the balance and rows disagree.
                rows = session.execute(
                    select(RewardLedger, func.sum(RewardLedger.amount).over())
                    .where(*criteria)
                    .order_by(RewardLedger.created_at.desc(), RewardLedger.id.desc())
                    .limit(50)
                ).all()
                return {
                    "environment": environment,
                    "user_id": guest.user_id,
                    "balance": rows[0][1] if rows else 0,
                    "unit": "P",
                    "transactions": [
                        {
                            "id": row.id,
                            "amount": row.amount,
                            "campaign_key": row.campaign_key,
                            "created_at": utc_iso(row.created_at),
                        }
                        for row, _ in rows
                    ],
                }
        except (OSError, SQLAlchemyError):
            raise StorageUnavailable from None

    def credit(self, user_id: str, reward_key: str, campaign_key: str, amount: int):
        self.require_ready()
        environment = self.settings.adpopcorn_environment
        try:
            with Session(self.engine) as session, session.begin():
                user = session.scalar(
                    select(User.id)
                    .join(GuestSession, GuestSession.user_id == User.id)
                    .where(User.id == user_id, GuestSession.environment == environment)
                    .limit(1)
                )
                if user is None:
                    raise UnknownUser
                session.add(
                    RewardLedger(
                        id=str(uuid4()),
                        user_id=user_id,
                        environment=environment,
                        reward_key=reward_key,
                        campaign_key=campaign_key,
                        amount=amount,
                        created_at=datetime.now(timezone.utc),
                    )
                )
                session.flush()
        except IntegrityError:
            # A concurrent callback may have committed the same reward first.
            # Confirm the exact conflict rather than classifying every DB error
            # as a duplicate, and never credit outside the unique transaction.
            try:
                with Session(self.engine) as session:
                    existing = session.scalar(
                        select(RewardLedger.id).where(
                            RewardLedger.environment == environment,
                            RewardLedger.reward_key == reward_key,
                        )
                    )
                if existing is not None:
                    raise DuplicateReward from None
            except SQLAlchemyError:
                pass
            raise StorageUnavailable from None
        except (OSError, SQLAlchemyError):
            raise StorageUnavailable from None
