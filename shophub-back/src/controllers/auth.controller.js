const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { getPool, sql } = require("../config/db");
const sendEmail = require("../utils/sendEmail");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
  const { email, password } = req.body;

  // Validation
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: "Düzgün email formatı tələb olunur" });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ message: "Şifrə minimum 6 simvol olmalıdır" });
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
    const token = jwt.sign(
      { id: user.Id, email: user.Email, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: "Düzgün email formatı tələb olunur" });
  }
  if (!password) return res.status(400).json({ message: "Şifrə tələb olunur" });

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("Email", sql.NVarChar(255), email)
      .query("SELECT Id, Email, PasswordHash, Role, IsActive FROM Users WHERE Email=@Email");

    const user = result.recordset[0];
    if (!user) return res.status(401).json({ message: "Email və ya şifrə yanlışdır" });
    if (!user.IsActive) return res.status(403).json({ message: "Hesab bloklanıb" });

    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) return res.status(401).json({ message: "Email və ya şifrə yanlışdır" });

    await pool.request()
      .input("Id", sql.Int, user.Id)
      .query("UPDATE Users SET LastLoginAt = SYSUTCDATETIME() WHERE Id=@Id");

    const token = jwt.sign(
      { id: user.Id, email: user.Email, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token, user: { Id: user.Id, Email: user.Email, Role: user.Role } });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function me(req, res) {
  return res.json({ user: req.user });
}

// Forgot Password — generates a 6-digit code and stores it in ResetCode + ResetCodeExpiry columns
async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: "Düzgün email formatı tələb olunur" });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("Email", sql.NVarChar(255), email)
      .query("SELECT Id FROM Users WHERE Email=@Email");

    if (!result.recordset.length) {
      // Security: email exists/exist-not məlumatını açıqlamırıq
      return res.json({ message: "Əgər hesab mövcuddursa, sıfırlama kodu göndərildi" });
    }

    const userId = result.recordset[0].Id;

    // Generate 6-digit code
    const resetCode = String(crypto.randomInt(100000, 999999));

    // Default: 1:50 (110 sec), env ilə dəyişə bilərsiniz
    const ttlSeconds = Number(process.env.RESET_CODE_TTL_SECONDS || 110);
    const expiry = new Date(Date.now() + ttlSeconds * 1000);

    await pool.request()
      .input("Id", sql.Int, userId)
      .input("ResetCode", sql.NVarChar(10), resetCode)
      .input("ResetCodeExpiry", sql.DateTime, expiry)
      .query("UPDATE Users SET ResetCode=@ResetCode, ResetCodeExpiry=@ResetCodeExpiry WHERE Id=@Id");

    const minutes = Math.floor(ttlSeconds / 60);
    const seconds = String(ttlSeconds % 60).padStart(2, "0");

    await sendEmail(
      email,
      "ShopHub - Şifrə sıfırlama kodu",
      `Sizin kodunuz: ${resetCode}. Kod ${minutes}:${seconds} ərzində etibarlıdır.`,
    );
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] Reset code for ${email}: ${resetCode} (ttl ${minutes}:${seconds})`);
    }

   return res.json({
      message: "Sıfırlama kodu e-poçtunuza göndərildi",
      expiresInSeconds: ttlSeconds,
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// Reset Password — verifies code and sets new password
async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: "Düzgün email formatı tələb olunur" });
  }
  if (!code || String(code).length !== 6) {
    return res.status(400).json({ message: "Sıfırlama kodu 6 rəqəm olmalıdır" });
  }
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ message: "Yeni şifrə minimum 6 simvol olmalıdır" });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("Email", sql.NVarChar(255), email)
      .query("SELECT Id, ResetCode, ResetCodeExpiry FROM Users WHERE Email=@Email");

    const user = result.recordset[0];
    if (!user) return res.status(404).json({ message: "İstifadəçi tapılmadı" });

    // Verify code
    if (user.ResetCode !== String(code)) {
      return res.status(400).json({ message: "Sıfırlama kodu yanlışdır" });
    }

    // Check expiry
    if (!user.ResetCodeExpiry || new Date(user.ResetCodeExpiry) < new Date()) {
      return res.status(400).json({ message: "Sıfırlama kodunun vaxtı bitib. Yenidən cəhd edin." });
    }

    // Hash new password and clear reset code
    const hash = await bcrypt.hash(String(newPassword), 10);

    await pool.request()
      .input("Id", sql.Int, user.Id)
      .input("PasswordHash", sql.NVarChar(255), hash)
      .query("UPDATE Users SET PasswordHash=@PasswordHash, ResetCode=NULL, ResetCodeExpiry=NULL WHERE Id=@Id");

    return res.json({ message: "Şifrəniz uğurla yeniləndi" });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { register, login, me, forgotPassword, resetPassword };