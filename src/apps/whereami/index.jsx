import { useCallback, useEffect, useState } from "react";
import { Button, SegmentedControl, SegmentedControlItem, Typography } from "@montage-ui/core";
import { IconChevronRight } from "@montage-ui/icon";

import { API } from "../../api.js";
import { addPoints } from "../../lib/points.js";
import { readJson, writeJson } from "../../lib/storage.js";
import art from "./art-card.svg";
import "./whereami.css";

// 담당: CMG — '여기는 어디?' 미니앱. Windy Webcams 사진을 보고 나라를 맞힌다
const APP_ID = "whereami";
const REWARD = 10; // 정답 1번에 주는 포인트
const STATS_KEY = "daily3_whereami_stats"; // { solved, correct, streak }

const emptyStats = { solved: 0, correct: 0, streak: 0 };

// 백엔드는 영어 나라 이름을 주므로 나라 코드로 한국어 이름을 만든다
const countryName = (o) => {
  try {
    return new Intl.DisplayNames(["ko"], { type: "region" }).of(o.code) ?? o.name;
  } catch {
    return o.name;
  }
};

export default function App() {
  const [question, setQuestion] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [result, setResult] = useState(null); // { guess, correct }
  const [checking, setChecking] = useState(false);
  const [view, setView] = useState("timelapse"); // timelapse | photo
  const [stats, setStats] = useState(() => ({ ...emptyStats, ...readJson(STATS_KEY, emptyStats) }));

  const load = useCallback(() => {
    setStatus("loading");
    setResult(null);
    fetch(API.webcamQuestion) // 🔌 API 호출
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        setQuestion(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(load, [load]);

  const guess = (code) => {
    if (result || checking) return;
    setChecking(true);
    fetch(API.webcamAnswer, {
      // 🔌 API 호출
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: question.token, guess: code }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(({ correct }) => {
        setResult({ guess: code, correct });
        if (correct) addPoints(APP_ID, REWARD, "여기는 어디? 정답");
        const next = {
          solved: stats.solved + 1,
          correct: stats.correct + (correct ? 1 : 0),
          streak: correct ? stats.streak + 1 : 0,
        };
        setStats(next);
        writeJson(STATS_KEY, next);
      })
      .catch(() => setStatus("error"))
      .finally(() => setChecking(false));
  };

  return (
    <main className="whereami">
      <section className="whereami-hero tone-sky">
        <div className="whereami-hero-text">
          <Typography as="h2" variant="title3" weight="bold" color="semantic.foreground.neutral.strong">
            여기는 어디?
          </Typography>
          <Typography variant="body2" color="semantic.foreground.neutral.secondary" className="keep-lines">
            {"세계 곳곳 웹캠 사진 보고\n나라를 맞혀요"}
          </Typography>
        </div>
        <img className="whereami-hero-art" src={art} alt="" />
      </section>

      <div className="whereami-stats">
        <Stat label="푼 문제" value={stats.solved} />
        <Stat label="맞힌 문제" value={stats.correct} />
        <Stat label="연속 정답" value={stats.streak} />
      </div>

      <section className="whereami-card">
        {status === "loading" && (
          <div className="whereami-photo is-empty">
            <Typography variant="body2" color="semantic.foreground.neutral.tertiary">
              웹캠을 찾는 중…
            </Typography>
          </div>
        )}

        {status === "error" && (
          <div className="whereami-photo is-empty">
            <Typography variant="body2" color="semantic.foreground.neutral.secondary">
              사진을 불러오지 못했어요
            </Typography>
            <Button variant="outlined" size="medium" onClick={load}>
              다시 불러오기
            </Button>
          </div>
        )}

        {status === "ready" && question && (
          <>
            {question.timelapse && (
              <SegmentedControl size="small" value={view} onValueChange={setView}>
                <SegmentedControlItem value="timelapse">24시간 타임랩스</SegmentedControlItem>
                <SegmentedControlItem value="photo">지금 사진</SegmentedControlItem>
              </SegmentedControl>
            )}
            {question.timelapse && view === "timelapse" ? (
              <iframe
                key={question.timelapse}
                className="whereami-photo"
                src={question.timelapse}
                title="웹캠 24시간 타임랩스"
                allow="autoplay; fullscreen"
              />
            ) : (
              <img className="whereami-photo" src={question.image} alt="어느 나라인지 맞혀 보세요" />
            )}
            <Typography as="h3" variant="headline1" weight="bold" color="semantic.foreground.neutral.strong">
              이 웹캠은 어느 나라일까요?
            </Typography>
            <div className="whereami-options">
              {question.options.map((o) => (
                <button
                  key={o.code}
                  type="button"
                  className={optionClass(o.code, result)}
                  disabled={!!result || checking}
                  onClick={() => guess(o.code)}
                >
                  <Typography variant="headline2" weight="bold">
                    {countryName(o)}
                  </Typography>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {result && (
        <section className={`whereami-result ${result.correct ? "is-correct" : "is-wrong"}`}>
          <Typography variant="headline1" weight="bold" color="semantic.foreground.neutral.strong">
            {result.correct ? `정답이에요! +${REWARD} P` : "아쉬워요!"}
          </Typography>
          <Typography variant="body2" color="semantic.foreground.neutral.secondary">
            {question.title}
          </Typography>
          <Button
            variant="solid"
            size="medium"
            className="whereami-next"
            trailingContent={<IconChevronRight />}
            onClick={load}
          >
            다음 문제
          </Button>
        </section>
      )}

      {question && (
        <Typography variant="caption1" color="semantic.foreground.neutral.tertiary" className="whereami-source">
          🔌 사진 출처: {question.source} · 불러온 시점의 웹캠 스냅샷이에요
        </Typography>
      )}
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="whereami-stat">
      <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
        {label}
      </Typography>
      <Typography variant="headline1" weight="bold" color="semantic.foreground.neutral.strong">
        {value}
      </Typography>
    </div>
  );
}

// 정답 확인 전에는 고른 것만, 오답이면 고른 보기를 빨갛게 표시
function optionClass(code, result) {
  if (!result || result.guess !== code) return "whereami-option";
  return `whereami-option ${result.correct ? "is-correct" : "is-wrong"}`;
}
