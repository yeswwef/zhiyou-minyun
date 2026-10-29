/**
 * @module-note app/admin/(governance)/layout.tsx
 * 平台治理区：只允许平台管理员访问用户、内容、交易、AI 与系统设置。
 */
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function GovernanceLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?endpoint=admin&next=/admin/dashboard");
  if (user.role === "TICKET_ADMIN") redirect("/admin/tickets");
  if (user.role !== "ADMIN") redirect("/home");
  return children;
}
