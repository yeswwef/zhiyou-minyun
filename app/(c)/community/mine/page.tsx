import { redirect } from "next/navigation";

export default function LegacyCommunityMinePage() {
  redirect("/profile/posts");
}
