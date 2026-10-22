import { useEffect, useState } from "react";
import { Button, Typography } from "@montage-ui/core";

import { rewardsClient } from "../../lib/rewards.js";
import { canOpenNativeOfferwall, nativeRewards } from "../../lib/nativeRewards.js";
import "./rewards.css";

const numberFormat = new Intl.NumberFormat("ko-KR");
const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
});

function Wallet({ wallet, persistent, isAndroid }) {
  const isTest = wallet.environment === "test";
  return (
    <>
      <section className="ad-rewards-wallet" aria-labelledby="ad-rewards-wallet-title">
        <div className="ad-rewards-heading">
          <Typography as="h3" id="ad-rewards-wallet-title" variant="label1" weight="bold"
            color="semantic.foreground.neutral.secondary">
            {isTest ? "테스트 적립" : "광고 적립 포인트"}
          </Typography>
          {isTest && <span className="ad-rewards-badge"><Typography variant="caption1">테스트</Typography></span>}
        </div>
        <Typography as="p" variant="title1" weight="bold" className="ad-rewards-balance" data-testid="rewards-balance">
          {numberFormat.format(wallet.balance)}<Typography as="span" variant="title3" weight="bold"> P</Typography>
        </Typography>
        <Typography as="p" variant="caption1" color="semantic.foreground.neutral.secondary">
          {isTest ? "테스트 포인트는 교환할 수 없어요" : "광고 참여로 적립한 포인트예요"}
        </Typography>
      </section>
      <section className="ad-rewards-history" aria-labelledby="ad-rewards-history-title">
        <Typography as="h3" id="ad-rewards-history-title" variant="headline2" weight="bold">최근 광고 적립 내역</Typography>
        {wallet.transactions.length === 0 ? (
          <Typography as="p" variant="body2" color="semantic.foreground.neutral.tertiary" className="ad-rewards-empty-history">
            아직 적립 내역이 없어요
          </Typography>
        ) : (
          <ul className="ad-rewards-transactions">
            {wallet.transactions.map((entry) => (
              <li key={entry.id}>
                <div>
                  <Typography as="p" variant="body2" weight="medium">{isTest ? "테스트 미션 적립" : "광고 미션 적립"}</Typography>
                  <Typography as="time" dateTime={entry.created_at} variant="caption1" color="semantic.foreground.neutral.tertiary">
                    {dateFormat.format(new Date(entry.created_at))} · 한국 시간
                  </Typography>
                </div>
                <Typography as="span" variant="body1" weight="bold" color="semantic.foreground.brand.primary">
                  +{numberFormat.format(entry.amount)} P
                </Typography>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className="ad-rewards-account-note">
        <Typography as="p" variant="caption1" color="semantic.foreground.neutral.tertiary">
          {persistent
            ? isAndroid
              ? "이 앱의 익명 계정으로 조회하고 있어요. 앱 데이터를 지우거나 앱을 삭제하면 이 계정에 다시 접근할 수 없어요."
              : "이 브라우저의 익명 계정으로 조회하고 있어요. 브라우저 데이터를 지우거나 다른 기기에서 열면 이 계정에 다시 접근할 수 없어요."
            : "기기에 계정을 저장할 수 없어 이번 방문 동안만 조회할 수 있어요. 화면을 닫으면 이 계정에 다시 접근할 수 없어요."}
        </Typography>
      </aside>
    </>
  );
}

export default function AdRewardWallet() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ phase: "loading" });
  const [nativeStatus, setNativeStatus] = useState(() => nativeRewards.getStatus());
  const [opening, setOpening] = useState(false);
  const [nativeMessage, setNativeMessage] = useState("");

  function refresh() {
    setNativeStatus(nativeRewards.getStatus());
    setOpening(false);
    setNativeMessage("");
    setAttempt((value) => value + 1);
  }

  useEffect(() => nativeRewards.subscribeOfferwallClosed(() => {
    setOpening(false);
    setNativeMessage("");
    setNativeStatus(nativeRewards.getStatus());
    setAttempt((value) => value + 1);
  }), []);

  useEffect(() => {
    let current = true;
    setState({ phase: "loading" });
    rewardsClient.load().then(
      (result) => { if (current) setState({ phase: "ready", result }); },
      () => { if (current) setState({ phase: "error" }); },
    );
    return () => { current = false; };
  }, [attempt]);

  const hasWallet = state.phase === "ready" && state.result.kind === "wallet";
  const canOpen = hasWallet && canOpenNativeOfferwall({
    nativeStatus, serverStatus: state.result.status, userId: state.result.userId,
  });

  function openOfferwall() {
    if (!canOpen || opening) return;
    const result = nativeRewards.openOfferwall({ userId: state.result.userId, serverStatus: state.result.status });
    if (result.accepted) {
      setOpening(true);
      setNativeMessage("광고 화면에서 돌아오면 적립 내역을 다시 확인해요.");
    } else {
      setNativeStatus(nativeRewards.getStatus());
      setNativeMessage("광고 화면을 열지 못했어요. 다시 시도해 주세요.");
    }
  }

  return (
    <div className="ad-rewards" data-rewards-state={state.phase}>
      <div aria-live="polite" aria-busy={state.phase === "loading"} className="ad-rewards-content">
        {state.phase === "loading" && (
          <section className="ad-rewards-feedback" role="status">
            <span className="ad-rewards-spinner" aria-hidden="true" />
            <Typography as="p" variant="body2" color="semantic.foreground.neutral.secondary">광고 적립 정보를 확인하고 있어요</Typography>
          </section>
        )}
        {state.phase === "error" && (
          <section className="ad-rewards-feedback">
            <Typography as="h3" variant="headline1" weight="bold">적립 정보를 불러오지 못했어요</Typography>
            <Typography as="p" variant="body2" color="semantic.foreground.neutral.secondary">연결 상태를 확인한 후 다시 시도해 주세요.</Typography>
            <Button variant="outlined" size="medium" onClick={refresh}>다시 불러오기</Button>
          </section>
        )}
        {state.phase === "ready" && (
          <>
            {hasWallet && <Wallet wallet={state.result.wallet} persistent={state.result.persistent} isAndroid={nativeStatus.platform === "android"} />}
            <section className="ad-rewards-preparation" aria-labelledby="ad-rewards-preparation-title">
              <span className="ad-rewards-preparing-badge"><Typography variant="caption1" weight="bold">{canOpen ? "광고 미션" : nativeStatus.platform === "web" ? "Android 앱 전용" : "준비 중"}</Typography></span>
              <Typography as="h3" id="ad-rewards-preparation-title" variant="headline1" weight="bold">
                {canOpen ? "새로운 미션을 만나보세요" : nativeStatus.platform === "web" ? "광고 참여는 Android 앱에서 가능해요" : "광고 미션을 준비하고 있어요"}
              </Typography>
              <Typography as="p" variant="body2" color="semantic.foreground.neutral.secondary">
                {canOpen ? "미션마다 참여 조건과 적립 포인트를 확인해 주세요."
                  : nativeStatus.platform === "web" ? "Android 앱 연동을 준비하고 있어요."
                    : "참여 가능한 미션이 열리면 여기서 확인할 수 있어요."}
              </Typography>
              {!hasWallet && <Typography as="p" variant="caption1" color="semantic.foreground.neutral.tertiary">지금은 광고 포인트가 적립되지 않아요</Typography>}
              {nativeStatus.error && <Typography as="p" variant="caption1" color="semantic.foreground.neutral.secondary">광고 화면을 확인하지 못했어요. 새로 확인해 주세요.</Typography>}
              {canOpen && <Button variant="solid" size="medium" disabled={opening} data-testid="rewards-open-offerwall" onClick={openOfferwall}>광고 미션 보기</Button>}
              {nativeMessage && <Typography as="p" variant="caption1" color="semantic.foreground.neutral.secondary" role="status">{nativeMessage}</Typography>}
            </section>
            <Button variant="outlined" size="medium" fullWidth data-testid="rewards-refresh" onClick={refresh}>새로 확인하기</Button>
          </>
        )}
      </div>
    </div>
  );
}
