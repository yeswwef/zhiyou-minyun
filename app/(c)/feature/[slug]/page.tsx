import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

const FEATURE_CONTENT: Record<string, { title: string; eyebrow: string; description: string }> = {
  profile: { title: "用户中心", eyebrow: "MY FUZHOU", description: "管理个人资料、收藏内容与旅行偏好。" },
  assistant: { title: "AI文化问答", eyebrow: "AI CULTURE", description: "了解福州历史、街巷故事与本地文化。" },
  planner: { title: "旅游行程规划", eyebrow: "TRIP PLANNER", description: "根据时间与兴趣安排一份合适的福州行程。" },
  recognition: { title: "AI多模态识景", eyebrow: "AI RECOGNITION", description: "识别眼前景物，快速获取相关介绍。" },
  "digital-guide": { title: "AI数字人讲解", eyebrow: "DIGITAL GUIDE", description: "用更自然的方式听一段福州景点讲解。" },
  tickets: { title: "票务预约", eyebrow: "TICKETS", description: "查看景区门票与活动预约信息。" },
  help: { title: "便民与应急", eyebrow: "TRAVEL HELP", description: "查找厕所、停车、充电、医疗与天气预警。" },
  shop: { title: "文旅商品购买", eyebrow: "LOCAL GOODS", description: "选购福州好物，支持现场取货或快递到家。" },
  community: { title: "文旅社区", eyebrow: "COMMUNITY", description: "发布游记、分享体验，与其他游客交流。" },
  learning: { title: "非遗学习", eyebrow: "INTANGIBLE HERITAGE", description: "预约非遗体验课，参观线上非遗展厅。" },
  map: { title: "旅游地图", eyebrow: "TRAVEL MAP", description: "查看景点分布与周边文旅服务。" },
  events: { title: "官方活动", eyebrow: "OFFICIAL EVENTS", description: "浏览福州官方文旅活动并完成报名。" },
};

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = FEATURE_CONTENT[slug] ?? {
    title: "福州文旅服务",
    eyebrow: "FUZHOU TRAVEL",
    description: "更多文旅服务正在准备中。",
  };

  return (
    <main className="feature-page">
      <header className="feature-page-header">
        <Link href="/home" className="feature-brand"><span><BrandMark size={20} /></span><strong>智游闽韵</strong><small>FUZHOU TRAVEL</small></Link>
        <Link href="/home" className="feature-back">返回首页</Link>
      </header>
      <section className="feature-page-hero">
        <p className="section-kicker">{feature.eyebrow}</p>
        <h1>{feature.title}</h1>
        <p>{feature.description}</p>
        <div className="feature-placeholder">功能页面框架已就绪，后续可接入对应业务数据与交互。</div>
      </section>
    </main>
  );
}
