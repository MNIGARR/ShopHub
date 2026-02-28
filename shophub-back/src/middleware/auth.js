const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const normalizedId = Number(
      payload?.id ?? payload?.Id ?? payload?.userId ?? payload?.sub,
    );

    req.user = {
      ...payload,
      id: Number.isFinite(normalizedId) && normalizedId > 0
        ? normalizedId
        : payload?.id,
      role: String(payload?.role ?? payload?.Role ?? "user"),
      email: payload?.email ?? payload?.Email,
    };

    if (!req.user.id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (String(req.user?.role || "").toLowerCase() !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  return next();
}

module.exports = { requireAuth, requireAdmin };
