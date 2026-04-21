import { redirect } from "next/navigation";

export default async function V2Root({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  redirect(`/admin/missions/${slug}/v2/briefing`);
}
