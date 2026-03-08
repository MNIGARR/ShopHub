import { getUser, isAdmin } from "../services/auth.service.js";

export function requireAdminAccess() {
  const user = getUser();
  if (!user) {
    window.location.href = "/login";
    return false;
  }

  if (!isAdmin()) {
    window.location.href = "/";
    return false;
  }

  return true;
}