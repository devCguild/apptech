# 여기는 어디? (담당: CMG)

Windy Webcams 웹캠의 24시간 타임랩스(또는 지금 사진)를 보고 어느 나라인지 4지선다로 맞히는 미니앱. 정답 1번에 10P.

## 파일
- `app.config.js`: 입구(홈·전체 앱)에 보이는 이름·소개·그림
- `index.jsx`, `whereami.css`: 화면
- 백엔드: `backend/app/routers/whereami.py`, 테스트 `backend/tests/test_whereami.py`

## API
- `GET /api/webcam-quiz/question` → `{ image, timelapse, title, options[4], token, source }`
- `POST /api/webcam-quiz/answer` `{ token, guess }` → `{ correct }`
- 원본: https://api.windy.com/webcams/api/v3/webcams (출처: Windy Webcams, windy.com)

## 필요한 환경 변수 (배포 담당에게 전달)
| 이름 | 어디에 | 비고 |
|---|---|---|
| `WINDY_API_KEY` | 백엔드 | https://api.windy.com/keys 에서 발급. 레포에 올리지 않는다. 없으면 `/question` 이 503 |
