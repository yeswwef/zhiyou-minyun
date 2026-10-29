/**
 * @module-note components/admin/AdminSidebarNav.tsx
 * 角色化后台导航：平台管理员负责治理，景点管理员负责服务模块。
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  FileCheck2,
  LayoutDashboard,
  MapPinned,
  Settings,
  Siren,
  Sparkles,
  Store,
  TicketCheck,
  UsersRound,
} from "lucide-react";

const GOVERNANCE_GROUPS = [
  {
    label: "平台",
    items: [
      { href: "/admin/dashboard", label: "平台总览", description: "全域运行态势", icon: LayoutDashboard },
    ],
  },
  {
    label: "治理",
    items: [
      { href: "/admin/users", label: "用户与角色", description: "账号与权限", icon: UsersRound },
      { href: "/admin/content", label: "内容治理", description: "资源与社区", icon: FileCheck2 },
      { href: "/admin/commerce", label: "商户与交易", description: "商品与订单", icon: Store },
    ],
  },
  {
    label: "智能与系统",
    items: [
      { href: "/admin/ai", label: "AI 运营", description: "问答与模型", icon: Sparkles },
      { href: "/admin/settings", label: "系统设置", description: "环境与安全", icon: Settings },
    ],
  },
] as const;

const SERVICE_GROUPS = [
  {
    label: "景点服务",
    items: [
      { href: "/admin/tickets", label: "场馆与票务", description: "场馆与场次", icon: MapPinned },
      { href: "/admin/bookings", label: "预约与核销", description: "现场服务", icon: ClipboardCheck },
      { href: "/admin/emergency", label: "应急工单", description: "求助与处置", icon: Siren },
    ],
  },
] as const;

/** 渲染当前角色可见的后台导航。 */
export function AdminSidebarNav({ role }: { role: "ADMIN" | "TICKET_ADMIN" }) {
  const pathname = usePathname();
  const groups = role === "TICKET_ADMIN" ? SERVICE_GROUPS : GOVERNANCE_GROUPS;
  return (
    <div className="admin-nav-scroll">
      <nav className="admin-nav" aria-label="平台管理中心导航">
        {groups.map((group) => (
          <div key={group.label} className="admin-nav-group">
            <p className="admin-nav-group-label">{group.label}</p>
            {group.items.map(({ href, label, description, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                  <span className="admin-nav-icon"><Icon size={17} /></span>
                  <span><b>{label}</b><small>{description}</small></span>
                </Link>
              );
            })}
          </div>
        ))}
        {role === "TICKET_ADMIN" && (
          <div className="admin-nav-note">
            <TicketCheck size={14} />
            <span>景点工作台只处理场馆、预约核销与应急服务；账号与内容治理由平台管理员负责。</span>
          </div>
        )}
      </nav>
    </div>
  );
}
