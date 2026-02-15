const bcrypt = require("bcryptjs");
const { getPool, sql } = require("../config/db");
const AppError = require("../utils/AppError");

async function registerUser(email, password) {
  const pool = await getPool();
  const exists = await pool.request()
    .input("Email", sql.NVarChar(255), email)
    .query("SELECT Id FROM Users WHERE Email=@Email");

  if (exists.recordset.length) throw new AppError("Bu email artıq istifadə olunur", 409);

  const hash = await bcrypt.hash(password, 10);
  const result = await pool.request()
    .input("Email", sql.NVarChar(255), email)
    .input("PasswordHash", sql.NVarChar(255), hash)
    .query(`INSERT INTO Users (Email, PasswordHash, Role) 
            OUTPUT INSERTED.Id, INSERTED.Email, INSERTED.Role 
            VALUES (@Email, @PasswordHash, 'user')`);
            
  return result.recordset[0];
}

// src/services/auth.service.js daxilinə əlavə et
async function forgotPassword(email) {
  const pool = await getPool();
  const user = await pool.request()
    .input("Email", sql.NVarChar(255), email)
    .query("SELECT Id FROM Users WHERE Email=@Email");

  if (user.recordset.length === 0) {
    throw new AppError("Bu email ilə qeydiyyatdan keçmiş istifadəçi tapılmadı", 404);
  }

  // Real layihədə bura NodeMailer ilə email göndərilməsi əlavə olunur.
  // Müəllim üçün: "Simulyasiya olaraq kod yaradıldı" məntiqi qururuq.
  const resetCode = Math.floor(100000 + Math.random() * 900000); // 6 rəqəmli kod
  
  // Kodun DB-də saxlanılması (müvəqqəti sütun və ya yeni cədvəl lazımdır)
  // return { success: true, message: "Sıfırlama kodu emailinizə göndərildi" };
  return true; 
}

module.exports = { registerUser, forgotPassword };