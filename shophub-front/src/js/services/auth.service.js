import { endpoints } from "../api/endpoints.js";
import { apiFetch } from "../api/http.js";

const TOKEN_KEY = "shophub_token_v1";
const USER_KEY = "shophub_user_v1";
const LEGACY_AUTH_KEY = "shophub_auth_v1";

function getLegacyAuth() {
  try {
    return JSON.parse(localStorage.getItem(LEGACY_AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

export const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;
  return getLegacyAuth()?.token || null;
};

export const getUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    if (user) return user;
  } catch {
    // noop
  }
  return normalizeUser(getLegacyAuth()?.user);
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
  const normalizedUser = normalizeUser(user);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
  localStorage.setItem(
    LEGACY_AUTH_KEY,
    JSON.stringify({ token, user: normalizedUser }),
  );
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_AUTH_KEY);
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
  
  const token = getToken();
  if (token && u) {
    localStorage.setItem(LEGACY_AUTH_KEY, JSON.stringify({ token, user: u }));
  }

  return u;
}

export function isAdmin() {
  const u = getUser();
  return (u?.role || "").toLowerCase() === "admin";
}

// src/js/services/auth.service.js daxilinə əlavə et
export async function sendResetEmail(email) {
  return await apiFetch(endpoints.auth.forgotPassword(), {
    method: "POST",
    body: { email },
  });
}
