import { getToken, logout } from "../services/auth.service.js";

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
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

  return data;
}
