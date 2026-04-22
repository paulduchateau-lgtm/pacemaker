import { redirect } from "next/navigation";

export default function V2RecalibrationsPage({ params }: { params: { slug: string } }) {
  redirect(`/admin/missions/${params.slug}/memoire?tab=agent`);
}
