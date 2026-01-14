const router = require("express").Router();
const ctrl = require("../controllers/categories.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// Public
router.get("/", ctrl.listCategories);

// Admin
router.post("/", requireAuth, requireAdmin, ctrl.createCategory);
router.put("/:id", requireAuth, requireAdmin, ctrl.updateCategory);
router.delete("/:id", requireAuth, requireAdmin, ctrl.deleteCategory);

module.exports = router;
