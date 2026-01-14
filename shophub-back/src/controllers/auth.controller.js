const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getPool, sql } = require("../config/db");

async function register(req, res) {
  const { email, password } = req.body;
  if (!email || !password || String(password).length < 6) {
    return res.status(400).json({ message: "Email və minimum 6 simvol şifrə tələb olunur" });
  }

  try {
    const pool = await getPool();

    const exists = await pool.request()
      .input("Email", sql.NVarChar(255), email)
      .query("SELECT Id FROM Users WHERE Email=@Email");

    if (exists.recordset.length) return res.status(409).json({ message: "Bu email artıq mövcuddur" });

    const hash = await bcrypt.hash(password, 10);

    const created = await pool.request()
      .input("Email", sql.NVarChar(255), email)
      .input("PasswordHash", sql.NVarChar(255), hash)
      .query(`
        INSERT INTO Users (Email, PasswordHash, Role)
        OUTPUT INSERTED.Id, INSERTED.Email, INSERTED.Role
        VALUES (@Email, @PasswordHash, 'user')
      `);

    const user = created.recordset[0];
    const token = jwt.sign({ id: user.Id, email: user.Email, role: user.Role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email və şifrə tələb olunur" });

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("Email", sql.NVarChar(255), email)
      .query("SELECT Id, Email, PasswordHash, Role, IsActive FROM Users WHERE Email=@Email");

    const user = result.recordset[0];
    if (!user) return res.status(401).json({ message: "Email/şifrə yalnışdır" });
    if (!user.IsActive) return res.status(403).json({ message: "Hesab bloklanıb" });

    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) return res.status(401).json({ message: "Email/şifrə yalnışdır" });

    await pool.request()
      .input("Id", sql.Int, user.Id)
      .query("UPDATE Users SET LastLoginAt = SYSUTCDATETIME() WHERE Id=@Id");

    const token = jwt.sign({ id: user.Id, email: user.Email, role: user.Role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.json({ token, user: { Id: user.Id, Email: user.Email, Role: user.Role } });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = { register, login, me };
