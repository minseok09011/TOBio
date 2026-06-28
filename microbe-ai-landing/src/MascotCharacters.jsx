// 모든 화면 좌우 하단에 고정 표시되는 사이트 마스코트 (넓은 화면에서만)
function Mascot({ src, side }) {
  const sideClass = side === "left" ? "left-3" : "right-3";
  return (
    <div
      className={`hidden lg:flex ${sideClass} pointer-events-none fixed bottom-4 z-0 flex-col items-center gap-1.5`}
    >
      <img
        src={src}
        alt=""
        className="object-contain"
        style={{ height: "80vh", maxHeight: "720px", maxWidth: "38vw" }}
      />
      <span className="text-sm font-medium text-gray-500 opacity-70">
        AI로 생성한 이미지입니다
      </span>
    </div>
  );
}

export default function MascotCharacters() {
  return (
    <>
      <Mascot src="/img/first_image.png" side="left" />
      <Mascot src="/img/second_image.png" side="right" />
    </>
  );
}
