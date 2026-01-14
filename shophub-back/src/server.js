require("dotenv").config();
const app = require("./app");
const { getPool } = require("./config/db");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await getPool();
    console.log("✅ MSSQL connected");

    app.listen(PORT, () => {
      console.log(`✅ API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
})();
