// public/data.js (파이썬이 키로 받아 둔 영양 데이터)를 미니앱이 열릴 때 한 번만 불러온다.
// 공용 index.html 을 고치지 않으려고 여기서 <script> 를 붙인다. 약 3.6MB 라 첫 화면은 임시 예시값으로 먼저 보여 준다.
let loading = null;

export function loadNutrition() {
  if (window.NUTRITION_DATA) return Promise.resolve(window.NUTRITION_DATA);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${import.meta.env.BASE_URL}data.js`; // 🔌 API 결과 파일 불러오기
    script.onload = () => (window.NUTRITION_DATA ? resolve(window.NUTRITION_DATA) : reject(new Error("data.js 가 비어 있어요")));
    script.onerror = () => {
      loading = null; // 다음에 다시 시도할 수 있게
      script.remove();
      reject(new Error("data.js 를 불러오지 못했어요"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
