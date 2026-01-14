// src/js/ui/modal.js
import { $ } from "../utils/dom.js";

export function showBackdrop(id) {
  const el = typeof id === "string" ? $(id) : id;
  if (!el) return;
  el.classList.add("show");
}

export function hideBackdrop(id) {
  const el = typeof id === "string" ? $(id) : id;
  if (!el) return;
  el.classList.remove("show");
}

export function initBasicModals() {
  // Auth modal close
  const authBackdrop = $("#authBackdrop");
  const closeAuthModal = $("#closeAuthModal");
  if (closeAuthModal) closeAuthModal.addEventListener("click", () => hideBackdrop(authBackdrop));

  // Product modal close
  const productBackdrop = $("#productBackdrop");
  const closeProductModal = $("#closeProductModal");
  if (closeProductModal) closeProductModal.addEventListener("click", () => hideBackdrop(productBackdrop));
}
