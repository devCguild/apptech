// 모아펫은 독립 HTML 앱(public/moapet/). 다른 미니앱과 같은 틀(뒤로 가기 + 이름) 안에
// 폭 480px 화면으로 띄워, 모아펫이 자기 모바일 배치(@media max-width)를 그대로 쓰게 한다
export default function App() {
  return <iframe className="mini-app-frame" src={`${import.meta.env.BASE_URL}moapet/`} title="모아펫" />;
}
