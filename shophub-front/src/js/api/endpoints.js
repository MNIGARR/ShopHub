export const API_BASE = "http://localhost:5000/api";

export const endpoints = {
  auth: {
    register: () => `${API_BASE}/auth/register`,
    login: () => `${API_BASE}/auth/login`,
    me: () => `${API_BASE}/auth/me`,
    forgotPassword: () => `${API_BASE}/auth/forgot-password`,
    resetPassword: () => `${API_BASE}/auth/reset-password`,
  },
  products: {
    list: () => `${API_BASE}/products`,
    detail: (id) => `${API_BASE}/products/${id}`,
  },
  orders: {
    my: () => `${API_BASE}/orders/my`,
    checkout: () => `${API_BASE}/orders/checkout`,
    detail: (id) => `${API_BASE}/orders/${id}`,
  },
};
