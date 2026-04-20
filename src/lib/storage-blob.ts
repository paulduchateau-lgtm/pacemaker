import { put, del } from "@vercel/blob";

export async function uploadFile(
  file: Buffer,
  filename: string,
  contentType: string = "application/octet-stream"
): Promise<string> {
  const blob = await put(`pacemaker/${filename}`, file, {
    access: "public",
    contentType,
  });
  return blob.url;
}

export async function uploadImage(
  file: Buffer,
  filename: string
): Promise<string> {
  return uploadFile(file, filename, "image/jpeg");
}

export async function deleteFile(url: string): Promise<void> {
  await del(url);
}
