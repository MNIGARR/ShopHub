export async function uploadImage(file) {
   const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "shophub_preset";

    if (!cloudName) {
        throw new Error("Cloudinary cloud name konfiqurasiya edilməyib");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || "Cloudinary upload xətası");
        return data.secure_url; // Şəklin internet linki
    } catch (err) {
        console.error("Cloudinary error:", err);
        throw new Error("Şəkil yüklənmədi");
    }
}