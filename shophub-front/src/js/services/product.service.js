import { endpoints } from "../api/endpoints.js";
import { apiFetch } from "../api/http.js";

export async function getProducts() {
  const data = await apiFetch(endpoints.products.list());
  return Array.isArray(data) ? data : (data.items || data.products || []);
}

export async function getProductById(id) {
  return apiFetch(endpoints.products.detail(id));
}
