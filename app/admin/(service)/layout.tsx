/**
 * @module-note app/admin/(service)/layout.tsx
 * 景点服务区：场馆、票务、预约核销与应急工单由景点管理员负责。
 */
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function ServiceLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?endpoint=ticket&next=/admin/tickets");
  if (user.role === "ADMIN") redirect("/admin/dashboard");
  if (user.role !== "TICKET_ADMIN") redirect("/home");
  return children;
}
