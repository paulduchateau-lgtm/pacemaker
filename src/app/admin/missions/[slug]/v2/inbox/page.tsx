import { redirect } from "next/navigation";

export default function V2InboxPage({ params }: { params: { slug: string } }) {
  redirect(`/admin/missions/${params.slug}/inbox`);
}
