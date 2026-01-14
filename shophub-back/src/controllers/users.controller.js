const { getPool, sql } = require("../config/db");

async function listUsers(req, res) {
  const q = String(req.query.q || "").trim();

  try {
    const pool = await getPool();
    const r = await pool.request()
      .input("Q", sql.NVarChar(300), `%${q}%`)
      .query(`
        SELECT Id, Email, Role, IsActive, CreatedAt, LastLoginAt
        FROM Users
        WHERE (@Q = '%%' OR Email LIKE @Q)
        ORDER BY CreatedAt DESC;
      `);

    return res.json({ items: r.recordset });
  } catch (err) {
    console.error("listUsers:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function setActive(req, res) {
  const id = Number(req.params.id);
  const { isActive } = req.body;

  if (!id) return res.status(400).json({ message: "Invalid id" });

  try {
    const pool = await getPool();
    const r = await pool.request()
      .input("Id", sql.Int, id)
      .input("IsActive", sql.Bit, Boolean(isActive))
      .query(`
        UPDATE Users SET IsActive=@IsActive WHERE Id=@Id;
        SELECT @@ROWCOUNT AS Affected;
      `);

    if (!Number(r.recordset?.[0]?.Affected || 0)) return res.status(404).json({ message: "User not found" });

    return res.json({ message: "Updated" });
  } catch (err) {
    console.error("setActive:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function setRole(req, res) {
  const id = Number(req.params.id);
  const { role } = req.body;

  if (!id) return res.status(400).json({ message: "Invalid id" });
  if (!["user", "admin"].includes(String(role))) return res.status(400).json({ message: "Role must be user/admin" });

  try {
    const pool = await getPool();
    const r = await pool.request()
      .input("Id", sql.Int, id)
      .input("Role", sql.NVarChar(20), role)
      .query(`
        UPDATE Users SET Role=@Role WHERE Id=@Id;
        SELECT @@ROWCOUNT AS Affected;
      `);

    if (!Number(r.recordset?.[0]?.Affected || 0)) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "Updated" });
  } catch (err) {
    console.error("setRole:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { listUsers, setActive, setRole };
