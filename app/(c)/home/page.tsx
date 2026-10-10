"use client";

import {
  ArrowRight,
  BatteryCharging,
  CalendarDays,
  ChevronRight,
  CloudRain,
  GraduationCap,
  Heart,
  Hospital,
  Landmark,
  MessageCircle,
  Map,
  MapPin,
  Bot,
  ParkingCircle,
  PenLine,
  PhoneCall,
  Route,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  Toilet,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

type ResourceRecommendation = {
  image: string;
  slug: string;
  title: string;
  sub: string;
  meta: string;
};

type ResourceApiItem = {
  id: string;
  name: string;
  category: string;
  image: string;
  summary: string;
};

const STORIES = [
  {
    image: "/images/xihu.jpg",
    title: "在西湖边，过一个不赶时间的下午",
    author: "林同学",
    likes: "328",
    avatar: "林",
  },
  {
    image: "/images/molihua.jpg",
    title: "福州人的夏天，是一杯冰镇茉莉花茶",
    author: "阿榕",
    likes: "214",
    avatar: "榕",
  },
  {
    image: "/images/zhenhailou.jpg",
    title: "第一次来福州，先去这几处看古城",
    author: "小满",
    likes: "566",
    avatar: "满",
  },
];

const FACILITIES = [
  { label: "厕所", detail: "附近公共卫生间", icon: Toilet, tone: "coral" },
  { label: "停车场", detail: "查找停车位置", icon: ParkingCircle, tone: "sky" },
  { label: "充电桩", detail: "新能源车补能", icon: BatteryCharging, tone: "mint" },
  { label: "医疗点", detail: "附近医疗服务", icon: Hospital, tone: "rose" },
];

const PRODUCTS = [
  { image: "/images/molihua.jpg", title: "福州茉莉花茶礼盒", detail: "闽都茶香 · 可现场取货", price: "¥ 68", icon: Store },
  { image: "/images/shangxiahang.jpg", title: "上下杭手作明信片", detail: "旅行纪念 · 快递到家", price: "¥ 29", icon: Truck },
  { image: "/images/zhenhailou.jpg", title: "闽都古厝文创摆件", detail: "限量文创 · 商户直发", price: "¥ 128", icon: ShoppingBag },
];

const EVENTS = [
  { title: "福州茉莉花文化节", date: "06.15 - 06.30", place: "仓山 · 茉莉花基地", status: "报名中" },
  { title: "闽都古厝夜游季", date: "07.01 - 07.20", place: "鼓楼 · 三坊七巷", status: "即将开始" },
];

export default function CHome() {
  const [activeResource, setActiveResource] = useState(0);
  const [question, setQuestion] = useState("");
  const [resourceRecommendations, setResourceRecommendations] = useState<
    ResourceRecommendation[]
  >([]);
  const [resourceLoading, setResourceLoading] = useState(true);
  const [resourceError, setResourceError] = useState("");
  const [user, setUser] = useState<{
    username: string;
    nickname: string | null;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then(
        (payload: { user: { username: string; nickname: string | null } | null }) =>
          setUser(payload.user),
      )
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    fetch("/api/resources?recommended=true&limit=4")
      .then((response) => {
        if (!response.ok) throw new Error("资源加载失败");
        return response.json();
      })
      .then((payload: { data?: ResourceApiItem[] }) => {
        setResourceRecommendations(
          (payload.data ?? []).map((resource) => ({
            image: resource.image,
            slug: resource.id,
            title: resource.name,
            sub: resource.summary,
            meta: resource.category,
          })),
        );
        setResourceError("");
      })
      .catch(() => {
        setResourceRecommendations([]);
        setResourceError("暂时无法加载文旅资源，请稍后重试。");
      })
      .finally(() => setResourceLoading(false));
  }, []);

  const activeItem = resourceRecommendations[activeResource] ?? resourceRecommendations[0];

  return (
    <main className="home-page min-h-screen bg-[#f8f8f6] text-[#202522]">
      <a href="/home" className="fuzhou-logo" aria-label="有福之州首页">
        <strong>有<span>福</span>之州</strong>
        <small>山海相拥 · 文脉绵长</small>
      </a>
      <header className="site-header">
        <div className="site-header-inner">
          <a href="/home" className="brand-lockup" aria-label="智游闽韵首页">
            <span className="brand-mark"><BrandMark size={22} /></span>
            <span>
              <strong>智游闽韵</strong>
              <small>FUZHOU TRAVEL</small>
            </span>
          </a>

          <nav className="main-nav" aria-label="主导航">
            <a className="active" href="#explore">发现</a>
            <a href="#plan">行程</a>
            <Link href="/community">游记</Link>
            <a href="#shop">商城</a>
            <a href="#help">便民</a>
          </nav>

          <div className="header-actions">
            <button className="header-icon" aria-label="搜索">
              <Search size={18} />
            </button>
            {user ? (
              <Link className="login-link" href="/profile">
                {user.nickname || user.username}
              </Link>
            ) : (
              <Link className="login-link" href="/login">登录 / 注册</Link>
            )}
          </div>
        </div>
      </header>

      <aside className="home-sidebar" aria-label="C端功能导航">
        <a className="sidebar-home active" href="/home">
          <MapPin size={18} />
          <span>首页</span>
        </a>
        <Link href="/profile"><UserRound size={18} /><span>用户中心</span></Link>
        <a href="#ask"><MessageCircle size={18} /><span>AI文化问答</span></a>
        <a href="#plan"><Route size={18} /><span>旅游行程规划</span></a>
        <Link href="/resources"><Map size={18} /><span>文旅资源中心</span></Link>
        <a href="#recognition"><ScanLine size={18} /><span>AI多模态识景</span></a>
        <a href="#digital-guide"><Bot size={18} /><span>AI数字人讲解</span></a>
        <Link href="/tickets"><Ticket size={18} /><span>票务预约</span></Link>
        <a href="#help"><ShieldCheck size={18} /><span>便民与应急</span></a>
        <a href="#shop"><ShoppingBag size={18} /><span>文旅商品购买</span></a>
        <Link href="/community"><UsersRound size={18} /><span>文旅社区</span></Link>
        <a href="#learn"><GraduationCap size={18} /><span>非遗学习</span></a>
      </aside>

      <section className="home-search-wrap" aria-label="福州旅游搜索">
        <form className="home-search" onSubmit={(event) => event.preventDefault()}>
          <Search size={20} />
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="搜索福州景点、美食、住宿，或问问 AI"
            aria-label="搜索福州景点、美食、住宿，或问问 AI"
          />
          <button type="submit">开始探索 <ArrowRight size={17} /></button>
        </form>
      </section>

      <section className="destination-showcase" id="explore">
        <div className="showcase-heading">
          <div>
            <p className="section-kicker">文旅资源中心</p>
            <h1>文旅资源推荐</h1>
            <p>景点、非遗与美食，发现福州多元的文旅体验</p>
          </div>
          <Link href="/resources">查看全部资源 <ArrowRight size={16} /></Link>
        </div>

        <div className="showcase-carousel">
          {resourceLoading ? (
            <div className="resource-empty">正在加载文旅资源……</div>
          ) : resourceError ? (
            <div className="resource-empty">{resourceError}</div>
          ) : activeItem ? (
            <>
              <a
                className="showcase-feature"
                href={`/resources/${activeItem.slug}`}
                style={{ backgroundImage: `url('${activeItem.image}')` }}
              >
                <div className="showcase-overlay" />
                <div className="showcase-copy">
                  <span>{activeItem.meta}</span>
                  <h2>{activeItem.title}</h2>
                  <p>{activeItem.sub}</p>
                  <b>探索这里 <ArrowRight size={14} /></b>
                </div>
              </a>

              <div className="showcase-previews">
                {resourceRecommendations.map((item, index) => ({ item, index }))
                  .filter(({ index }) => index !== activeResource)
                  .map(({ item, index }) => (
                    <a
                      className="showcase-preview"
                      href={`/resources/${item.slug}`}
                      key={item.title}
                      onClick={(event) => {
                        event.preventDefault();
                        setActiveResource(index);
                      }}
                    >
                      <span style={{ backgroundImage: `url('${item.image}')` }} />
                      <strong>{item.title}</strong>
                      <small>{item.meta}</small>
                    </a>
                  ))}
              </div>
            </>
          ) : (
            <div className="resource-empty">正在加载文旅资源……</div>
          )}
        </div>
      </section>

      <section className="home-quick-grid" aria-label="常用服务">
        <a href="#help"><ShieldCheck size={30} /><span><strong>便民与应急</strong><small>出行保障 · 应急求助 · 实用信息</small></span><ChevronRight size={17} /></a>
        <a href="#plan"><Route size={30} /><span><strong>行程规划</strong><small>智能推荐 · 定制行程 · 路线地图</small></span><ChevronRight size={17} /></a>
        <a href="#destinations"><Map size={30} /><span><strong>旅游地图</strong><small>一键查看 · 景点分布 · 周边服务</small></span><ChevronRight size={17} /></a>
        <a href="#ask"><MessageCircle size={30} /><span><strong>旅游咨询</strong><small>官方客服 · 政策查询 · 问题解答</small></span><ChevronRight size={17} /></a>
      </section>

      <section className="home-content-grid" aria-label="福州内容推荐">
        <a href="#shop" className="home-content-card">
          <div><strong>闽都好物</strong><small>把福州的味道带回家</small></div>
          <div className="home-content-image" style={{ backgroundImage: "url('/images/molihua.jpg')" }} />
          <b>福州茉莉花茶</b>
        </a>
        <a href="#events" className="home-content-card">
          <div><strong>官方活动</strong><small>精彩活动 · 不容错过</small></div>
          <div className="home-content-image" style={{ backgroundImage: "url('/images/shangxiahang.jpg')" }} />
          <b>福州文旅嘉年华</b>
        </a>
        <Link href="/community" className="home-content-card">
          <div><strong>游记故事</strong><small>真实的旅行，动人的福州</small></div>
          <div className="home-content-image" style={{ backgroundImage: "url('/images/sanfangqixiang.jpg')" }} />
          <b>在三坊七巷，遇见慢下来的福州</b>
        </Link>
        <a href="#learn" className="home-content-card">
          <div><strong>非遗学习</strong><small>传承闽都匠心，感受非遗之美</small></div>
          <div className="home-content-image" style={{ backgroundImage: "url('/images/zhenhailou.jpg')" }} />
          <b>福州脱胎漆器</b>
        </a>
      </section>

      <section className="section-wrap plan-section" id="plan">
        <div className="section-heading">
          <div>
            <p className="section-kicker">AI 灵感行程</p>
            <h2>你的福州，<em>从今天开始</em></h2>
            <p>不想做攻略？告诉我几天、几个人，以及你想要的节奏。</p>
          </div>
          <a className="text-link" href="#planner">
            试试 AI 规划 <ArrowRight size={16} />
          </a>
        </div>

        <div className="plan-card">
          <div className="plan-copy">
            <span className="plan-badge">
              <Sparkles size={14} /> AI TRIP PLANNER
            </span>
            <h3>把想去的地方，<br /><em>串成一段好时光</em></h3>
            <p>从鼓山日出到上下杭夜色，为你生成一份合心意的专属路线。</p>
            <a href="#planner" className="dark-button">
              开始规划 <ArrowRight size={16} />
            </a>
          </div>
          <div className="plan-image" />
        </div>
      </section>

      <section className="section-wrap destinations-section" id="destinations">
        <div className="section-heading">
          <div>
            <p className="section-kicker">文旅资源精选</p>
            <h2>第一次来福州，<em>从这里开始探索</em></h2>
          </div>
          <Link className="text-link" href="/resources">
            浏览资源中心 <ArrowRight size={16} />
          </Link>
        </div>

        <div className="destination-grid">
          {resourceRecommendations.map((item, index) => (
            <a
              href={`/resources/${item.slug}`}
              className={`destination-card card-${index}`}
              key={item.title}
            >
              <div
                className="destination-image"
                style={{ backgroundImage: `url('${item.image}')` }}
              />
              <div className="destination-overlay" />
              <div className="destination-meta">
                <span>{item.meta}</span>
                <h3>{item.title}</h3>
                <p>{item.sub}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="section-wrap travel-help-section" id="help">
        <div className="section-heading">
          <div>
            <p className="section-kicker">在路上更安心</p>
            <h2>便民与应急，<em>随手可查</em></h2>
            <p>厕所、停车、充电、医疗，一次把旅途需要的都安排好。</p>
          </div>
          <a className="text-link" href="#facility-map">查看附近设施 <ArrowRight size={16} /></a>
        </div>

        <div className="help-grid">
          <div className="facility-panel">
            <div className="panel-title-row">
              <div>
                <span className="panel-label">附近服务</span>
                <h3>现在就能用的设施</h3>
              </div>
              <MapPin size={22} />
            </div>
            <div className="facility-items">
              {FACILITIES.map(({ label, detail, icon: Icon, tone }) => (
                <a href="#facility-map" className="facility-item" key={label}>
                  <span className={`facility-icon ${tone}`}><Icon size={19} /></span>
                  <span><strong>{label}</strong><small>{detail}</small></span>
                  <ChevronRight size={15} />
                </a>
              ))}
            </div>
          </div>

          <div className="alert-panel">
            <div className="alert-topline"><span><CloudRain size={15} /> 榕城天气提醒</span><b>今日 28° / 小雨</b></div>
            <h3>沿海天气变化，<br /><em>提前知道更安心</em></h3>
            <p>台风、暴雨、景区闭园通知会在这里及时更新。</p>
            <div className="alert-actions"><a href="#weather"><CloudRain size={16} />天气预警</a><a href="#emergency"><PhoneCall size={16} />一键求助</a></div>
          </div>
        </div>
      </section>

      <section className="section-wrap shop-section" id="shop">
        <div className="section-heading">
          <div>
            <p className="section-kicker">闽都好物</p>
            <h2>把喜欢的福州，<em>带回家</em></h2>
            <p>商户精选上架，支持现场取货和快递到家。</p>
          </div>
          <a className="text-link" href="#shop-all">逛文旅商城 <ArrowRight size={16} /></a>
        </div>

        <div className="product-grid">
          {PRODUCTS.map(({ image, title, detail, price, icon: Icon }) => (
            <a className="product-card" href="#product" key={title}>
              <div className="product-image" style={{ backgroundImage: `url('${image}')` }} />
              <div className="product-body"><span className="product-mark"><Icon size={13} /> 商户直供</span><h3>{title}</h3><p>{detail}</p><strong>{price}</strong></div>
            </a>
          ))}
        </div>
      </section>

      <section className="section-wrap community-section" id="community">
        <div className="section-heading">
          <div>
            <p className="section-kicker">榕城生活</p>
            <h2>本地人都在看</h2>
          </div>
          <Link className="text-link" href="/community">进入社区 <ArrowRight size={16} /></Link>
        </div>

        <div className="community-layout">
          <div className="story-grid">
            {STORIES.map((story) => (
              <Link href="/community" className="story-card" key={story.title}>
                <div className="story-image" style={{ backgroundImage: `url('${story.image}')` }} />
                <div className="story-body"><h3>{story.title}</h3><div className="story-author"><span>{story.avatar}</span><small>{story.author}</small><span className="story-like"><Heart size={14} /> {story.likes}</span></div></div>
              </Link>
            ))}
          </div>
          <Link className="write-story" href="/community/new?type=checkin"><span className="write-icon"><PenLine size={20} /></span><strong>写一篇游记</strong><small>记录你的福州时刻</small><ArrowRight size={18} /></Link>
        </div>
      </section>

      <section className="section-wrap events-section" id="events">
        <div className="section-heading"><div><p className="section-kicker">官方活动</p><h2>这座城，<em>一直有好事发生</em></h2></div><a className="text-link" href="#events-all">全部活动 <ArrowRight size={16} /></a></div>
        <div className="event-grid">{EVENTS.map((event) => <a href="#event" className="event-card" key={event.title}><span className="event-date"><CalendarDays size={16} /> {event.date}</span><h3>{event.title}</h3><p><MapPin size={14} /> {event.place}</p><b>{event.status}</b><ChevronRight size={18} /></a>)}</div>
      </section>

      <section className="section-wrap learning-section" id="learn">
        <div className="learning-card"><div className="learning-copy"><span className="plan-badge"><GraduationCap size={14} /> INTANGIBLE HERITAGE</span><h2>跟着匠人，<br /><em>学一门福州手艺</em></h2><p>线上预约体验课，也可以先逛一逛非遗线上展厅。</p><div className="learning-actions"><a href="#classes">预约体验课 <ArrowRight size={15} /></a><a href="#museum"><Landmark size={15} />线上展厅</a></div></div><div className="learning-image" /></div>
      </section>

      <footer className="site-footer"><div className="footer-inner"><div className="brand-lockup"><span className="brand-mark"><BrandMark size={22} /></span><span><strong>智游闽韵</strong><small>有福之州 · 文旅智能平台</small></span></div><div className="footer-links"><a href="#about">关于我们</a><a href="#help">帮助中心</a><a href="#privacy">隐私政策</a><a href="#source">数据来源与授权</a></div><p>© 2026 智游闽韵 · 让每一次抵达，都有福相伴</p></div></footer>
    </main>
  );
}
