const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth");

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.get("/me", requireAuth, ctrl.me);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);

// Yeni: sadə reset (email + newPassword) — yalnız dev/quraşdırma icazəsi olduqda aktiv
router.post("/reset-password-simple", ctrl.resetPasswordSimple);

module.exports = router;