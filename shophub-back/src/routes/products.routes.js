const router = require("express").Router();
const { requireAuth, requireAdmin } = require("../middleware/auth");
const ctrl = require("../controllers/products.controller");

// Public
router.get("/", ctrl.listProducts);
router.get("/:id", ctrl.getProductById);

// Admin
router.post("/", requireAuth, requireAdmin, ctrl.createProduct);
router.put("/:id", requireAuth, requireAdmin, ctrl.updateProduct);
router.delete("/:id", requireAuth, requireAdmin, ctrl.deleteProduct);

module.exports = router;
