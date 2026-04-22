import { redirect } from "next/navigation";

export default function V2ReglesPage({ params }: { params: { slug: string } }) {
  redirect(`/admin/missions/${params.slug}/memoire?tab=regles`);
}
