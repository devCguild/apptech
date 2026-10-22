const APP_ORIGIN = "https://appassets.androidplatform.net";
const OFFERWALL_CLOSED = "apptech:offerwall-closed";

const webStatus = () => ({ platform: "web", configured: false, error: null });
const unavailableStatus = () => ({ platform: "android", configured: false, error: "unavailable" });

// 브리지 상태는 화면을 여는 기능에만 쓴다. 적립 여부와 금액은 서버에서 확인한다.
export function canOpenNativeOfferwall({ nativeStatus, serverStatus, userId }) {
  return nativeStatus?.platform === "android" && nativeStatus.configured === true
    && nativeStatus.error === null
    && typeof userId === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(userId)
    && serverStatus?.storage_ready === true && serverStatus.callback_ready === true
    && typeof serverStatus.live_enabled === "boolean"
    && ((serverStatus.environment === "test" && serverStatus.live_enabled === false)
      || (serverStatus.environment === "live" && serverStatus.live_enabled === true));
}

export function createNativeRewards({ getWindow = () => globalThis.window } = {}) {
  function getStatus() {
    try {
      const target = getWindow();
      if (!target || target.location?.origin !== APP_ORIGIN) return webStatus();
      const bridge = target.ApptechRewards;
      if (!bridge || typeof bridge.getStatus !== "function" || typeof bridge.openOfferwall !== "function") {
        return unavailableStatus();
      }
      const raw = bridge.getStatus();
      if (typeof raw !== "string") return unavailableStatus();
      const status = JSON.parse(raw);
      if (status === null || typeof status !== "object" || Array.isArray(status)
        || status.platform !== "android" || typeof status.configured !== "boolean") {
        return unavailableStatus();
      }
      return { platform: "android", configured: status.configured, error: null };
    } catch {
      return unavailableStatus();
    }
  }

  return {
    getStatus,
    openOfferwall({ userId, serverStatus }) {
      const nativeStatus = getStatus();
      if (!canOpenNativeOfferwall({ nativeStatus, serverStatus, userId })) {
        return { accepted: false, reason: "not-ready" };
      }
      try {
        const accepted = getWindow().ApptechRewards.openOfferwall(userId);
        return accepted === true
          ? { accepted: true, reason: null }
          : { accepted: false, reason: "open-failed" };
      } catch {
        return { accepted: false, reason: "open-failed" };
      }
    },
    subscribeOfferwallClosed(callback) {
      if (getStatus().platform !== "android") return () => {};
      try {
        const target = getWindow();
        const listener = () => callback();
        target.addEventListener(OFFERWALL_CLOSED, listener);
        return () => target.removeEventListener(OFFERWALL_CLOSED, listener);
      } catch {
        return () => {};
      }
    },
  };
}

export const nativeRewards = createNativeRewards();
