const TIME_SLOTS = {
  morning: { start: 6, end: 11, label: "아침", greeting: "좋은 아침, 오늘도 한 뼘 자라요.", subtitle: "날씨를 확인하고 모아에게 아침 인사를 건네 주세요.", reward: 10 }, // ⏰
  lunch: { start: 11, end: 16, label: "점심", greeting: "잠깐 쉬어 가요. 작은 발견 하나!", subtitle: "가벼운 퀴즈 한 문제로 모아와 함께 배워요.", reward: 15 }, // ⏰
  evening: { start: 16, end: 6, label: "저녁", greeting: "수고한 오늘, 모아와 마무리해요.", subtitle: "오늘을 한 줄로 남기고 내일의 성장을 준비해요.", reward: 20 }, // ⏰
};
const API = {
  weather: "https://api.open-meteo.com/v1/forecast", // 🔌
};

(() => {
  "use strict";

  const STORAGE_KEY = "daily3_pet";
  const SCHEMA = "daily3-pet";
  const VERSION = 1;
  const SLOT_NAMES = Object.keys(TIME_SLOTS);
  const DAY_MS = 86400000;
  const KEEP_DAYS = 32;
  const KEEP_LEDGER = 80;
  const FEED_COST = 5;
  const LEVEL_XP = 30;
  const CITIES = {
    seoul: { name: "서울", latitude: 37.5665, longitude: 126.978 },
    busan: { name: "부산", latitude: 35.1796, longitude: 129.0756 },
    jeju: { name: "제주", latitude: 33.4996, longitude: 126.5312 },
  };
  const QUIZZES = [
    { question: "물 1리터는 몇 밀리리터일까요?", answers: ["10mL", "100mL", "1,000mL", "10,000mL"], correct: 2, explanation: "1리터(L)는 1,000밀리리터(mL)예요." },
    { question: "다 쓴 물건을 버리기 전에 자원을 아끼는 방법은?", answers: ["새것부터 주문하기", "수리하거나 다시 쓸 수 있는지 살피기", "포장지를 더 씌우기", "상태를 보지 않고 버리기"], correct: 1, explanation: "수리와 재사용은 물건을 더 오래 쓰는 방법이에요." },
    { question: "1킬로미터는 몇 미터일까요?", answers: ["10m", "100m", "1,000m", "10,000m"], correct: 2, explanation: "1킬로미터(km)는 1,000미터(m)예요." },
    { question: "비밀번호를 안전하게 관리하는 습관은?", answers: ["모든 사이트에 같은 비밀번호 쓰기", "친구에게 비밀번호 보내기", "생일만으로 만들기", "사이트마다 서로 다른 비밀번호 쓰기"], correct: 3, explanation: "사이트별로 다른 비밀번호를 쓰면 한 곳의 유출이 다른 계정으로 번지는 위험을 줄일 수 있어요." },
    { question: "물의 화학식은 무엇일까요?", answers: ["CO₂", "H₂O", "O₂", "N₂"], correct: 1, explanation: "물 분자는 수소 원자 두 개와 산소 원자 한 개로 이루어져 있어요." },
    { question: "사람이 없는 방에서 전기 사용을 줄이는 행동은?", answers: ["조명 켜 두기", "조명 더 추가하기", "필요 없는 조명 끄기", "창문 닫고 조명 켜기"], correct: 2, explanation: "사용하지 않는 조명을 끄면 그 조명에 쓰이는 전기를 아낄 수 있어요." },
    { question: "지구 대기에 가장 많이 들어 있는 기체는?", answers: ["산소", "이산화탄소", "수소", "질소"], correct: 3, explanation: "지구 대기의 약 78%는 질소예요." },
    { question: "시속 4km로 30분을 걸으면 이동 거리는?", answers: ["1km", "2km", "4km", "8km"], correct: 1, explanation: "30분은 0.5시간이므로 4 × 0.5 = 2km예요." },
    { question: "실수로 누르기 전, 문자 속 낯선 링크는 어떻게 할까요?", answers: ["먼저 로그인하기", "비밀번호 입력하기", "발신자와 주소를 확인하기", "모든 친구에게 전달하기"], correct: 2, explanation: "발신자와 주소를 먼저 확인하고, 의심스러우면 공식 앱이나 공식 사이트에서 확인해요." },
    { question: "15분은 몇 초일까요?", answers: ["150초", "600초", "750초", "900초"], correct: 3, explanation: "1분은 60초이므로 15 × 60 = 900초예요." },
    { question: "장을 보기 전에 낭비를 줄일 수 있는 준비는?", answers: ["집에 있는 식재료와 필요한 양 확인하기", "가장 큰 포장만 고르기", "유통기한 확인하지 않기", "필요한 것 없이 무작정 사기"], correct: 0, explanation: "이미 있는 재료와 필요한 양을 확인하면 중복 구매와 음식 낭비를 줄일 수 있어요." },
    { question: "종이 10장에 한 면씩 인쇄할 내용을 양면 인쇄하면 최소 몇 장이 필요할까요?", answers: ["2장", "5장", "10장", "20장"], correct: 1, explanation: "한 장에 두 면씩 담으면 10 ÷ 2 = 5장이 필요해요." },
  ];
  const clockFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const $ = (selector) => document.querySelector(selector);
  const setText = (selector, text) => { const element = $(selector); if (element) element.textContent = text; };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const numberFormat = new Intl.NumberFormat("ko-KR");
  let storageNotice = "";
  let storageAvailable = true;
  let state;
  let activeDate = "";
  let activeSlot = "";
  let renderDate = "";
  let quizSignature = "";
  let quizFeedback = "";
  let wrongAnswer = -1;
  let toastTimer;
  let selectedCity = "seoul";
  let weatherSequence = 0;
  let weatherController;
  let weather = { status: "idle", url: "", error: "", data: null, city: "seoul" };
  const weatherCache = new Map();

  function getClock(date = new Date()) {
    const fields = Object.fromEntries(clockFormatter.formatToParts(date).map((part) => [part.type, part.value]));
    return { date: `${fields.year}-${fields.month}-${fields.day}`, hour: Number(fields.hour), minute: Number(fields.minute) };
  }

  function ordinal(date) {
    const [year, month, day] = date.split("-").map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
  }

  function actualSlot(hour) {
    return SLOT_NAMES.find((name) => {
      const slot = TIME_SLOTS[name];
      return slot.start < slot.end ? hour >= slot.start && hour < slot.end : hour >= slot.start || hour < slot.end;
    });
  }

  function energyTick(clock) {
    const index = SLOT_NAMES.indexOf(actualSlot(clock.hour));
    // 자정부터 아침 시작 전까지는 전날 저녁의 같은 에너지 구간이다.
    const day = ordinal(clock.date) - (clock.hour < TIME_SLOTS.morning.start ? 1 : 0);
    return day * SLOT_NAMES.length + index;
  }

  function previewSlot() {
    const value = new URL(window.location.href).searchParams.get("t");
    return SLOT_NAMES.includes(value) ? value : null;
  }

  function newDay(date) {
    return { date, completed: { morning: false, lunch: false, evening: false }, reflection: "", feedUsed: false };
  }

  function newState(clock) {
    return {
      schema: SCHEMA, version: VERSION, lastVisit: clock.date, visitCount: 1, streak: 1,
      totalPoints: 0, totalXP: 0, energy: 80, lastEnergyTick: energyTick(clock),
      days: [newDay(clock.date)], ledger: [],
    };
  }

  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const timestamp = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(timestamp.getTime()) && timestamp.toISOString().slice(0, 10) === value;
  }

  function integer(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    return Number.isSafeInteger(value) && value >= min && value <= max;
  }

  function validateState(value) {
    if (!value || typeof value !== "object" || value.schema !== SCHEMA || value.version !== VERSION) return false;
    if (!validDate(value.lastVisit) || !integer(value.visitCount, 1) || !integer(value.streak, 1, value.visitCount)) return false;
    if (!integer(value.totalPoints) || !integer(value.totalXP) || !integer(value.energy, 0, 100) || !integer(value.lastEnergyTick)) return false;
    if (!Array.isArray(value.days) || value.days.length < 1 || value.days.length > KEEP_DAYS) return false;
    const daySet = new Set();
    for (const day of value.days) {
      if (!day || !validDate(day.date) || daySet.has(day.date) || typeof day.feedUsed !== "boolean") return false;
      daySet.add(day.date);
      if (!day.completed || !SLOT_NAMES.every((slot) => typeof day.completed[slot] === "boolean")) return false;
      if (typeof day.reflection !== "string" || day.reflection.length > 140) return false;
      if (day.completed.evening && !day.reflection.trim()) return false;
    }
    if (!daySet.has(value.lastVisit) || !Array.isArray(value.ledger) || value.ledger.length > KEEP_LEDGER) return false;
    const entrySet = new Set();
    for (const entry of value.ledger) {
      if (!entry || typeof entry.id !== "string" || entry.id.length > 60 || entrySet.has(entry.id)) return false;
      if (!validDate(entry.date) || typeof entry.label !== "string" || entry.label.length > 80 || !integer(entry.amount, -FEED_COST, 20)) return false;
      if (entry.kind !== "mission" && entry.kind !== "feed") return false;
      entrySet.add(entry.id);
    }
    return true;
  }

  function readStorage() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      const candidate = JSON.parse(raw);
      if (!validateState(candidate)) {
        storageNotice = "저장된 기록의 형식을 확인할 수 없어 새 기록으로 시작했어요. 이 앱의 씨앗에는 현금 가치가 없어요.";
        return null;
      }
      return candidate;
    } catch (error) {
      if (error instanceof SyntaxError) {
        storageNotice = "저장된 기록의 형식을 확인할 수 없어 새 기록으로 시작했어요. 이 앱의 씨앗에는 현금 가치가 없어요.";
        return null;
      }
      storageAvailable = false;
      storageNotice = "브라우저에 기록을 저장할 수 없어요. 지금 화면에서는 계속 사용할 수 있지만, 새로고침하면 기록이 사라질 수 있어요.";
      return null;
    }
  }

  function saveState() {
    if (!storageAvailable) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      storageAvailable = false;
      storageNotice = "기록을 기기에 저장하지 못했어요. 지금 화면의 기록은 유지되지만, 새로고침하면 사라질 수 있어요.";
    }
  }

  function today() {
    return state.days.find((day) => day.date === activeDate);
  }

  function syncClock(reloadStorage = false) {
    const clock = getClock();
    if (reloadStorage && storageAvailable) {
      const saved = readStorage();
      if (saved) state = saved;
    }
    let changed = false;
    const delta = ordinal(clock.date) - ordinal(state.lastVisit);
    if (delta > 0) {
      state.streak = delta === 1 ? state.streak + 1 : 1;
      state.visitCount += 1;
      state.lastVisit = clock.date;
      changed = true;
    }
    if (!state.days.some((day) => day.date === clock.date)) {
      state.days.push(newDay(clock.date));
      state.days.sort((a, b) => a.date.localeCompare(b.date));
      state.days = state.days.slice(-KEEP_DAYS);
      changed = true;
    }
    const tick = energyTick(clock);
    if (tick > state.lastEnergyTick) {
      state.energy = clamp(state.energy - (tick - state.lastEnergyTick) * 8, 0, 100);
      state.lastEnergyTick = tick;
      changed = true;
    }
    activeDate = clock.date;
    const nextSlot = previewSlot() || actualSlot(clock.hour);
    const slotChanged = activeSlot !== nextSlot;
    activeSlot = nextSlot;
    if (changed) saveState();
    if (renderDate !== activeDate) {
      quizFeedback = "";
      wrongAnswer = -1;
      quizSignature = "";
    }
    return slotChanged;
  }

  function flash(message) {
    const toast = $("#toast");
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      toast.hidden = true;
    }, 4200);
  }

  function progress(selector, value, max) {
    const element = $(selector);
    if (!element) return;
    element.style.width = `${clamp(value / max * 100, 0, 100)}%`;
    const meter = element.closest(".meter") || element;
    meter.setAttribute("role", "progressbar");
    meter.setAttribute("aria-valuemin", "0");
    meter.setAttribute("aria-valuemax", String(max));
    meter.setAttribute("aria-valuenow", String(value));
  }

  function renderTime(forceOpen = false) {
    const slot = TIME_SLOTS[activeSlot];
    document.body.dataset.time = activeSlot;
    document.body.dataset.preview = previewSlot() ? "true" : "false";
    setText("#greeting", slot.greeting);
    setText("#slot-subtitle", slot.subtitle);
    const current = getClock();
    document.querySelectorAll("[data-preview]").forEach((button) => {
      if (button === document.body) return;
      const selected = previewSlot() ? button.dataset.preview === activeSlot : button.dataset.preview === "now";
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-active", selected);
    });
    setText("#preview-label", previewSlot() ? `미리보기 · ${slot.label}` : `지금 · ${slot.label}`);
    setText("#today-date", `${activeDate.replaceAll("-", ".")} · 한국 시간`);
    setText("#current-time", `${String(current.hour).padStart(2, "0")}:${String(current.minute).padStart(2, "0")} KST`);
    if (forceOpen) {
      document.querySelectorAll("details.mission-card[data-slot]").forEach((card) => { card.open = card.dataset.slot === activeSlot; });
    }
  }

  function renderPet() {
    const day = today();
    const doneCount = SLOT_NAMES.filter((slot) => day.completed[slot]).length;
    const level = 1 + Math.floor(state.totalXP / LEVEL_XP);
    const xp = state.totalXP % LEVEL_XP;
    setText("#points-total", numberFormat.format(state.totalPoints));
    setText("#pet-level", String(level));
    setText("#xp-value", `${xp} / ${LEVEL_XP} XP`);
    setText("#energy-value", `${state.energy}%`);
    progress("#xp-bar", xp, LEVEL_XP);
    progress("#energy-bar", state.energy, 100);
    setText("#daily-progress", `${doneCount} / 3 완료`);
    setText("#visit-count", String(state.visitCount));
    setText("#streak-count", String(state.streak));
    const stage = $("#pet-stage");
    if (stage) {
      stage.dataset.mood = state.energy >= 65 ? "happy" : state.energy >= 30 ? "okay" : "sleepy";
      stage.dataset.level = String(level);
      stage.setAttribute("aria-label", `모아, 레벨 ${level}, 에너지 ${state.energy}퍼센트`);
    }
    const messages = state.energy < 30 ? "조금 졸려요… 씨앗 간식으로 힘을 채워 줄래요?" : doneCount === 3 ? "오늘 세 번의 마음, 다 받았어요. 고마워요!" : state.energy >= 65 ? "오늘도 같이 자라요. 네가 와서 기분 좋아!" : "반가워요! 작은 미션 하나 같이 해 볼까요?";
    setText("#pet-message", messages);
    const feed = $("#feed-action");
    if (feed) {
      feed.disabled = day.feedUsed || state.totalPoints < FEED_COST;
      feed.setAttribute("aria-describedby", "feed-count");
      feed.textContent = day.feedUsed ? "오늘 간식 완료" : "간식 주기 · 5씨앗";
    }
    setText("#feed-count", day.feedUsed ? "오늘 간식을 먹었어요 · 내일 다시 줄 수 있어요" : state.totalPoints < FEED_COST ? "씨앗 5개를 모으면 간식을 줄 수 있어요 · 하루 1번, 에너지 +15" : "하루 1번 · 에너지 +15 · 씨앗 5개 사용");
    document.querySelectorAll(".mission-card[data-slot]").forEach((card) => {
      const slot = card.dataset.slot;
      const complete = day.completed[slot];
      card.dataset.complete = String(complete);
      card.classList.toggle("is-complete", complete);
      const status = card.querySelector("[data-mission-status]");
      if (status) status.textContent = complete ? "완료" : `+${TIME_SLOTS[slot].reward}씨앗`;
    });
    const morning = $("#morning-action");
    if (morning) {
      morning.disabled = day.completed.morning;
      morning.textContent = day.completed.morning ? "아침 인사 완료 · 10씨앗 받음" : "모아에게 아침 인사 · +10씨앗";
    }
    setText("#evening-summary", doneCount === 3 ? "오늘의 미션을 모두 마쳤어요. 기록은 내일도 여기에서 볼 수 있어요." : `오늘 미션 ${doneCount}개 완료 · 한 줄을 남기면 저녁 미션이 완료돼요.`);
    const reflection = $("#reflection");
    if (reflection) {
      if (renderDate !== activeDate || day.completed.evening) reflection.value = day.reflection;
      reflection.disabled = day.completed.evening;
      reflection.setAttribute("aria-invalid", "false");
    }
    const evening = $("#evening-action");
    if (evening) {
      evening.disabled = day.completed.evening;
      evening.textContent = day.completed.evening ? "오늘 한 줄 저장 완료 · 20씨앗 받음" : "오늘 한 줄 남기기 · +20씨앗";
    }
  }

  function quizForToday() {
    return QUIZZES[ordinal(activeDate) % QUIZZES.length];
  }

  function renderQuiz() {
    const completed = today().completed.lunch;
    const question = quizForToday();
    setText("#quiz-state", completed ? "오늘의 퀴즈 완료" : "하루 한 문제 · 맞힐 때까지 다시 풀 수 있어요");
    setText("#quiz-question", question.question);
    setText("#quiz-feedback", completed ? `정답! ${question.explanation} 오늘 15씨앗을 받았어요.` : quizFeedback);
    const feedback = $("#quiz-feedback");
    if (feedback) feedback.dataset.correct = String(completed);
    const answers = $("#quiz-answers");
    const signature = `${activeDate}:${completed}:${wrongAnswer}`;
    if (answers && signature !== quizSignature) {
      const fragment = document.createDocumentFragment();
      question.answers.forEach((answer, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "quiz-answer";
        button.dataset.answer = String(index);
        button.disabled = completed;
        button.textContent = `${String.fromCharCode(65 + index)}. ${answer}`;
        if (completed && index === question.correct) button.classList.add("is-correct");
        if (!completed && index === wrongAnswer) button.classList.add("is-incorrect");
        fragment.append(button);
      });
      answers.replaceChildren(fragment);
      quizSignature = signature;
    }
    const retry = $("#quiz-retry");
    if (retry) retry.hidden = completed || wrongAnswer < 0;
  }

  function renderHistory() {
    const history = $("#history-list");
    if (history) {
      const entries = state.ledger.slice(-6).reverse();
      const fragment = document.createDocumentFragment();
      if (!entries.length) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "첫 번째 미션을 마치면 씨앗 기록이 생겨요.";
        fragment.append(empty);
      }
      for (const entry of entries) {
        const row = document.createElement("li");
        const label = document.createElement("span");
        const amount = document.createElement("strong");
        label.textContent = `${entry.date.slice(5).replace("-", ".")} · ${entry.label}`;
        amount.textContent = `${entry.amount > 0 ? "+" : ""}${entry.amount}씨앗`;
        amount.className = entry.amount > 0 ? "positive" : "spent";
        row.append(label, amount);
        fragment.append(row);
      }
      history.replaceChildren(fragment);
    }
    const reflections = $("#reflection-list");
    if (reflections) {
      const entries = state.days.filter((day) => day.completed.evening).slice(-3).reverse();
      const fragment = document.createDocumentFragment();
      if (!entries.length) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "오늘의 한 줄이 이곳에 차곡차곡 쌓여요.";
        fragment.append(empty);
      }
      for (const entry of entries) {
        const row = document.createElement("li");
        const date = document.createElement("time");
        const content = document.createElement("p");
        date.dateTime = entry.date;
        date.textContent = entry.date.replaceAll("-", ".");
        content.textContent = entry.reflection;
        row.append(date, content);
        fragment.append(row);
      }
      reflections.replaceChildren(fragment);
    }
    const notice = $("#storage-notice");
    if (notice) {
      notice.hidden = !storageNotice;
      notice.classList.toggle("is-error", Boolean(storageNotice));
      notice.textContent = storageNotice;
    }
  }

  function render(forceOpen = false) {
    renderTime(forceOpen);
    renderPet();
    renderQuiz();
    renderHistory();
    renderDate = activeDate;
  }

  function completeMission(slot, reflection = "") {
    const slotChanged = syncClock(true);
    const day = today();
    if (day.completed[slot]) {
      render(slotChanged);
      flash("오늘 이 미션의 씨앗은 이미 받았어요. 내일 다시 만나요!");
      return;
    }
    day.completed[slot] = true;
    if (slot === "evening") day.reflection = reflection;
    const reward = TIME_SLOTS[slot].reward;
    state.totalPoints += reward;
    state.totalXP += reward;
    state.energy = clamp(state.energy + 10, 0, 100);
    state.ledger.push({ id: `${activeDate}:${slot}`, date: activeDate, label: `${TIME_SLOTS[slot].label} 미션`, amount: reward, kind: "mission" });
    state.ledger = state.ledger.slice(-KEEP_LEDGER);
    saveState();
    render(slotChanged);
    flash(`${TIME_SLOTS[slot].label} 미션 완료! 씨앗 ${reward}개와 XP ${reward}를 받았어요.`);
  }

  function feedPet() {
    const changed = syncClock(true);
    const day = today();
    if (day.feedUsed || state.totalPoints < FEED_COST) {
      render(changed);
      flash(day.feedUsed ? "오늘 간식은 이미 먹었어요. 내일 다시 주세요!" : "씨앗 5개를 모으면 간식을 줄 수 있어요.");
      return;
    }
    state.totalPoints -= FEED_COST;
    state.energy = clamp(state.energy + 15, 0, 100);
    day.feedUsed = true;
    state.ledger.push({ id: `${activeDate}:feed`, date: activeDate, label: "모아의 간식", amount: -FEED_COST, kind: "feed" });
    state.ledger = state.ledger.slice(-KEEP_LEDGER);
    saveState();
    render(changed);
    flash("냠냠, 고마워요! 씨앗 5개 사용 · 에너지 +15");
  }

  function describeWeather(code, isDay) {
    if (code === 0) return isDay ? "맑음" : "맑은 밤";
    const labels = { 1: "대체로 맑음", 2: "구름 조금", 3: "흐림", 45: "안개", 48: "안개", 51: "약한 이슬비", 53: "이슬비", 55: "강한 이슬비", 56: "어는 이슬비", 57: "어는 이슬비", 61: "약한 비", 63: "비", 65: "강한 비", 66: "어는 비", 67: "어는 비", 71: "약한 눈", 73: "눈", 75: "강한 눈", 77: "싸락눈", 80: "약한 소나기", 81: "소나기", 82: "강한 소나기", 85: "눈 소나기", 86: "강한 눈 소나기", 95: "뇌우", 96: "우박을 동반한 뇌우", 99: "우박을 동반한 뇌우" };
    return labels[code] || `날씨 코드 ${code}`;
  }

  function weatherUrl(city) {
    const url = new URL(API.weather);
    url.search = new URLSearchParams({ latitude: String(city.latitude), longitude: String(city.longitude), current: "temperature_2m,weather_code,is_day", timezone: "Asia/Seoul" }).toString();
    return url.href;
  }

  function validWeather(data) {
    if (!data || data.timezone !== "Asia/Seoul" || !data.current || !data.current_units) return false;
    const current = data.current;
    return Number.isFinite(current.temperature_2m) && integer(current.weather_code, 0, 99)
      && (current.is_day === 0 || current.is_day === 1)
      && typeof current.time === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(current.time)
      && data.current_units.temperature_2m === "°C";
  }

  function renderApi() {
    const list = $("#api-list");
    if (!list) return;
    const item = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = "Open-Meteo · 현재 날씨";
    item.append(title);
    if (weather.url) {
      const address = document.createElement("code");
      address.textContent = weather.url;
      const link = document.createElement("a");
      link.href = weather.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "원본 JSON 열기 ↗";
      item.append(address, link);
    }
    const attribution = document.createElement("a");
    attribution.href = "https://open-meteo.com/";
    attribution.target = "_blank";
    attribution.rel = "noopener noreferrer";
    attribution.textContent = "Weather data by Open-Meteo.com";
    const date = document.createElement("small");
    date.textContent = weather.status === "success" ? `데이터 기준: ${weather.data.current.time.replace("T", " ")} KST · ${CITIES[weather.city].name}` : weather.status === "loading" ? "데이터 요청 중 · 키가 필요 없는 공개 API" : "날씨 요청 실패 · 다시 불러오기로 재시도할 수 있어요";
    item.append(attribution, date);
    list.replaceChildren(item);
  }

  function renderWeather() {
    const retry = $("#weather-retry");
    if (retry) {
      retry.disabled = weather.status === "loading";
      retry.hidden = false;
      retry.textContent = weather.status === "loading" ? "불러오는 중…" : "날씨 다시 불러오기";
    }
    const block = $("#weather-state");
    if (block) block.dataset.state = weather.status;
    if (weather.status === "loading") {
      setText("#weather-state", `${CITIES[weather.city].name} 날씨를 불러오고 있어요`);
      setText("#weather-temperature", "—");
      setText("#weather-description", "잠시만 기다려 주세요");
      setText("#weather-time", "날씨를 불러오는 동안에도 아침 인사를 할 수 있어요.");
    } else if (weather.status === "success") {
      const current = weather.data.current;
      setText("#weather-state", `${CITIES[weather.city].name}의 하늘`);
      setText("#weather-temperature", `${Math.round(current.temperature_2m)}°`);
      setText("#weather-description", describeWeather(current.weather_code, current.is_day));
      setText("#weather-time", `${current.time.replace("T", " ")} KST 기준 · Open-Meteo`);
    } else {
      setText("#weather-state", "날씨를 불러오지 못했어요");
      setText("#weather-temperature", "—");
      setText("#weather-description", "연결을 확인하고 다시 시도해 주세요");
      setText("#weather-time", `${weather.error} 아침 인사와 다른 미션은 계속할 수 있어요.`);
    }
    renderApi();
  }

  async function loadWeather(force = false) {
    const cityKey = selectedCity;
    const city = CITIES[cityKey];
    const url = weatherUrl(city);
    weatherSequence += 1;
    const sequence = weatherSequence;
    if (weatherController) weatherController.abort();
    const cached = weatherCache.get(cityKey);
    if (!force && cached && Date.now() - cached.fetchedAt < 600000) {
      weather = { status: "success", url, error: "", data: cached.data, city: cityKey };
      renderWeather();
      return;
    }
    weather = { status: "loading", url, error: "", data: null, city: cityKey };
    renderWeather();
    const controller = new AbortController();
    weatherController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { signal: controller.signal }); // 🔌 API 호출
      if (!response.ok) throw new Error(`날씨 서버 응답 ${response.status}.`);
      const data = await response.json();
      if (!validWeather(data)) throw new Error("날씨 데이터 형식을 확인할 수 없어요.");
      if (sequence !== weatherSequence) return;
      weatherCache.set(cityKey, { data, fetchedAt: Date.now() });
      weather = { status: "success", url, error: "", data, city: cityKey };
    } catch (error) {
      if (sequence !== weatherSequence) return;
      weather = { status: "error", url, error: error.name === "AbortError" ? "요청 시간이 초과됐어요." : "네트워크 또는 날씨 서버에 연결하지 못했어요.", data: null, city: cityKey };
    } finally {
      window.clearTimeout(timeout);
      if (sequence === weatherSequence) renderWeather();
    }
  }

  function selectPreview(value) {
    const url = new URL(window.location.href);
    if (value === "now") url.searchParams.delete("t");
    else if (SLOT_NAMES.includes(value)) url.searchParams.set("t", value);
    else return;
    try {
      window.history.pushState({}, "", url);
    } catch (error) {
      window.location.href = url.href;
      return;
    }
    syncClock(true);
    render(true);
  }

  document.addEventListener("click", (event) => {
    const preview = event.target.closest("[data-preview]");
    if (preview && preview !== document.body) {
      event.preventDefault();
      selectPreview(preview.dataset.preview);
      return;
    }
    const answer = event.target.closest("[data-answer]");
    if (answer) {
      const dateBefore = activeDate;
      const changed = syncClock(true);
      if (dateBefore !== activeDate) {
        render(changed);
        flash("새로운 하루가 시작됐어요. 오늘의 퀴즈를 다시 확인해 주세요.");
        return;
      }
      if (today().completed.lunch) { render(changed); return; }
      const value = Number(answer.dataset.answer);
      if (value === quizForToday().correct) completeMission("lunch");
      else {
        wrongAnswer = value;
        quizFeedback = "조금 아쉬워요! 다른 답을 골라 다시 도전해 보세요.";
        render(changed);
      }
      return;
    }
    const action = event.target.closest("[data-action]");
    if (!action || action.disabled) return;
    if (action.dataset.action === "load-weather") loadWeather(true);
    if (action.dataset.action === "load-quiz") { quizFeedback = "다시 천천히 골라 보세요."; wrongAnswer = -1; renderQuiz(); }
    if (action.dataset.action === "morning") completeMission("morning");
    if (action.dataset.action === "feed") feedPet();
    if (action.dataset.action === "evening") {
      const dateBefore = activeDate;
      const reflection = $("#reflection");
      const value = reflection ? reflection.value.trim() : "";
      const changed = syncClock(true);
      if (dateBefore !== activeDate) {
        render(changed);
        flash("날짜가 바뀌었어요. 오늘의 한 줄을 새로 남겨 주세요.");
        return;
      }
      if (!value || value.length > 140) {
        if (reflection) { reflection.setAttribute("aria-invalid", "true"); reflection.focus(); }
        flash("오늘의 한 줄을 1~140자로 남겨 주세요.");
        return;
      }
      completeMission("evening", value);
    }
  });

  const citySelect = $("#city-select");
  if (citySelect) citySelect.addEventListener("change", () => {
    if (!Object.prototype.hasOwnProperty.call(CITIES, citySelect.value)) return;
    selectedCity = citySelect.value;
    loadWeather();
  });
  window.addEventListener("popstate", () => { syncClock(true); render(true); });
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const candidate = JSON.parse(event.newValue);
      if (!validateState(candidate)) return;
      state = candidate;
      const changed = syncClock();
      render(changed);
    } catch (error) {
      // 다른 탭의 손상된 기록을 현재 화면의 정상 기록으로 덮어쓰지 않는다.
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { const changed = syncClock(true); render(changed); }
  });

  const initialClock = getClock();
  state = readStorage() || newState(initialClock);
  syncClock();
  saveState();
  render(true);
  loadWeather();
  window.setInterval(() => {
    if (document.visibilityState === "hidden") return;
    const changed = syncClock(true);
    render(changed);
  }, 30000);
})();
