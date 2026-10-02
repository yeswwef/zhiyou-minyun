/** 品牌徽章：山海（山 + 太阳 + 海浪）图形，替代原来的单「闽」字 */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* 山峦 */}
      <path d="M3 17.5 L8.5 9.5 L11.5 13.5 L15 7 L21 17.5 Z" fill="currentColor" />
      {/* 太阳 */}
      <circle cx="17.5" cy="6" r="2.4" fill="#f6c98f" />
      {/* 海浪 */}
      <path
        d="M3 19.5 C6 18.5 7.5 20.5 10.5 19.5 C13.5 18.5 15 20.5 18 19.5 C19.5 19 20.5 18.5 21 18.5"
        stroke="#f6c98f"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
