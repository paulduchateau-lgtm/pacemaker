import { redirect } from "next/navigation";

export default function V2DecisionsPage({ params }: { params: { slug: string } }) {
  redirect(`/admin/missions/${params.slug}/memoire?tab=decisions`);
}
