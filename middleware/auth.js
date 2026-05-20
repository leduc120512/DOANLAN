// Kiểm tra user đã đăng nhập
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

const requirePasswordChange = (req, res, next) => {
  if (!req.session.user || !req.session.user.mustChangePassword) {
    return next();
  }

  const allowedPaths = [
    "/user/profile",
    "/user/change-password",
    "/auth/logout",
  ];

  if (allowedPaths.includes(req.path)) {
    return next();
  }

  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    return res.status(403).json({
      error: "Vui long doi mat khau moi truoc khi tiep tuc",
      mustChangePassword: true,
    });
  }

  return res.redirect("/user/profile?mustChangePassword=1");
};

// Kiểm tra admin
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }

  // Nếu là request fetch (AJAX)
  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    return res.status(403).json({ error: "Bạn không có quyền truy cập" });
  }

  // Nếu là request bình thường
  return res.status(403).render("error", {
    message: "Bạn không có quyền truy cập",
  });
};
// Kiểm tra user thường
const isUser = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'user') {
    next();
  } else {
    res.status(403).render('error', { message: 'Chỉ người dùng mới có thể truy cập' });
  }
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isUser,
  requirePasswordChange
};
