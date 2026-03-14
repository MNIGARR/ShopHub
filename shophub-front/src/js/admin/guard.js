import { getUser, isAdmin } from "../services/auth.service.js";

export function requireAdminAccess() {
  const user = getUser();
  if (!user) {
    window.location.href = "/src/pages/auth/login.html";
    return false;
  }

  if (!isAdmin()) {
    window.location.href = "/src/pages/auth/login.html";
    return false;
  }

  return true;
}