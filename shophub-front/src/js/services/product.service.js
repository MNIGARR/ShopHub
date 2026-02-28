import { endpoints } from "../api/endpoints.js";
import { apiFetch } from "../api/http.js";

export async function getProducts() {
  const data = await apiFetch(endpoints.products.list());
  return Array.isArray(data) ? data : (data.items || data.products || []);
}

export async function getProductsPaginated({ page = 1, pageSize = 12 } = {}) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
  const data = await apiFetch(endpoints.products.list(query));
  return {
    items: data.items || [],
    total: Number(data.total || 0),
    page: Number(data.page || page),
    pageSize: Number(data.pageSize || pageSize),
    totalPages: Number(data.totalPages || 1),
  };
}

export async function getProductById(id) {
  return apiFetch(endpoints.products.detail(id));
}
