const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/error"); 

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    },
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) =>
  res.json({ service: "ShopHub API", api: "/api", health: "/health" })
);
app.get("/health", (req, res) => res.json({ ok: true, service: "ShopHub API" }));

// Route-lar
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/categories", require("./routes/categories.routes"));
app.use("/api/products", require("./routes/products.routes"));
app.use("/api/orders", require("./routes/orders.routes"));
app.use("/api/users", require("./routes/users.routes"));

// 404 Handler (Heç bir route tapılmadıqda)
app.use((req, res, next) => {
    const error = new Error(`${req.originalUrl} tapılmadı`);
    error.statusCode = 404;
    next(error); 
});

// Global Error Middleware (Həmişə ən sonda olmalıdır)
app.use(errorHandler); 

module.exports = app;
