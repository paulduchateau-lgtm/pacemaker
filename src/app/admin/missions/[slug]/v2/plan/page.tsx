import { redirect } from "next/navigation";

export default function V2PlanPage({ params }: { params: { slug: string } }) {
  redirect(`/admin/missions/${params.slug}/plan?tab=semaines`);
}
