import { redirect } from "next/navigation";

export default function V2BriefingPage({ params }: { params: { slug: string } }) {
  redirect(`/admin/missions/${params.slug}/briefing`);
}
