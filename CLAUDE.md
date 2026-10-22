# 우리 스쿼드 규칙 (D7 오후 · 하루 3번 서비스)

> 스쿼드 레포 **맨 위 `CLAUDE.md`** 에 붙여 넣으세요. 주인은 PO, 고칠 때는 PR.
> 어제 API 화면 규칙 + 오늘 시간대·기록·같이 일하기 규칙이에요. 규칙 한 줄 = 검사 한 줄.

---

## 우리 서비스 (PO가 채우기)
- 이름: 앱테크
- 컨셉: 광고 보기·퀴즈 맞히기·다마고치 키우기로 적립금을 모은다. 길드원마다 컨셉이 다른 미니앱을 만들고, 앱인토스처럼 공통 입구(홈·전체 앱·내 기록)에서 들어간다. 시안: `docs/design/hub-mock.png`
- 한 줄: ___(누가) 가 ___(언제) ___(무엇을) 하려고 하루 3번 연다
- 아침: ___ / 점심: ___ / 저녁: ___
- 담당: App.jsx 뼈대 = ___ · index.css = ___ · 아침 카드 = ___ · 점심 카드 = ___ · 저녁 카드 = ___ · 문구 = ___

## 앱 구조 규칙 🧩 (앱인토스 방식)
- 입구에 보이는 미니앱 목록은 `src/apps/registry.js` 의 `MINI_APPS` 한 곳에서만 정한다(이름·카테고리·소개 문구·그림·컴포넌트). (왜: 홈·전체 앱·내 기록이 같은 목록을 씀) → 검사: 새 앱이 홈과 전체 앱에 둘 다 보임
- 미니앱 하나 = `src/apps/<앱id>/` 폴더 하나(React, `index.jsx` 기본 내보내기) 또는 `public/<앱id>/` 독립 HTML 앱 하나(registry 에 `href`), 주인 한 명. 입구 화면(`src/pages/`, `src/components/`)은 PR로 먼저 말하고 고친다. (왜: 각자 컨셉이 달라도 서로 안 부딪힘) → 검사: PR의 Files changed가 내 앱 폴더 위주
- 포인트는 `src/lib/points.js` 의 `addPoints(앱id, 점수, 이유)` 로만 준다. 잔액은 적립 기록을 더해서 계산하고 직접 고치지 않는다. (왜: 내 기록·홈 포인트가 한 기록을 봄) → 검사: 미니앱에서 포인트 주고 홈·내 기록 숫자가 같이 바뀜
- 화면 이동은 `react-router` 의 HashRouter(`#/apps/<앱id>`). (왜: GitHub Pages·Vercel 둘 다 설정 없이 새로고침해도 열림) → 검사: 미니앱 화면에서 새로고침

## 시간대 규칙 ⏰
- 시간대는 `src/timeSlots.js` 의 `TIME_SLOTS` 한 곳에서만 정한다. 아침 06:00~10:59, 점심 11:00~15:59, 저녁 16:00~05:59. 각 줄에 `// ⏰` 주석. (왜: 시간을 여기저기서 따로 계산하면 화면마다 다르게 나옴) → 검사: Ctrl+F ⏰ 가 한 곳
- 주소에 `?t=morning|lunch|evening` 이 있으면 지금 시각보다 그걸 먼저 쓴다. 시간대를 쓰는 미니앱은 그 화면 위에 "미리보기: 아침/점심/저녁" 스위치를 둔다. (왜: 낮에도 세 화면을 검사하려고) → 검사: 세 주소가 서로 다른 화면
- 시간대에 따라 바뀌는 건 **인사 문장 + 강조 카드 + 할 일**. 다른 시간대 카드는 숨기지 말고 작게 접어 둔다. (왜: 점심에 아침 기록을 다시 보고 싶을 수 있음) → 검사: 어느 시간대든 세 카드에 다 갈 수 있음

## API 화면 규칙 🔌 (어제와 같음)
- 키가 필요 없는 공개 API만 브라우저에서 부른다. 키가 필요한 데이터는 파이썬이 만든 `public/data.js`만 쓰고, 키·`.env`는 레포에 올리지 않는다. (왜: Pages는 누구나 코드를 봄) → 검사: 레포에서 `key=`, `KakaoAK`, `.env` 검색 0건
- API 주소는 `src/api.js` 의 `const API = { ... }` 한 곳, 각 줄 `// 🔌`, fetch 줄에 `// 🔌 API 호출`. (왜: 어디가 API인지 바로 찾으려고) → 검사: Ctrl+F 🔌
- 화면 맨 아래 "🔌 이 화면이 쓰는 API" 상자: 실제 부른 주소 + 원본 JSON 링크 + 출처. (왜: 시연·리뷰 때 한눈에) → 검사: 화면 맨 아래
- 카드마다 로딩 중·불러오기 실패 안내. 카드마다 따로 불러 하나가 실패해도 나머지는 보인다. (왜: 무료 API는 멈추기도 함) → 검사: 🔌 주소 한 글자 지우고 새로고침
- 날짜 있는 데이터는 기준 날짜를 같이 보여 주고 "실시간"이라고 쓰지 않는다. Open-Meteo는 "Weather data by Open-Meteo.com". (왜: 환율은 하루 1회 기준값) → 검사: 출처·기준 날짜, "실시간" 0건

