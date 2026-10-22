import { useEffect, useState } from "react";
import {
  ActionArea,
  ActionAreaButton,
  Button,
  ContentBadge,
  FallbackView,
  FallbackViewActionArea,
  FallbackViewActionAreaButton,
  FallbackViewContent,
  FallbackViewText,
  Loading,
  Modal,
  ModalContainer,
  ModalContent,
  ModalDescription,
  ModalHeading,
  SectionMessage,
  Typography,
} from "@montage-ui/core";

import { TIME_SLOTS, currentTimeSlot } from "../../timeSlots.js";
import { addPoints, pointTotals } from "../../lib/points.js";
import { CATEGORIES, REWARD, canReward, nextSlot, pickQuestion, slotDate, slotProgress } from "./quizLogic.js";
import { loadState, saveState } from "./quizStorage.js";
import "./quiz.css";

// 🔌 문제 은행: 파이썬(scripts/generate_quiz.py)이 LLM으로 만든 public/quiz-bank.js (키는 브라우저에 없음)
const QUIZ_BANK_URL = `${import.meta.env.BASE_URL}quiz-bank.js`; // 🔌

function loadBank() {
  return new Promise((resolve, reject) => {
    if (window.QUIZ_BANK) return resolve(window.QUIZ_BANK);
    const s = document.createElement("script");
    s.src = QUIZ_BANK_URL; // 🔌 API 호출
    s.onload = () => (window.QUIZ_BANK?.items ? resolve(window.QUIZ_BANK) : reject(new Error("bad bank")));
    s.onerror = () => reject(new Error("load failed"));
    document.head.appendChild(s);
  });
}

const STATE_TEXT = { done: "맞혔어요", missed: "지났어요", now: "도전 중", upcoming: "기다려요" };
// 상태 배지 색: 맞힘=Positive, 지금=Brand, 지남·대기=Neutral (Montage 시멘틱 컬러)
const BADGE = {
  done: { color: "accent", accentColor: "semantic.foreground.positive.primary" },
  now: { color: "accent", accentColor: "semantic.foreground.brand.primary" },
  missed: { color: "neutral", variant: "outlined" },
  upcoming: { color: "neutral" },
};
const CATEGORY_ICON = { economy: "💰", society: "🏛️", history: "📜", science: "🔬", english: "🔤" };

