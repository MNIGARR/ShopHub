import { getToken, logout } from "../services/auth.service.js";

const STATUS_MESSAGES = {
  401: "Sessiya bitib. Zəhmət olmasa yenidən daxil olun.",
  403: "Bu əməliyyat üçün icazəniz yoxdur.",
  404: "Sorğulanan resurs tapılmadı.",
  500: "Server xətası baş verdi. Bir az sonra yenidən cəhd edin.",
};

export async function apiFetch(url, { method = "GET", body, headers = {} } = {}) {
  const token = getToken();

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (res.status === 401) logout();
  if (!res.ok) {
    const serverMsg = data?.message;
    const message = serverMsg || STATUS_MESSAGES[res.status] || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}
