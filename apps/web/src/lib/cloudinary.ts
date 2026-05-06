import type { SignedUpload } from "@watchbag/shared";

// Uploads a File directly to Cloudinary using server-signed params, bypassing
// our backend entirely. Returns the CDN URL on success.
export async function uploadToCloudinary(file: File, signed: SignedUpload): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("signature", signed.signature);
  form.append("folder", signed.folder);

  const res = await fetch(signed.uploadUrl, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}) ${text}`);
  }

  const json = (await res.json()) as { secure_url?: string; url?: string };
  const url = json.secure_url ?? json.url;
  if (!url) throw new Error("Upload response missing URL");
  return url;
}
