import { ArrowLeft, Clock3, Heart, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/features/destination-resources/components/FavoriteButton";
import { DESTINATION_RESOURCES } from "@/features/destination-resources/data";

export function generateStaticParams() { return DESTINATION_RESOURCES.map((resource) => ({ id: resource.id })); }

export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = DESTINATION_RESOURCES.find((item) => item.id === id);
  if (!resource) notFound();
  return <main className="resource-detail-page"><header className="resource-site-nav"><a href="/home" className="resource-brand"><span>闽</span><strong>智游闽韵</strong><small>FUZHOU TRAVEL</small></a><nav><a className="active" href="/resources">发现</a><a href="/home#plan">行程</a><a href="/home#stories">游记</a><a href="/profile/favorites">我的收藏</a></nav><a href="/home" className="resource-user">返回首页</a></header><a className="detail-back" href="/resources"><ArrowLeft size={16} />返回资源中心</a><div className="detail-hero" style={{ backgroundImage: `url('${resource.image}')` }}><div className="detail-hero-shade" /><div className="detail-hero-copy"><span>{resource.category} · {resource.district}</span><h1>{resource.name}</h1><p>{resource.summary}</p></div></div><div className="detail-layout"><article className="detail-content"><div className="detail-actions"><FavoriteButton resourceId={resource.id} /><button className="detail-action"><Heart size={16} />加入行程</button></div><section><p className="section-kicker">ABOUT</p><h2>关于这里</h2><p>{resource.description}</p></section><section><p className="section-kicker">HISTORY</p><h2>历史背景</h2><p>{resource.history}</p></section></article><aside className="detail-facts"><h2>实用信息</h2><div><Clock3 size={18} /><span><b>开放时间</b>{resource.openingHours}</span></div><div><MapPin size={18} /><span><b>地址</b>{resource.address}</span></div><div><span className="fact-dot" /><span><b>相关标签</b><small className="detail-tags">{resource.tags.map((tag) => <em key={tag}>{tag}</em>)}</small></span></div></aside></div></main>;
}
