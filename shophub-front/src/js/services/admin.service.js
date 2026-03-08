import { endpoints } from "../api/endpoints.js";
import { apiFetch } from "../api/http.js";

export const listAdminOrders = async () => {
  const data = await apiFetch(endpoints.orders.list());
  return data.items || [];
};

export const updateOrderStatus = async (id, status) =>
  apiFetch(endpoints.orders.updateStatus(id), {
    method: "PATCH",
    body: { status },
  });

export const listUsers = async () => {
  const data = await apiFetch(endpoints.users.list());
  return data.items || [];
};

export const setUserActive = async (id, isActive) =>
  apiFetch(endpoints.users.setActive(id), {
    method: "PATCH",
    body: { isActive },
  });

export const setUserRole = async (id, role) =>
  apiFetch(endpoints.users.setRole(id), {
    method: "PATCH",
    body: { role },
  });

export const updateProduct = async (id, payload) =>
  apiFetch(endpoints.products.update(id), {
    method: "PUT",
    body: payload,
  });

export const createProduct = async (payload) =>
  apiFetch(endpoints.products.create(), {
    method: "POST",
    body: payload,
  });

export const deleteProduct = async (id) =>
  apiFetch(endpoints.products.remove(id), {
    method: "DELETE",
  });

export const listCategories = async () => {
  const data = await apiFetch(endpoints.categories.list());
  return data.items || [];
};

export const createCategory = async (name) =>
  apiFetch(endpoints.categories.create(), {
    method: "POST",
    body: { name },
  });

export const updateCategory = async (id, name) =>
  apiFetch(endpoints.categories.update(id), {
    method: "PUT",
    body: { name },
  });

export const deleteCategory = async (id) =>
  apiFetch(endpoints.categories.remove(id), {
    method: "DELETE",
  });