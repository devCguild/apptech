# 오늘의 퀴즈

경제·사회·역사·과학·영어 상식 퀴즈. 시간대(아침·점심·저녁)마다 한 번 맞히면 10원을 `addPoints("quiz", 10, …)`로 적립한다.

## 문제 은행

브라우저는 LLM 키를 가질 수 없으므로 문제는 미리 만들어 둔다.

1. 레포 맨 위 `.env`(레포에 올리지 않음)에 키를 넣는다.
2. `python scripts/generate_quiz.py` 를 실행하면 `public/quiz-bank.js` 가 새로 만들어진다.
3. 문제를 훑어보고 틀린 문제를 지운 뒤 PR로 올린다.

### 필요한 환경 변수 (`.env`)

| 이름 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `LLM_API_KEY` | 예 | — | LLM API 키 |
| `LLM_BASE_URL` | 아니요 | `https://api.openai.com/v1` | OpenAI 호환 주소. Gemini는 `https://generativelanguage.googleapis.com/v1beta/openai`, OpenRouter는 `https://openrouter.ai/api/v1` |
| `LLM_MODEL` | 아니요 | `gpt-4o-mini` | 모델 이름 |
| `LLM_VERIFY` | 아니요 | `1` | `0` 이면 생성 후 검토 단계를 건너뜀 |

## 테스트

```bash
node --test src/apps/quiz/quizLogic.test.js src/apps/quiz/quizStorage.test.js
python -m unittest discover -s scripts -p "test_generate_quiz.py"
```
