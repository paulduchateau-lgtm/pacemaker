import { redirect } from "next/navigation";

export default async function V2Root({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/admin/missions/${slug}/v2/briefing`);
}
