import { redirect } from "next/navigation";

export default function V2ContextePage({ params }: { params: { slug: string } }) {
  redirect(`/admin/missions/${params.slug}/memoire`);
}