## 기록 규칙 💾
- 기록은 localStorage에 `daily3_` 로 시작하는 이름으로 저장하고, 읽기·쓰기는 모두 `try { } catch { }` 로 감싼다. 저장이 안 되는 곳(시크릿 창)에서도 화면은 깨지지 않는다. (왜: 브라우저마다 저장이 막히기도 함) → 검사: 시크릿 창에서 열어 보기
- 기록에는 이름·전화번호·이메일 같은 개인정보를 받지 않는다. (왜: 오늘은 연습, 개인정보는 책임이 큼) → 검사: 입력칸에 개인정보 없음
- 날짜는 한국 시간 기준 `YYYY-MM-DD`로 저장한다. (왜: 자정 넘어서 "오늘"이 엇갈리지 않게) → 검사: 개발자 도구 Application 탭에서 값 확인

## 같이 일하기 규칙
- 내 Issue의 담당 파일만 고친다. 다른 사람 파일·`src/index.css`·`CLAUDE.md`를 고쳐야 하면 먼저 말하고 멈춘다. (왜: 충돌 방지, 파일 하나에 주인 한 명) → 검사: PR의 Files changed가 내 담당 파일 위주
- 커밋·푸시·머지는 하지 않고 커밋 메시지와 PR 본문(`Closes #번호`)만 제안한다. (왜: 내가 검사한 뒤에) → 검사: 내가 직접 커밋
- UI는 원티드 디자인 시스템 Montage(`@montage-ui/core`)의 컴포넌트를 먼저 쓴다(글자는 `Typography`, 버튼은 `Button`, 선택은 `SegmentedControl`·`Chip`). 직접 만든 색·글자 크기 대신 Montage 토큰(`semantic.foreground...`)을 쓴다. (왜: 화면마다 모양이 달라지지 않게) → 검사: 새 컴포넌트가 `@montage-ui/core` 를 import
- React + Vite. 화면 조각은 `src/components/` 의 컴포넌트 파일 하나에 주인 한 명, 공용 스타일은 `src/index.css`. 확인은 `npm install` 후 `npm run dev`, main에 머지되면 GitHub Actions가 Pages에 배포한다. (왜: 파일 단위로 나눠야 충돌이 적고, 배포는 사람이 안 해도 됨) → 검사: `npm run build` 성공 + PR 머지 후 Actions 초록불

## 백엔드 규칙 🐍 (FastAPI, `backend/`)
- 백엔드는 `backend/` 안에서만 고친다. 진입점은 `backend/app/main.py` 의 `app`, API 주소는 모두 `/api/` 로 시작한다. (왜: Vercel 이 이 파일을 자동으로 찾고, 프론트 주소와 안 겹치게) → 검사: `uvicorn app.main:app --reload` 후 `/docs` 에 보임
- 실행: `cd backend` → `python -m venv .venv` → `.venv/bin/pip install -r requirements-dev.txt` → `.venv/bin/uvicorn app.main:app --reload` (Windows는 `.venv\Scripts\`). 배포에 필요한 패키지는 `requirements.txt`, 개발·테스트용은 `requirements-dev.txt`. (왜: 배포 묶음을 작게) → 검사: 새 import 가 requirements 에 있음
- 키·비밀값은 `backend/.env` 에만, 레포에는 `backend/.env.example` 에 이름만. Vercel 에서는 프로젝트 Settings → Environment Variables. (왜: 레포는 공개) → 검사: 레포에서 `.env` 검색 0건
- 이 API 를 부를 프론트 주소는 `ALLOWED_ORIGINS` 환경 변수로만 연다. `*` 로 다 열지 않는다. (왜: 아무 사이트나 우리 API 를 부르지 못하게) → 검사: `pytest` 의 CORS 테스트 통과
- 엔드포인트를 만들면 `backend/tests/` 에 테스트 1개 이상. (왜: PR 때 Actions 가 자동으로 돌림) → 검사: `.venv/bin/python -m pytest` 통과

## 실수에서 배운 규칙
<!-- - (10/22) (해라/하지 마라) ___ (왜: ___) → 검사: ___ -->
