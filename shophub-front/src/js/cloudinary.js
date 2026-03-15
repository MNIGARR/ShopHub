export async function uploadImage(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "shophub_preset";

  if (!cloudName) throw new Error("Cloudinary cloud name konfiqurasiya edilməyib");
  if (!file) throw new Error("Şəkil faylı seçilməyib");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Cloudinary-nin real error mesajını göstər
    throw new Error(data?.error?.message || `Cloudinary upload xətası (HTTP ${res.status})`);
  }

  return data.secure_url;
}