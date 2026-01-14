import { endpoints } from "../api/endpoints.js";
import { apiFetch } from "../api/http.js";

export async function checkoutOrder(payload) {
  // payload: { items: [{productId, qty}], shippingFee? }
  return apiFetch(endpoints.orders.checkout(), {
    method: "POST",
    body: payload,
  });
}

export async function myOrders() {
  return apiFetch(endpoints.orders.my());
}
export async function getOrderById(id) {
  return apiFetch(endpoints.orders.detail(id));
}