import { redirect } from "next/navigation";

export default function V2TempsLiberePage({ params }: { params: { slug: string } }) {
  redirect(`/admin/missions/${params.slug}/briefing`);
}
