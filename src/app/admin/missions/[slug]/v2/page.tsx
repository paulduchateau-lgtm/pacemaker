import { redirect } from "next/navigation";

export default async function V2IndexPage({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/admin/missions/${params.slug}/briefing`);
}
