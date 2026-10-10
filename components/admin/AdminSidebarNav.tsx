"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, LayoutDashboard, MapPinned } from "lucide-react";

const items = [
  { href: "/admin/dashboard", label: "数据总览", description: "运营态势", icon: LayoutDashboard },
  { href: "/admin/tickets", label: "票务与场馆", description: "项目配置", icon: MapPinned },
  { href: "/admin/bookings", label: "预约核销", description: "现场服务", icon: ClipboardCheck },
] as const;

export function AdminSidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="admin-nav" aria-label="后台管理导航">
      {items.map(({ href, label, description, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className={active ? "active" : ""}>
            <span className="admin-nav-icon"><Icon size={18} /></span>
            <span><b>{label}</b><small>{description}</small></span>
          </Link>
        );
      })}
    </nav>
  );
}
