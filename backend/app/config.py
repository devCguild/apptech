"""Server-only reward settings. Secret values must never appear in responses."""

import os
from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class Settings:
    database_url: str | None = field(default=None, repr=False)
    adpopcorn_hash_key: str | None = field(default=None, repr=False)
    adpopcorn_environment: str = "test"
    allow_live_rewards: bool = False
    token_ttl_days: int = 30

    def __post_init__(self):
        if self.adpopcorn_environment not in {"test", "live"}:
            raise ValueError("ADPOPCORN_ENVIRONMENT must be test or live")
        if type(self.allow_live_rewards) is not bool:
            raise ValueError("ALLOW_LIVE_REWARDS must be a boolean")
        if type(self.token_ttl_days) is not int or not 0 <= self.token_ttl_days <= 365:
            raise ValueError("SESSION_TOKEN_TTL_DAYS must be between 0 and 365")
        if self.adpopcorn_hash_key is not None and not self.adpopcorn_hash_key.strip():
            object.__setattr__(self, "adpopcorn_hash_key", None)

    @classmethod
    def from_environment(cls):
        ttl = os.getenv("SESSION_TOKEN_TTL_DAYS", "30")
        try:
            token_ttl_days = int(ttl)
        except ValueError:
            raise ValueError("SESSION_TOKEN_TTL_DAYS must be an integer") from None
        return cls(
            database_url=os.getenv("DATABASE_URL") or None,
            adpopcorn_hash_key=os.getenv("ADPOPCORN_HASH_KEY") or None,
            adpopcorn_environment=os.getenv("ADPOPCORN_ENVIRONMENT", "test"),
            allow_live_rewards=os.getenv("ALLOW_LIVE_REWARDS", "false").lower()
            == "true",
            token_ttl_days=token_ttl_days,
        )
