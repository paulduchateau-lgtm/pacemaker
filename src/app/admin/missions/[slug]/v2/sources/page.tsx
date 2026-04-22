import { redirect } from "next/navigation";

export default function V2SourcesPage({ params }: { params: { slug: string } }) {
  redirect(`/admin/missions/${params.slug}/inbox?tab=sources`);
}
