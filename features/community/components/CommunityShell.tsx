import Link from "next/link";
import {
  Bell,
  Bot,
  ChevronDown,
  GraduationCap,
  Map,
  MapPin,
  MessageCircle,
  PenLine,
  Route,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  UserRound,
  UsersRound,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import type { SessionUser } from "@/lib/auth";

const COMMUNITY_MENU = [
  { href: "/home", label: "首页", icon: MapPin },
  { href: "/profile", label: "用户中心", icon: UserRound },
  { href: "/home#ask", label: "AI文化问答", icon: MessageCircle },
  { href: "/home#plan", label: "旅游行程规划", icon: Route },
  { href: "/resources", label: "文旅资源中心", icon: Map },
  { href: "/home#recognition", label: "AI多模态识景", icon: ScanLine },
  { href: "/home#digital-guide", label: "AI数字人讲解", icon: Bot },
  { href: "/home#tickets", label: "票务预约", icon: Ticket },
  { href: "/home#help", label: "便民与应急", icon: ShieldCheck },
  { href: "/home#shop", label: "文旅商品购买", icon: ShoppingBag },
  { href: "/community", label: "文旅社区", icon: UsersRound, active: true },
  { href: "/home#learn", label: "非遗学习", icon: GraduationCap },
];

export function CommunityShell({
  children,
  user,
  searchQuery = "",
}: {
  children: React.ReactNode;
  user: SessionUser | null;
  searchQuery?: string;
}) {
  const loginNext = encodeURIComponent("/community/new?type=checkin");

  return (
    <main className="community-page">
      <header className="community-topbar">
        <Link href="/home" className="community-brand" aria-label="智游闽韵首页">
          <BrandMark size={34} />
          <span>
            <strong>智游闽韵</strong>
            <small>山海福地 · 有福之州</small>
          </span>
        </Link>

        <span className="community-location"><MapPin size={18} />福州<ChevronDown size={15} /></span>

        <form className="community-search" action="/community">
          <Search size={18} />
          <input name="q" defaultValue={searchQuery} placeholder="搜索打卡、评价或文旅资源……" />
        </form>

        <nav className="community-top-links" aria-label="顶部导航">
          <Link href="/home#shop">商户服务</Link>
          <Link href="/home">关于我们</Link>
          <span className="community-bell"><Bell size={19} /></span>
          {user ? (
            <Link href="/profile" className="community-user">
              <span>{(user.nickname || user.username).slice(0, 1)}</span>
              {user.nickname || user.username}<ChevronDown size={15} />
            </Link>
          ) : (
            <Link href="/login?next=%2Fcommunity" className="community-login">登录 / 注册</Link>
          )}
        </nav>
      </header>

      <aside className="community-sidebar" aria-label="C端功能导航">
        {COMMUNITY_MENU.map(({ href, label, icon: Icon, active }) => (
          <Link key={label} href={href} className={active ? "active" : ""}>
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </aside>

      <div className="community-content">{children}</div>

      <nav className="community-mobile-actions" aria-label="社区发布操作">
        <Link href={user ? "/community/new?type=checkin" : `/login?next=${loginNext}`}>
          <MapPin size={19} />我要打卡
        </Link>
        <Link href={user ? "/community/new?type=review" : "/login?next=%2Fcommunity%2Fnew%3Ftype%3Dreview"}>
          <PenLine size={19} />写评价
        </Link>
      </nav>
    </main>
  );
}
