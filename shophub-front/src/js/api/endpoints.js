const rawBase = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
export const API_BASE = rawBase.replace(/\/$/, "");

export const endpoints = {
  auth: {
    register: () => `${API_BASE}/auth/register`,
    login: () => `${API_BASE}/auth/login`,
    me: () => `${API_BASE}/auth/me`,
    forgotPassword: () => `${API_BASE}/auth/forgot-password`,
    resetPassword: () => `${API_BASE}/auth/reset-password`,
    resetPasswordSimple: () => `${API_BASE}/auth/reset-password-simple`, // <-- əlavə olundu
  },
  products: {
    list: (query = "") => `${API_BASE}/products${query ? `?${query}` : ""}`,
    detail: (id) => `${API_BASE}/products/${id}`,
    update: (id) => `${API_BASE}/products/${id}`,
    create: () => `${API_BASE}/products`,
    remove: (id) => `${API_BASE}/products/${id}`,
  },
  orders: {
    my: () => `${API_BASE}/orders/my`,
    checkout: () => `${API_BASE}/orders/checkout`,
    detail: (id) => `${API_BASE}/orders/${id}`,
    list: () => `${API_BASE}/orders`,
    updateStatus: (id) => `${API_BASE}/orders/${id}/status`,
  },
  users: {
    list: () => `${API_BASE}/users`,
    setActive: (id) => `${API_BASE}/users/${id}/active`,
    setRole: (id) => `${API_BASE}/users/${id}/role`,
  },
};