// 단계: category(분야 고르기) → question(문제) → result(결과 팝업). 시간대 퀴즈를 이미 맞혔으면 안내만 보인다
export default function App() {
  // 시간대는 시스템이 알아서 판단한다 (30초마다 다시 확인). 주소의 ?t= 는 검사용으로만 남겨 둠
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const slot = currentTimeSlot();
  const date = slotDate();

  const [bank, setBank] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [state, setState] = useState(loadState);
  const [total, setTotal] = useState(() => pointTotals().total);
  const [step, setStep] = useState("category");
  const [category, setCategory] = useState(null);
  const [question, setQuestion] = useState(null);
  const [result, setResult] = useState(null); // { correct, rewarded }

  useEffect(() => {
    loadBank()
      .then((b) => {
        setBank(b);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  function startCategory(id) {
    setCategory(id);
    setQuestion(pickQuestion(bank.items, id, state.seen));
    setResult(null);
    setStep("question");
  }

  function answer(picked) {
    const correct = picked === question.answer;
    const rewarded = correct && canReward(state.rewarded, date, slot);
    const slots = state.rewarded.date === date ? state.rewarded.slots : [];
    const next = {
      seen: [...state.seen, question.id],
      rewarded: rewarded ? { date, slots: [...slots, slot] } : state.rewarded,
    };
    if (rewarded) {
      addPoints("quiz", REWARD, `오늘의 퀴즈 정답 (${TIME_SLOTS[slot].label})`);
      setTotal(pointTotals().total);
    }
    setState(next);
    saveState(next);
    setResult({ correct, rewarded });
    setStep("result");
  }

  const label = CATEGORIES.find((c) => c.id === category)?.label;
  const progress = slotProgress(state.rewarded, date, slot);
  const done = !canReward(state.rewarded, date, slot);
  const remaining = progress.filter((p) => p.state === "now" || p.state === "upcoming").map((p) => p.label);
  const next = nextSlot(slot);
  const ready = status === "ready";
  // 결과 팝업이 떠 있는 동안에는 뒤 화면을 문제 그대로 둔다
  const showQuestion = ready && question && (step === "question" || (step === "result" && !result?.correct));

  return (
    <div className="quiz">
      <section className="quiz-card quiz-hero">
        <Typography variant="label1" weight="medium" color="semantic.foreground.brand.primary">
          {TIME_SLOTS[slot].label} 퀴즈
        </Typography>
        <Typography as="h2" variant="title3" weight="bold">
          한 문제 맞히고 {REWARD}원 받아요
        </Typography>
        <div className="quiz-points">
          <Typography variant="body2" color="semantic.foreground.neutral.secondary">
            내 적립금
          </Typography>
          <Typography variant="title2" weight="bold">
            {total.toLocaleString()}원
          </Typography>
        </div>
      </section>

      <section className="quiz-card" aria-label="오늘 참여 현황">
        <Typography as="h3" variant="headline1" weight="bold">
          오늘의 참여
        </Typography>
        <div className="quiz-slots">
          {progress.map((p) => (
            <div key={p.slot} className="quiz-slot" data-state={p.state}>
              <Typography variant="headline2" weight="bold">
                {p.label}
              </Typography>
              <ContentBadge size="small" {...BADGE[p.state]}>
                {STATE_TEXT[p.state]}
              </ContentBadge>
            </div>
          ))}
        </div>
        {!done && remaining.length > 0 && (
          <SectionMessage
            variant="info"
            description={`오늘은 ${remaining.join(" · ")}에 도전할 수 있어요. 시간대마다 한 번 맞히면 적립돼요.`}
          />
        )}
      </section>

      {status === "loading" && (
        <section className="quiz-card" style={{ alignItems: "center" }}>
          <Loading size={32} />
        </section>
      )}

      {status === "error" && (
        <section className="quiz-card">
          <FallbackView platform="mobile" padding="compact">
            <FallbackViewContent>
              <FallbackViewText title="문제를 불러오지 못했어요" description="잠시 후 다시 시도해 주세요." />
            </FallbackViewContent>
            <FallbackViewActionArea variant="single">
              <FallbackViewActionAreaButton onClick={() => window.location.reload()}>다시 시도</FallbackViewActionAreaButton>
            </FallbackViewActionArea>
          </FallbackView>
        </section>
      )}

      {ready && !done && step === "category" && (
        <section className="quiz-card">
          <Typography as="h3" variant="heading1" weight="bold">
            어떤 분야에 도전할까요?
          </Typography>
          <div className="quiz-cats" role="group" aria-label="분야 선택">
            {CATEGORIES.map((c) => (
              <Button
                key={c.id}
                size="large"
                fullWidth
                variant="outlined"
                color="assistive"
                onClick={() => startCategory(c.id)}
              >
                {CATEGORY_ICON[c.id]} {c.label}
              </Button>
            ))}
          </div>
        </section>
      )}

      {ready && !done && step === "question" && !question && (
        <section className="quiz-card">
          <FallbackView platform="mobile" padding="compact">
            <FallbackViewContent>
              <FallbackViewText title={`${label} 문제를 다 풀었어요`} description="다른 분야에서 도전해 보세요." />
            </FallbackViewContent>
            <FallbackViewActionArea variant="single">
              <FallbackViewActionAreaButton onClick={() => setStep("category")}>다른 분야 고르기</FallbackViewActionAreaButton>
            </FallbackViewActionArea>
          </FallbackView>
        </section>
      )}

      {showQuestion && (
        <section className="quiz-card">
          <Typography variant="label1" weight="medium" color="semantic.foreground.neutral.tertiary">
            {CATEGORY_ICON[category]} {label}
          </Typography>
          <Typography as="h3" variant="heading1" weight="bold">
            {question.question}
          </Typography>
          <div className="quiz-choices">
            {question.choices.map((c, i) => (
              <Button key={i} size="large" fullWidth variant="outlined" color="assistive" onClick={() => answer(i)}>
                {c}
              </Button>
            ))}
          </div>
        </section>
      )}

      {ready && done && (
        <section className="quiz-card quiz-done" role="status">
          <span className="quiz-emoji" aria-hidden="true">
            🏆
          </span>
          <FallbackView platform="mobile" padding="compact">
            <FallbackViewContent>
              <FallbackViewText
                title={`${TIME_SLOTS[slot].label} 퀴즈는 이미 맞혔어요`}
                description={`${next.tomorrow ? "오늘 퀴즈는 모두 끝났어요. " : ""}다음 퀴즈는 ${next.label} ${next.from}부터 열려요.`}
              />
            </FallbackViewContent>
          </FallbackView>
        </section>
      )}

      <Modal
        open={ready && step === "result" && !!result}
        onOpenChange={(open) => {
          if (!open) setStep(result?.correct ? "category" : "question");
        }}
      >
        <ModalContainer variant="popup" size="medium">
          {result && question && (
            <>
              <ModalContent>
                <div className="quiz-popup-body">
                  <span className="quiz-emoji" aria-hidden="true">
                    {result.correct ? "🎉" : "😢"}
                  </span>
                  <ModalHeading>
                    {result.correct
                      ? result.rewarded
                        ? `정답! ${REWARD}원 적립됐어요`
                        : "정답이에요!"
                      : "아쉽네요"}
                  </ModalHeading>
                  {!result.correct && (
                    <Typography variant="body1" weight="bold">
                      정답: {question.choices[question.answer]}
                    </Typography>
                  )}
                  {question.explanation && <ModalDescription>{question.explanation}</ModalDescription>}
                </div>
              </ModalContent>
              {result.correct ? (
                <ActionArea variant="strong">
                  <ActionAreaButton variant="main" onClick={() => setStep("category")}>
                    확인
                  </ActionAreaButton>
                </ActionArea>
              ) : (
                <ActionArea variant="strong">
                  <ActionAreaButton variant="main" onClick={() => startCategory(category)}>
                    다시 도전
                  </ActionAreaButton>
                  <ActionAreaButton variant="alternative" onClick={() => setStep("category")}>
                    분야 바꾸기
                  </ActionAreaButton>
                </ActionArea>
              )}
            </>
          )}
        </ModalContainer>
      </Modal>
    </div>
  );
}
