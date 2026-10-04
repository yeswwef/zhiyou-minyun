"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock3,
  Footprints,
  Heart,
  MessageCircle,
  UserCheck,
  UsersRound,
  FileText,
  UserRound,
} from "lucide-react";

const MENU = [
  { href: "/profile", label: "个人信息", icon: UserRound },
  { href: "/profile/favorites", label: "我的收藏", icon: Heart },
  { href: "/profile/posts", label: "我的发布", icon: FileText },
  { href: "/profile/following", label: "我的关注", icon: UserCheck },
  { href: "/profile/followers", label: "我的粉丝", icon: UsersRound },
  { href: "/profile/trips", label: "我的行程", icon: Clock3 },
  { href: "/profile/footprints", label: "我的足迹", icon: Footprints },
  { href: "/profile/history", label: "问答历史", icon: MessageCircle },
];

export function ProfileSidebar() {
  const pathname = usePathname();

  return (
    <aside className="uc-sidebar">
      <nav className="uc-sidebar-menu">
        {MENU.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={pathname === href ? "active" : ""}>
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
