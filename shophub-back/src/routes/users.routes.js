const router = require("express").Router();
const ctrl = require("../controllers/users.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.get("/", requireAuth, requireAdmin, ctrl.listUsers);
router.patch("/:id/active", requireAuth, requireAdmin, ctrl.setActive);
router.patch("/:id/role", requireAuth, requireAdmin, ctrl.setRole);

module.exports = router;
