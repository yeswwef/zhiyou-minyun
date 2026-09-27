/**
 * B 端看板占位（空壳）
 * 以后放：客流看板、订单统计、活动报名列表（都是演示数据）。
 */
export default function BDashboardPlaceholder() {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">经营看板（占位）</h1>
      <p className="text-sm text-stone-600">
        这里以后放：商品上架数、订单数、成交金额、活动报名、客流看板。
      </p>
      <div className="card text-xs text-stone-500">空壳状态：没有数据，也没有鉴权。</div>
    </div>
  );
}
