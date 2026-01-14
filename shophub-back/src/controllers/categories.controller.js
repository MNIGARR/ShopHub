const { getPool, sql } = require("../config/db");

async function listCategories(req, res) {
  try {
    const pool = await getPool();
    const r = await pool.request().query("SELECT Id, Name, CreatedAt FROM Categories ORDER BY Name ASC");
    return res.json({ items: r.recordset });
  } catch (err) {
    console.error("listCategories:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function createCategory(req, res) {
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ message: "Name is required" });

  try {
    const pool = await getPool();

    const exists = await pool.request()
      .input("Name", sql.NVarChar(120), String(name).trim())
      .query("SELECT Id FROM Categories WHERE Name=@Name");

    if (exists.recordset.length) return res.status(409).json({ message: "Category already exists" });

    const r = await pool.request()
      .input("Name", sql.NVarChar(120), String(name).trim())
      .query("INSERT INTO Categories (Name) OUTPUT INSERTED.Id VALUES (@Name)");

    return res.status(201).json({ message: "Created", id: r.recordset[0].Id });
  } catch (err) {
    console.error("createCategory:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function updateCategory(req, res) {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (!id) return res.status(400).json({ message: "Invalid id" });
  if (!name || !String(name).trim()) return res.status(400).json({ message: "Name is required" });

  try {
    const pool = await getPool();

    const r = await pool.request()
      .input("Id", sql.Int, id)
      .input("Name", sql.NVarChar(120), String(name).trim())
      .query(`
        UPDATE Categories SET Name=@Name WHERE Id=@Id;
        SELECT @@ROWCOUNT AS Affected;
      `);

    if (!Number(r.recordset?.[0]?.Affected || 0)) return res.status(404).json({ message: "Category not found" });

    return res.json({ message: "Updated" });
  } catch (err) {
    console.error("updateCategory:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function deleteCategory(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid id" });

  try {
    const pool = await getPool();
    // Qeyd: CategoryId FK var, ona görə istifadə olunursa silməyə icazə verməyə bilər.
    const r = await pool.request()
      .input("Id", sql.Int, id)
      .query(`
        DELETE FROM Categories WHERE Id=@Id;
        SELECT @@ROWCOUNT AS Affected;
      `);

    if (!Number(r.recordset?.[0]?.Affected || 0)) return res.status(404).json({ message: "Category not found" });

    return res.json({ message: "Deleted" });
  } catch (err) {
    // FK error ola bilər
    console.error("deleteCategory:", err);
    return res.status(400).json({ message: "Category silinmədi. Bu kateqoriyada məhsul ola bilər." });
  }
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
