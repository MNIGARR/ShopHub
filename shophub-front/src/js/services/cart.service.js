const CART_KEY = "shophub_cart_v1";

export function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
  catch { return []; }
}

export function setCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function clearCart() {
  setCart([]);
}

export function addToCart(productId, qty = 1) {
  const id = Number(productId);
  const q = Number(qty);
  const cart = getCart();
  const found = cart.find(x => Number(x.productId) === id);
  if (found) found.qty += q;
  else cart.push({ productId: id, qty: q });
  setCart(cart);
  return cart;
}

export function cartCount() {
  return getCart().reduce((s, x) => s + Number(x.qty || 0), 0);
}
