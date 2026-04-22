import { redirect } from "next/navigation";

export default function V2LivrablesPage({ params }: { params: { slug: string } }) {
  redirect(`/admin/missions/${params.slug}/plan?tab=livrables`);
}
