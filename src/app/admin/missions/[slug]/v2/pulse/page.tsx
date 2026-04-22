import { redirect } from "next/navigation";

export default function V2PulsePage({ params }: { params: { slug: string } }) {
  redirect(`/admin/missions/${params.slug}/signaux?tab=pulse`);
}
