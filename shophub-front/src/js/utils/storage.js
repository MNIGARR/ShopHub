// src/js/utils/storage.js
export const LS_KEYS = {
  products: "shophub_products_v1",
  users: "shophub_users_v1",
  orders: "shophub_orders_v1",
  session: "shophub_session_v1",
  cart: "shophub_cart_v1",
};

export function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
