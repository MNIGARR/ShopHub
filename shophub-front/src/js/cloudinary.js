export async function uploadImage(file) {
    const cloudName = "dnzhbbnqw"; // Bura öz cloud name-ini yaz
    const uploadPreset = "shophub_preset";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        return data.secure_url; // Şəklin internet linki
    } catch (err) {
        console.error("Cloudinary error:", err);
        throw new Error("Şəkil yüklənmədi");
    }
}