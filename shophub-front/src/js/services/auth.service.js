import { endpoints } from "../api/endpoints.js";
import { apiFetch } from "../api/http.js";

const TOKEN_KEY = "shophub_token_v1";
const USER_KEY = "shophub_user_v1";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
  catch { return null; }
};

function normalizeUser(u) {
  if (!u) return null;
  return {
    id: u.id ?? u.Id,
    email: u.email ?? u.Email,
    role: String(u.role ?? u.Role ?? "user"),
  };
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(normalizeUser(user)));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function register(email, password) {
  const data = await apiFetch(endpoints.auth.register(), {
    method: "POST",
    body: { email, password },
  });
  setSession(data.token, data.user);
  return normalizeUser(data.user);
}

export async function login(email, password) {
  const data = await apiFetch(endpoints.auth.login(), {
    method: "POST",
    body: { email, password },
  });
  setSession(data.token, data.user);
  return normalizeUser(data.user);
}

export async function me() {
  const data = await apiFetch(endpoints.auth.me());
  const u = normalizeUser(data.user);
  localStorage.setItem(USER_KEY, JSON.stringify(u));
  return u;
}

export function isAdmin() {
  const u = getUser();
  return (u?.role || "").toLowerCase() === "admin";
}
