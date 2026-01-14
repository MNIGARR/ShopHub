import { $ } from "../utils/dom.js";

export function toast(type, title, msg) {
  const wrap = $("#toast");
  const icon = $("#toastIcon");
  const t = $("#toastTitle");
  const m = $("#toastMsg");

  const map = {
    success: { glyph: "✓" },
    danger:  { glyph: "!" },
    warn:    { glyph: "!" },
    info:    { glyph: "i" },
  };
  const cfg = map[type] || map.info;

  icon.textContent = cfg.glyph;
  t.textContent = title || "";
  m.textContent = msg || "";

  wrap.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => wrap.classList.add("hidden"), 3200);
}
