import { redirect } from "next/navigation";

export default function V2IncoherencesPage({ params }: { params: { slug: string } }) {
  redirect(`/admin/missions/${params.slug}/signaux`);
}
