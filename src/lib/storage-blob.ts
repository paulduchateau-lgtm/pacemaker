import { put, del } from "@vercel/blob";

export async function uploadImage(
  file: Buffer,
  filename: string
): Promise<string> {
  const blob = await put(`pacemaker/${filename}`, file, {
    access: "public",
    contentType: "image/jpeg",
  });
  return blob.url;
}

export async function deleteImage(url: string): Promise<void> {
  await del(url);
}
