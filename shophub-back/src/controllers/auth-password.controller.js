const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { getPool, sql } = require("../config/db");
const sendEmail = require("../utils/sendEmail"); // implement using nodemailer

const TOKEN_EXPIRY_MINUTES = 60; // 1 hour

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const pool = await getPool();
    const userRes = await pool.request()
      .input("Email", sql.NVarChar(200), String(email).trim())
      .query("SELECT Id, Email FROM Users WHERE Email=@Email");

    const user = userRes.recordset[0];
    if (!user) {
      // Do not reveal whether email exists — send generic success message
      return res.json({ message: "If an account exists, a password reset link has been sent." });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await pool.request()
      .input("UserId", sql.Int, Number(user.Id))
      .input("TokenHash", sql.NVarChar(200), tokenHash)
      .input("ExpiresAt", sql.DateTime2, expiresAt)
      .query(`INSERT INTO PasswordResets (UserId, TokenHash, ExpiresAt) VALUES (@UserId, @TokenHash, @ExpiresAt)`);

    const resetUrl = `${process.env.FRONTEND_BASE_URL || "http://localhost:5173"}/src/pages/auth/reset.html?token=${token}`;

    // send email (implement sendEmail util)
    await sendEmail(user.Email, "ShopHub password reset", `Reset your password: ${resetUrl}`);

    return res.json({ message: "If an account exists, a password reset link has been sent." });
  } catch (err) {
    console.error("forgotPassword:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: "Token and new password are required" });
  if (String(password).length < 6) return res.status(400).json({ message: "Password too short" });

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const pool = await getPool();

    const r = await pool.request()
      .input("TokenHash", sql.NVarChar(200), tokenHash)
      .query(`SELECT TOP 1 Id, UserId, ExpiresAt FROM PasswordResets WHERE TokenHash=@TokenHash ORDER BY CreatedAt DESC`);

    const rec = r.recordset[0];
    if (!rec || new Date(rec.ExpiresAt) < new Date()) {
      return res.status(400).json({ message: "Token invalid or expired" });
    }

    // update user password (hash with bcrypt)
    const hashed = await bcrypt.hash(password, 10);
    await pool.request()
      .input("UserId", sql.Int, rec.UserId)
      .input("PasswordHash", sql.NVarChar(sql.MAX), hashed)
      .query(`UPDATE Users SET PasswordHash=@PasswordHash WHERE Id=@UserId`);

    // delete reset record(s)
    await pool.request().input("UserId", sql.Int, rec.UserId).query("DELETE FROM PasswordResets WHERE UserId=@UserId");

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("resetPassword:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { forgotPassword, resetPassword };