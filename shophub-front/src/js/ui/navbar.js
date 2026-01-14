import { $, $$ } from "../utils/dom.js";
import { getUser, isAdmin } from "../services/auth.service.js";
import { cartCount } from "../services/cart.service.js";

export function renderSessionInfo() {
  const u = getUser();
  const label = $("#authBtnLabel");
  const chip = $("#adminRoleChip");

  if (!u) {
    if (label) label.textContent = "Giriş / Qeydiyyat";
    if (chip) chip.textContent = "—";
    return;
  }
  if (label) label.textContent = u.email;
  if (chip) chip.textContent = u.role;
}

export function renderCartBadge() {
  const n = cartCount();
  // səndə badge id-si fərqli ola bilər. Ən tipik:
  const b1 = $("#cartBadge");
  const b2 = $("#cartBadgeSm");
  if (b1) b1.textContent = String(n);
  if (b2) b2.textContent = String(n);
}

export function closeMobileNav() {
  $("#mobileNav")?.classList.add("hidden");
}

export function bindMobileNav() {
  $("#mobileMenuBtn")?.addEventListener("click", () => {
    $("#mobileNav")?.classList.toggle("hidden");
  });
  ["#navShopBtn2", "#navAdminBtn2", "#authBtn2"].forEach(sel => {
    $(sel)?.addEventListener("click", closeMobileNav);
  });
}
