const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => res.json({ ok: true, service: "ShopHub API" }));

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/categories", require("./routes/categories.routes"));
app.use("/api/products", require("./routes/products.routes"));
app.use("/api/orders", require("./routes/orders.routes"));
app.use("/api/users", require("./routes/users.routes"));

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

module.exports = app;
