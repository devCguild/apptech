import { API } from "../api.js";

const SESSION_KEY = "daily3_rewards_session";
const REQUEST_TIMEOUT = 12_000;

class RewardsError extends Error {
  constructor(code, status = 0) {
    super(code);
    this.name = "RewardsError";
    this.code = code;
    this.status = status;
  }
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isEnvironment = (value) => value === "test" || value === "live";

function validateStatus(value) {
  if (!isObject(value) || !isEnvironment(value.environment)
    || typeof value.storage_ready !== "boolean" || typeof value.callback_ready !== "boolean"
    || typeof value.live_enabled !== "boolean"
    || (value.live_enabled && (value.environment !== "live" || !value.storage_ready || !value.callback_ready))) {
    throw new RewardsError("invalid-response");
  }
  return value;
}

function validSession(value, environment, now) {
  return isObject(value) && typeof value.token === "string" && value.token.length <= 4096
    && /^[A-Za-z0-9._~-]+$/.test(value.token)
    && typeof value.user_id === "string" && value.user_id.length > 0
    && value.environment === environment && typeof value.expires_at === "string"
    && Number.isFinite(Date.parse(value.expires_at)) && Date.parse(value.expires_at) > now;
}

function validateWallet(value, environment) {
  if (!isObject(value) || value.environment !== environment || value.unit !== "P"
    || !Number.isSafeInteger(value.balance) || value.balance < 0 || !Array.isArray(value.transactions)) {
    throw new RewardsError("invalid-response");
  }
  const identifiers = new Set();
  for (const entry of value.transactions) {
    if (!isObject(entry) || typeof entry.id !== "string" || !entry.id || identifiers.has(entry.id)
      || !Number.isSafeInteger(entry.amount) || entry.amount <= 0
      || typeof entry.campaign_key !== "string" || !entry.campaign_key
      || typeof entry.created_at !== "string" || !Number.isFinite(Date.parse(entry.created_at))) {
      throw new RewardsError("invalid-response");
    }
    identifiers.add(entry.id);
  }
  return value;
}

// 한 브라우저 안의 동시 요청이 계정을 중복 생성하지 않도록 진행 중인 조회를 공유한다.
export function createRewardsClient({
  fetchImpl = (...args) => globalThis.fetch(...args),
  storage = () => globalThis.localStorage,
  now = () => Date.now(),
} = {}) {
  let memorySession = null;
  let persistent = true;
  let inFlight = null;

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const response = await fetchImpl(url, { ...options, signal: controller.signal, cache: "no-store" }); // 🔌 API 호출
      if (!response.ok) throw new RewardsError("request-failed", response.status);
      try {
        return await response.json();
      } catch {
        throw new RewardsError("invalid-response");
      }
    } catch (error) {
      if (error instanceof RewardsError) throw error;
      throw new RewardsError(controller.signal.aborted ? "timeout" : "unavailable");
    } finally {
      clearTimeout(timer);
    }
  }

  function clearSession() {
    memorySession = null;
    try {
      storage().removeItem(SESSION_KEY);
    } catch {
      persistent = false;
    }
  }

  function readSession(environment) {
    if (validSession(memorySession, environment, now())) return memorySession;
    memorySession = null;
    let raw;
    try {
      raw = storage().getItem(SESSION_KEY);
    } catch {
      persistent = false;
      return null;
    }
    if (raw === null) return null;
    try {
      const saved = JSON.parse(raw);
      if (validSession(saved, environment, now())) {
        memorySession = saved;
        return saved;
      }
    } catch {
      // 손상된 기록은 새 익명 계정으로 바꾼다.
    }
    clearSession();
    return null;
  }

  async function createSession(environment) {
    const session = await request(API.rewardsSession, { method: "POST" });
    if (!validSession(session, environment, now())) throw new RewardsError("invalid-response");
    memorySession = session;
    try {
      storage().setItem(SESSION_KEY, JSON.stringify(session));
      persistent = true;
    } catch {
      persistent = false;
    }
    return session;
  }

  async function load() {
    const status = validateStatus(await request(API.rewardsStatus));
    if (!status.storage_ready || (status.environment === "live" && !status.live_enabled)) {
      return { kind: "preparing", status };
    }
    let session = readSession(status.environment);
    if (session === null) session = await createSession(status.environment);
    let wallet;
    try {
      wallet = await request(API.rewardsWallet, { headers: { Authorization: `Bearer ${session.token}` } });
    } catch (error) {
      if (!(error instanceof RewardsError) || error.status !== 401) throw error;
      // 유효하지 않은 저장 계정은 한 번만 새로 발급한다. 통신 오류로 계정을 바꾸지 않는다.
      clearSession();
      session = await createSession(status.environment);
      wallet = await request(API.rewardsWallet, { headers: { Authorization: `Bearer ${session.token}` } });
    }
    return { kind: "wallet", status, wallet: validateWallet(wallet, session.environment), persistent };
  }

  return {
    load() {
      if (inFlight === null) {
        inFlight = load().finally(() => { inFlight = null; });
      }
      return inFlight;
    },
  };
}

export const rewardsClient = createRewardsClient();
