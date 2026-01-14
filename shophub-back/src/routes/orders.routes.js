const router = require("express").Router();
const ctrl = require("../controllers/orders.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// User
router.get("/my", requireAuth, ctrl.myOrders);
router.get("/:id", requireAuth, ctrl.getOrderById);
router.post("/checkout", requireAuth, ctrl.checkout);

// Admin
router.get("/", requireAuth, requireAdmin, ctrl.listOrders);
router.patch("/:id/status", requireAuth, requireAdmin, ctrl.updateStatus);

module.exports = router;
