const { getPool, sql } = require("../config/db");

/**
 * GET /api/products
 * Query params:
 *  - q (search)
 *  - categoryId
 *  - brand
 *  - color
 *  - inStock (true/false)
 *  - minPrice, maxPrice
 *  - sort (featured|price_asc|price_desc|newest|rating_desc)
 *  - page, pageSize
 */
async function listProducts(req, res) {
  const {
    q = "",
    categoryId,
    brand,
    color,
    inStock,
    minPrice,
    maxPrice,
    sort = "featured",
    page = "1",
    pageSize = "12"
  } = req.query;

  const p = Math.max(1, Number(page) || 1);
  const ps = Math.min(50, Math.max(1, Number(pageSize) || 12));
  const offset = (p - 1) * ps;

  const where = ["p.IsActive = 1"];
  const params = [];

  if (q.trim()) {
    where.push("(p.Name LIKE @Q OR p.Description LIKE @Q OR p.Brand LIKE @Q)");
    params.push({ name: "Q", type: sql.NVarChar(300), value: `%${q.trim()}%` });
  }

  if (categoryId) {
    where.push("p.CategoryId = @CategoryId");
    params.push({ name: "CategoryId", type: sql.Int, value: Number(categoryId) });
  }

  if (brand) {
    where.push("p.Brand = @Brand");
    params.push({ name: "Brand", type: sql.NVarChar(120), value: String(brand) });
  }

  if (color) {
    where.push("p.Color = @Color");
    params.push({ name: "Color", type: sql.NVarChar(60), value: String(color) });
  }

  if (String(inStock).toLowerCase() === "true") {
    where.push("p.Stock > 0");
  }

  if (minPrice) {
    where.push("p.Price >= @MinPrice");
    params.push({ name: "MinPrice", type: sql.Decimal(18, 2), value: Number(minPrice) });
  }

  if (maxPrice) {
    where.push("p.Price <= @MaxPrice");
    params.push({ name: "MaxPrice", type: sql.Decimal(18, 2), value: Number(maxPrice) });
  }

  const orderBy = (() => {
    switch (sort) {
      case "price_asc": return "p.Price ASC";
      case "price_desc": return "p.Price DESC";
      case "newest": return "p.CreatedAt DESC";
      case "rating_desc": return "p.RatingAvg DESC, p.ReviewsCount DESC";
      case "featured":
      default:
        // "featured" sütunu yoxdur deyə: yüksək reytinq + yenilik
        return "p.RatingAvg DESC, p.CreatedAt DESC";
    }
  })();

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const pool = await getPool();

    // Total count
    const countReq = pool.request();
    for (const prm of params) countReq.input(prm.name, prm.type, prm.value);

    const countResult = await countReq.query(`
      SELECT COUNT(*) AS Total
      FROM Products p
      ${whereSql};
    `);

    const total = Number(countResult.recordset[0]?.Total || 0);

    // Data page
    const dataReq = pool.request();
    for (const prm of params) dataReq.input(prm.name, prm.type, prm.value);
    dataReq.input("Offset", sql.Int, offset);
    dataReq.input("PageSize", sql.Int, ps);

    const dataResult = await dataReq.query(`
      SELECT
        p.Id, p.Name, p.Price, p.DiscountPercent, p.Brand, p.Color, p.Stock,
        p.CategoryId, c.Name AS CategoryName,
        p.Description, p.RatingAvg, p.ReviewsCount, p.CreatedAt
      FROM Products p
      LEFT JOIN Categories c ON c.Id = p.CategoryId
      ${whereSql}
      ORDER BY ${orderBy}
      OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
    `);

    // Attach first image for listing (thumbnail)
    const ids = dataResult.recordset.map(r => r.Id);
    let imagesByProduct = {};
    if (ids.length) {
      
      const imgReq = pool.request();

      const placeholders = ids.map((_, i) => `@id${i}`).join(",");
      ids.forEach((id, i) => imgReq.input(`id${i}`, sql.Int, id));

      const imgRes = await imgReq.query(`
        SELECT ProductId, Url, SortOrder
        FROM ProductImages
        WHERE ProductId IN (${placeholders})
        ORDER BY ProductId, SortOrder ASC, Id ASC;
      `);


      for (const row of imgRes.recordset) {
        if (!imagesByProduct[row.ProductId]) imagesByProduct[row.ProductId] = [];
        imagesByProduct[row.ProductId].push({ url: row.Url, sortOrder: row.SortOrder });
      }
    }

    const items = dataResult.recordset.map(r => ({
      ...r,
      Images: imagesByProduct[r.Id] || []
    }));

    return res.json({
      page: p,
      pageSize: ps,
      total,
      totalPages: Math.ceil(total / ps),
      items
    });
  } catch (err) {
    console.error("listProducts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * GET /api/products/:id
 */
async function getProductById(req, res) {
  const id = Number(req.params.id);

  if (!id) return res.status(400).json({ message: "Invalid id" });

  try {
    const pool = await getPool();

    const prodRes = await pool.request()
      .input("Id", sql.Int, id)
      .query(`
        SELECT
          p.Id, p.Name, p.Description, p.Price, p.DiscountPercent, p.Brand, p.Color,
          p.Stock, p.CategoryId, c.Name AS CategoryName,
          p.RatingAvg, p.ReviewsCount, p.IsActive, p.CreatedAt
        FROM Products p
        LEFT JOIN Categories c ON c.Id = p.CategoryId
        WHERE p.Id=@Id AND p.IsActive=1;
      `);

    const product = prodRes.recordset[0];
    if (!product) return res.status(404).json({ message: "Product not found" });

    const imgRes = await pool.request()
      .input("ProductId", sql.Int, id)
      .query(`
        SELECT Id, Url, SortOrder
        FROM ProductImages
        WHERE ProductId=@ProductId
        ORDER BY SortOrder ASC, Id ASC;
      `);

    product.Images = imgRes.recordset;

    return res.json({ product });
  } catch (err) {
    console.error("getProductById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/products  (admin)
 * body:
 *  { name, description, price, discountPercent, brand, color, stock, categoryId, images: [url1,url2...] }
 */
async function createProduct(req, res) {
  const {
    name,
    description = null,
    price,
    discountPercent = 0,
    brand = null,
    color = null,
    stock = 0,
    categoryId = null,
    images = []
  } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ message: "Name is required" });
  }

  const pr = Number(price);
  if (!Number.isFinite(pr) || pr < 0) {
    return res.status(400).json({ message: "Invalid price" });
  }

  const disc = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  const st = Math.max(0, Number(stock) || 0);

  try {
    const pool = await getPool();
    const tx = new sql.Transaction(pool);

    await tx.begin();

    const insertProdReq = new sql.Request(tx);
    insertProdReq.input("Name", sql.NVarChar(200), name);
    insertProdReq.input("Description", sql.NVarChar(sql.MAX), description);
    insertProdReq.input("Price", sql.Decimal(18, 2), pr);
    insertProdReq.input("DiscountPercent", sql.Int, disc);
    insertProdReq.input("Brand", sql.NVarChar(120), brand);
    insertProdReq.input("Color", sql.NVarChar(60), color);
    insertProdReq.input("Stock", sql.Int, st);
    insertProdReq.input("CategoryId", sql.Int, categoryId ? Number(categoryId) : null);

    const inserted = await insertProdReq.query(`
      INSERT INTO Products (Name, Description, Price, DiscountPercent, Brand, Color, Stock, CategoryId)
      OUTPUT INSERTED.Id
      VALUES (@Name, @Description, @Price, @DiscountPercent, @Brand, @Color, @Stock, @CategoryId);
    `);

    const productId = inserted.recordset[0].Id;

    if (Array.isArray(images) && images.length) {
      for (let i = 0; i < images.length; i++) {
        const url = String(images[i] || "").trim();
        if (!url) continue;

        const imgReq = new sql.Request(tx);
        imgReq.input("ProductId", sql.Int, productId);
        imgReq.input("Url", sql.NVarChar(500), url);
        imgReq.input("SortOrder", sql.Int, i);

        await imgReq.query(`
          INSERT INTO ProductImages (ProductId, Url, SortOrder)
          VALUES (@ProductId, @Url, @SortOrder);
        `);
      }
    }

    await tx.commit();

    return res.status(201).json({ message: "Created", productId });
  } catch (err) {
    console.error("createProduct error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * PUT /api/products/:id (admin)
 * body: same as create (all optional), images replace strategy (optional)
 *  - if images provided => delete old and insert new
 */
async function updateProduct(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid id" });

  const {
    name,
    description,
    price,
    discountPercent,
    brand,
    color,
    stock,
    categoryId,
    images // optional
  } = req.body;

  try {
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    // Check exists
    const exists = await new sql.Request(tx)
      .input("Id", sql.Int, id)
      .query("SELECT Id FROM Products WHERE Id=@Id AND IsActive=1");

    if (!exists.recordset.length) {
      await tx.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    const fields = [];
    const reqU = new sql.Request(tx);

    reqU.input("Id", sql.Int, id);

    if (name !== undefined) {
      fields.push("Name=@Name");
      reqU.input("Name", sql.NVarChar(200), String(name));
    }
    if (description !== undefined) {
      fields.push("Description=@Description");
      reqU.input("Description", sql.NVarChar(sql.MAX), description);
    }
    if (price !== undefined) {
      const pr = Number(price);
      if (!Number.isFinite(pr) || pr < 0) {
        await tx.rollback();
        return res.status(400).json({ message: "Invalid price" });
      }
      fields.push("Price=@Price");
      reqU.input("Price", sql.Decimal(18, 2), pr);
    }
    if (discountPercent !== undefined) {
      const disc = Math.max(0, Math.min(100, Number(discountPercent) || 0));
      fields.push("DiscountPercent=@DiscountPercent");
      reqU.input("DiscountPercent", sql.Int, disc);
    }
    if (brand !== undefined) {
      fields.push("Brand=@Brand");
      reqU.input("Brand", sql.NVarChar(120), brand);
    }
    if (color !== undefined) {
      fields.push("Color=@Color");
      reqU.input("Color", sql.NVarChar(60), color);
    }
    if (stock !== undefined) {
      const st = Math.max(0, Number(stock) || 0);
      fields.push("Stock=@Stock");
      reqU.input("Stock", sql.Int, st);
    }
    if (categoryId !== undefined) {
      fields.push("CategoryId=@CategoryId");
      reqU.input("CategoryId", sql.Int, categoryId ? Number(categoryId) : null);
    }

    if (fields.length) {
      await reqU.query(`
        UPDATE Products
        SET ${fields.join(", ")}
        WHERE Id=@Id;
      `);
    }

    // Images replace if provided
    if (images !== undefined) {
      await new sql.Request(tx)
        .input("ProductId", sql.Int, id)
        .query("DELETE FROM ProductImages WHERE ProductId=@ProductId");

      if (Array.isArray(images) && images.length) {
        for (let i = 0; i < images.length; i++) {
          const url = String(images[i] || "").trim();
          if (!url) continue;

          const imgReq = new sql.Request(tx);
          imgReq.input("ProductId", sql.Int, id);
          imgReq.input("Url", sql.NVarChar(500), url);
          imgReq.input("SortOrder", sql.Int, i);

          await imgReq.query(`
            INSERT INTO ProductImages (ProductId, Url, SortOrder)
            VALUES (@ProductId, @Url, @SortOrder);
          `);
        }
      }
    }

    await tx.commit();
    return res.json({ message: "Updated" });
  } catch (err) {
    console.error("updateProduct error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * DELETE /api/products/:id (admin)
 * Soft delete: IsActive=0
 */
async function deleteProduct(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid id" });

  try {
    const pool = await getPool();

    const r = await pool.request()
      .input("Id", sql.Int, id)
      .query(`
        UPDATE Products SET IsActive=0
        WHERE Id=@Id AND IsActive=1;

        SELECT @@ROWCOUNT AS Affected;
      `);

    const affected = Number(r.recordset?.[0]?.Affected || 0);
    if (!affected) return res.status(404).json({ message: "Product not found" });

    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteProduct error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
