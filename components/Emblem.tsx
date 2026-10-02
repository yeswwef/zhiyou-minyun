/**
 * 主题徽章：红底金环 + 福建元素（马鞍墙古厝 + 山海 + 燕尾脊屋顶 + 海浪）
 * 替换党徽/国徽位置，用于站点头部。
 */
export function Emblem({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      {/* 红底 */}
      <circle cx="32" cy="32" r="31" fill="#b91c1c" />
      {/* 金环（双圈） */}
      <circle cx="32" cy="32" r="29.4" stroke="#d8b45c" strokeWidth="2.4" />
      <circle cx="32" cy="32" r="26.1" stroke="#d8b45c" strokeWidth="0.8" opacity="0.7" />

      {/* 远山 */}
      <path d="M15.5 41.6 L24 30.6 L29 36.6 L35.5 27 L48.5 41.6 Z" fill="#e8cd8e" />

      {/* 古厝屋身 */}
      <path d="M22.6 45.6 V38.4 H41.4 V45.6 Z" fill="#faf0d8" />
      {/* 燕尾脊屋顶 */}
      <path
        d="M19.6 38.8 C24 34.8 28.6 33.5 32 33.5 C35.4 33.5 40 34.8 44.4 38.8"
        stroke="#faf0d8"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
      {/* 门洞 */}
      <path d="M29.4 45.6 V40.8 a2.6 2.6 0 0 1 5.2 0 V45.6 Z" fill="#b91c1c" />

      {/* 海浪 */}
      <path
        d="M13.8 48.9 q4.6 -3.2 9.2 0 t9.2 0 t9.2 0"
        stroke="#d8b45c"
        strokeWidth="1.9"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M17 52.4 q4.6 -3.2 9.2 0 t9.2 0"
        stroke="#d8b45c"
        strokeWidth="1.4"
        opacity="0.75"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
