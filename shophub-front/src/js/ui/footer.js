// src/js/ui/footer.js
import { $ } from "../utils/dom.js";

export function initFooter() {
  const yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}
