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

module.exports = { registerUser };