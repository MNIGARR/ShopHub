import { apiFetch } from "./api/http.js";
import { endpoints } from "./api/endpoints.js";
import { getToken } from "./services/auth.service.js";

async function loadOrders() {
  if (!getToken()) {
    window.location.href = "/src/pages/auth/login.html";
    return;
  }

  try {
    const data = await apiFetch(endpoints.orders.my());
    const orders = Array.isArray(data) ? data : (data.items || []);

    const container = document.getElementById("ordersContainer");

    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h3 class="empty-title">Henüz sifarişiniz yoxdur</h3>
          <p class="empty-subtitle">Məhsulları keşfetməyə başlayın</p>
          <a href="/" style="display: inline-block; padding: 12px 24px; background: var(--accent); color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Alış-verişə git</a>
        </div>
      `;
      return;
    }

    function formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString("az-AZ", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    }

    function formatMoney(amount) {
      return `₼${Number(amount || 0).toFixed(2)}`;
    }

    const statusLabels = {
      pending: "Gözləmədə",
      paid: "Ödənildi",
      shipped: "Göndərildi",
      delivered: "Çatdırılıldı",
      cancelled: "Ləğv edildi"
    };

    const statusClasses = {
      pending: "status-pending",
      paid: "status-paid",
      shipped: "status-shipped",
      delivered: "status-delivered",
      cancelled: "status-cancelled"
    };

    container.innerHTML = orders.map(order => {
      const itemsHtml = (order.items || []).map(item => `
        <div class="order-item">
          <div class="item-name">${item.productName || item.ProductName || "Məhsul"}</div>
          <div class="item-info">
            <div style="margin-bottom: 4px;">Miqdar: ${item.qty || item.Qty} × ${formatMoney(item.unitPrice || item.UnitPrice)}</div>
            <div style="color: var(--accent); font-weight: 600;">${formatMoney((item.qty || item.Qty) * (item.unitPrice || item.UnitPrice))}</div>
          </div>
        </div>
      `).join("");

      return `
        <div class="order-card" onclick="viewOrder(${order.id || order.Id}, '${JSON.stringify(order).replace(/'/g, "&apos;")}')">
          <div class="order-header">
            <div>
              <div class="order-number">Sifariş #${order.id || order.Id}</div>
              <div class="order-date">${formatDate(order.createdAt || order.CreatedAt)}</div>
            </div>
            <span class="order-status ${statusClasses[order.status || order.Status] || 'status-pending'}">
              ${statusLabels[order.status || order.Status] || order.status || order.Status}
            </span>
          </div>
          <div class="order-content">
            <div class="order-details">
              <div class="detail-row">
                <span class="detail-label">Məhsul sayı:</span>
                <span class="detail-value">${(order.items || []).length}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Ümumi cəmi:</span>
                <span class="order-total">${formatMoney(order.total || order.Total)}</span>
              </div>
            </div>
            <button class="btn" onclick="event.stopPropagation(); viewOrder(${order.id || order.Id}, '${JSON.stringify(order).replace(/'/g, "&apos;")}')">Detalları Gör</button>
          </div>
        </div>
      `;
    }).join("");

  } catch (error) {
    const container = document.getElementById("ordersContainer");
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <h3 class="empty-title">Xəta baş verdi</h3>
        <p class="empty-subtitle">${error.message || "Sifarişlər yükləmə xətası"}</p>
      </div>
    `;
    console.error("Orders load error:", error);
  }
}

window.viewOrder = (id, orderStr) => {
  const order = JSON.parse(orderStr);
  const modal = document.getElementById("orderModal");
  const content = document.getElementById("modalContent");

  function formatMoney(amount) {
    return `₼${Number(amount || 0).toFixed(2)}`;
  }

  const statusLabels = {
    pending: "Gözləmədə",
    paid: "Ödənildi",
    shipped: "Göndərildi",
    delivered: "Çatdırılıldı",
    cancelled: "Ləğv edildi"
  };

  const statusClasses = {
    pending: "status-pending",
    paid: "status-paid",
    shipped: "status-shipped",
    delivered: "status-delivered",
    cancelled: "status-cancelled"
  };

  const itemsHtml = (order.items || []).map(item => `
    <div class="order-item">
      <div class="item-name">${item.productName || item.ProductName || "Məhsul"}</div>
      <div class="item-info">
        <div style="margin-bottom: 4px;">Miqdar: ${item.qty || item.Qty} × ${formatMoney(item.unitPrice || item.UnitPrice)}</div>
        <div style="color: var(--accent); font-weight: 600;">${formatMoney((item.qty || item.Qty) * (item.unitPrice || item.UnitPrice))}</div>
      </div>
    </div>
  `).join("");

  content.innerHTML = `
    <div style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <div>
          <div style="color: var(--muted); font-size: 12px; margin-bottom: 4px;">Sifariş №</div>
          <div style="font-size: 18px; font-weight: 700;">#${order.id || order.Id}</div>
        </div>
        <div style="text-align: right;">
          <div style="color: var(--muted); font-size: 12px; margin-bottom: 4px;">Status</div>
          <span class="order-status ${statusClasses[order.status || order.Status] || 'status-pending'}" style="display: inline-block;">
            ${statusLabels[order.status || order.Status] || order.status || order.Status}
          </span>
        </div>
      </div>
    </div>

    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px; color: var(--muted); text-transform: uppercase;">Məhsullar</h3>
      ${itemsHtml || '<div style="color: var(--muted); text-align: center; padding: 20px;">Məhsul tapılmadı</div>'}
    </div>

    <div style="background: var(--line); padding: 16px; border-radius: 8px; margin-top: 24px;">
      <div class="detail-row">
        <span class="detail-label">Ara cəm:</span>
        <span class="detail-value">${formatMoney(order.subtotal || order.Subtotal || order.total || order.Total)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Göndərmə:</span>
        <span class="detail-value">${formatMoney(order.shippingFee || order.ShippingFee || 0)}</span>
      </div>
      <div class="detail-row" style="margin-bottom: 0;">
        <span class="detail-label" style="font-weight: 600;">Toplam:</span>
        <span style="font-size: 18px; font-weight: 700; color: var(--accent);">${formatMoney(order.total || order.Total)}</span>
      </div>
    </div>
  `;

  modal.classList.add("active");
};

window.closeOrderModal = () => {
  document.getElementById("orderModal").classList.remove("active");
};

document.getElementById("orderModal")?.addEventListener("click", (e) => {
  if (e.target.id === "orderModal") {
    window.closeOrderModal();
  }
});

loadOrders();