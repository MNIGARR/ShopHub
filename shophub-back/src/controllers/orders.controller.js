const { getPool, sql } = require("../config/db");

async function myOrders(req, res) {
  try {
    const pool = await getPool();
    const r = await pool.request().input("UserId", sql.Int, req.user.id).query(`
        SELECT Id, Status, ShippingFee, Subtotal, Total, CreatedAt
        FROM Orders
        WHERE UserId=@UserId
        ORDER BY CreatedAt DESC;
      `);
    return res.json({ items: r.recordset });
  } catch (err) {
    console.error("myOrders:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function getOrderById(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid id" });

  try {
    const pool = await getPool();

    const o = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`SELECT * FROM Orders WHERE Id=@Id;`);

    if (!o.recordset.length)
      return res.status(404).json({ message: "Order not found" });

    const order = o.recordset[0];

    // user yalnız öz sifarişini görsün, admin hamısını görə bilər
    if (req.user.role !== "admin" && order.UserId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const items = await pool.request().input("OrderId", sql.Int, id).query(`
        SELECT oi.Id, oi.ProductId, oi.Qty, oi.UnitPrice, oi.LineTotal,
               p.Name AS ProductName
        FROM OrderItems oi
        JOIN Products p ON p.Id = oi.ProductId
        WHERE oi.OrderId=@OrderId;
      `);

    return res.json({ order, items: items.recordset });
  } catch (err) {
    console.error("getOrderById:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function listOrders(req, res) {
  const status = String(req.query.status || "all");

  try {
    const pool = await getPool();
    const r = await pool.request().input("Status", sql.NVarChar(30), status)
      .query(`
        SELECT o.Id, o.UserId, u.Email AS UserEmail, o.Status, o.Total, o.CreatedAt
        FROM Orders o
        JOIN Users u ON u.Id = o.UserId
        WHERE (@Status='all' OR o.Status=@Status)
        ORDER BY o.CreatedAt DESC;
      `);

    return res.json({ items: r.recordset });
  } catch (err) {
    console.error("listOrders:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function updateStatus(req, res) {
  const id = Number(req.params.id);
  const { status } = req.body;

  if (!id) return res.status(400).json({ message: "Invalid id" });
  if (
    !["pending", "paid", "shipped", "delivered", "cancelled"].includes(
      String(status),
    )
  ) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const pool = await getPool();
    const r = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Status", sql.NVarChar(30), status).query(`
        UPDATE Orders SET Status=@Status WHERE Id=@Id;
        SELECT @@ROWCOUNT AS Affected;
      `);

    if (!Number(r.recordset?.[0]?.Affected || 0))
      return res.status(404).json({ message: "Order not found" });

    return res.json({ message: "Updated" });
  } catch (err) {
    console.error("updateStatus:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// checkout-u TRANSACTION + stock decrement kimi (REAL)
async function checkout(req, res) {
  const userId = Number(req.user?.id);
  const { items, shippingFee } = req.body;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  if (!Array.isArray(items) || items.length < 1) {
    return res.status(400).json({ message: "items tələb olunur" });
  }

  const cleanItems = items
    .map((it) => ({
      productId: Number(it.productId),
      qty: Number(it.qty),
    }))
    .filter((it) => it.productId > 0 && it.qty > 0);

  if (cleanItems.length < 1) {
    return res.status(400).json({ message: "items formatı yalnışdır" });
  }

  const fee = Number(shippingFee || 0);
  if (fee < 0)
    return res.status(400).json({ message: "shippingFee yalnışdır" });

  let tx;
  let transactionStarted = false;
  try {
    const pool = await getPool();
    tx = new sql.Transaction(pool);
    await tx.begin();
    transactionStarted = true;
    // const request = new sql.Request(tx);

    // 1) Məhsulları DB-dən oxu (price + stock)
    // IN list üçün parametrlər:
    const ids = [...new Set(cleanItems.map((x) => x.productId))];
    const productsRequest = new sql.Request(tx);
    const inParams = ids.map((_, i) => `@p${i}`).join(", ");
    ids.forEach((id, i) => productsRequest.input(`p${i}`, sql.Int, id));

    // UPDLOCK/HOLDLOCK: stock update zamanı yarışın qarşısını alır
    const productsRes = await productsRequest.query(`
      SELECT Id, Name, Price, Stock
      FROM Products WITH (UPDLOCK, HOLDLOCK)
      WHERE Id IN (${inParams});
    `);

    const products = productsRes.recordset || [];
    if (products.length !== ids.length) {
      const e = new Error("Bəzi məhsullar tapılmadı");
      e.status = 400;
      throw e;
    }

    const byId = new Map(products.map((prd) => [Number(prd.Id), prd]));

    // 2) Stock yoxla + subtotal hesabla
    let subtotal = 0;

    for (const item of cleanItems) {
      const prd = byId.get(item.productId);
      const stock = Number(prd?.Stock || 0);
      if (!prd) {
        await tx.rollback();
        return res
          .status(400)
          .json({ message: `Məhsul tapılmadı: ${item.productId}` });
      }

      if (stock < item.qty) {
        const e = new Error(`Məhsul tapılmadı: ${item.productId}`);
        e.status = 400;
        throw e;
      }

      subtotal += Number(prd.Price || 0) * item.qty;
    }

    const total = subtotal + fee;

    // 3) Orders insert (yalnız mövcud sütunlara yazırıq)
    const orderRequest = new sql.Request(tx);
    const orderRes = await orderRequest
      .input("UserId", sql.Int, userId)
      .input("Status", sql.NVarChar(30), "pending")
      .input("ShippingFee", sql.Decimal(18, 2), fee)
      .input("Subtotal", sql.Decimal(18, 2), subtotal)
      .input("Total", sql.Decimal(18, 2), total).query(`
        INSERT INTO Orders (UserId, Status, ShippingFee, Subtotal, Total)
        OUTPUT INSERTED.Id
        VALUES (@UserId, @Status, @ShippingFee, @Subtotal, @Total);
      `);

    const orderId = Number(orderRes.recordset?.[0]?.Id);
    if (!orderId) {
      throw new Error("Order yaradılmadı");
    }

    // 4) OrderItems insert + stock decrement
    for (const item of cleanItems) {
      const prd = byId.get(item.productId);
      const unitPrice = Number(prd.Price || 0);
      const lineTotal = unitPrice * item.qty;

      // insert order item
      const itemRequest = new sql.Request(tx);
      await itemRequest
        .input("OrderId", sql.Int, orderId)
        .input("ProductId", sql.Int, item.productId)
        .input("Qty", sql.Int, item.qty)
        .input("UnitPrice", sql.Decimal(18, 2), unitPrice).query(`
          INSERT INTO OrderItems (OrderId, ProductId, Qty, UnitPrice)
          VALUES (@OrderId, @ProductId, @Qty, @UnitPrice);
        `);

      // decrement stock
      const stockRequest = new sql.Request(tx);
      await stockRequest
        .input("ProdId", sql.Int, item.productId)
        .input("DecQty", sql.Int, item.qty).query(`
          UPDATE Products
          SET Stock = Stock - @DecQty
          WHERE Id = @ProdId;
        `);
    }

    // Commit
    await tx.commit();
    transactionStarted = false;

    return res.status(201).json({
      message: "Order created",
      orderId,
      totals: { subtotal, shippingFee: fee, total },
    });
  } catch (err) {
    try {
      if (tx && transactionStarted) await tx.rollback();
    } catch (rollbackErr) {
      console.error("Error rolling back transaction:", rollbackErr);
    }

    console.error("checkout:", err);
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    const rawDbMessage = err?.originalError?.info?.message || err?.message;
    return res.status(500).json({ message: rawDbMessage || "Server error" });
  }
}

module.exports = { myOrders, getOrderById, listOrders, updateStatus, checkout };
