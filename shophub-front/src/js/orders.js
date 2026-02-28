import { $ } from "./utils/dom.js";
import { myOrders, getOrderById } from "./services/order.service.js";

function normalizeOrdersPayload(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.items || [];
}

async function loadOrders() {
  const table = $("ordersTableBody");
  if (!table) return;

  try {
    const payload = await myOrders();
    const orders = normalizeOrdersPayload(payload);

    table.innerHTML = orders
      .map(
        (o) => `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3">#${o.Id}</td>
                <td class="p-3">${new Date(o.CreatedAt).toLocaleDateString()}</td>
                <td class="p-3">${o.Status}</td>
                <td class="p-3 font-bold text-indigo-600">${o.Total} AZN</td>
                <td class="p-3 text-center">
                    <button class="bg-gray-200 px-3 py-1 rounded text-sm" data-order-id="${o.Id}">Detallar</button>
                </tr>
        `,
      )
      .join("");

    table.querySelectorAll("button[data-order-id]").forEach((btn) => {
      btn.addEventListener("click", () =>
        showDetails(Number(btn.dataset.orderId)),
      );
    });
  } catch (err) {
    table.innerHTML = `<tr><td colspan="5" class="text-red-500 p-4">${err.message}</td></tr>`;
  }
}

function closeModal() {
  $("orderDetailModal")?.classList.add("hidden");
}

async function showDetails(id) {
  const modal = $("orderDetailModal");
  const content = $("modalContent");
  if (!modal || !content) return;

  try {
    const data = await getOrderById(id);
    const items = data.items || [];
    content.innerHTML = `
      <div class="space-y-2">
        <p><strong>Sifariş:</strong> #${data.order.Id}</p>
        <p><strong>Status:</strong> ${data.order.Status}</p>
        <p><strong>Cəmi:</strong> ${data.order.Total} AZN</p>
      </div>
      <div>
        <h4 class="font-semibold mb-2">Məhsullar</h4>
        <ul class="space-y-2">
          ${items
            .map(
              (it) => `<li class="border rounded p-3">${it.ProductName || `#${it.ProductId}`} • ${it.Qty} ədəd • ${it.LineTotal} AZN</li>`,
            )
            .join("")}
        </ul>
      </div>
    `;
    modal.classList.remove("hidden");
  } catch (err) {
    content.innerHTML = `<p class="text-red-500">${err.message}</p>`;
    modal.classList.remove("hidden");
  }
}

window.closeModal = closeModal;
loadOrders();