import { CommunityShell } from "@/features/community/components/CommunityShell";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return <CommunityShell user={user}>{children}</CommunityShell>;
}
