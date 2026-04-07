const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Trang đăng nhập
router.get("/login", (req, res) => {
  res.render("auth/login", {
    title: "Đăng nhập",
    error: null, // ← thêm dòng này
  });
});

// Xử lý đăng nhập
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render("auth/login", {
        title: "Đăng nhập",
        error: "Email và mật khẩu không được để trống",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.render("auth/login", {
        title: "Đăng nhập",
        error: "Email hoặc mật khẩu không đúng",
      });
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.render("auth/login", {
        title: "Đăng nhập",
        error: "Email hoặc mật khẩu không đúng",
      });
    }

    req.session.user = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
    };

    if (user.role === "admin") {
      res.redirect("/admin");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

// Trang đăng ký
router.get("/register", (req, res) => {
  res.render("auth/register", {
    title: "Đăng ký",
    error: null, // ← thêm dòng này
  });
});

// Xử lý đăng ký
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, phone, address, password, confirmPassword } =
      req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    // Validate
    if (
      !fullName ||
      !normalizedEmail ||
      !phone ||
      !address ||
      !password ||
      !confirmPassword
    ) {
      return res.render("auth/register", {
        title: "Đăng ký",
        error: "Vui lòng điền đầy đủ thông tin",
        fullName,
        email: normalizedEmail,
        phone,
        address, // ← thêm dòng này
      });
    }

    if (password !== confirmPassword) {
      return res.render("auth/register", {
        title: "Đăng ký",
        error: "Mật khẩu xác nhận không trùng khớp",
        fullName,
        email: normalizedEmail,
        phone,
        address, // ← thêm
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.render("auth/register", {
        title: "Đăng ký",
        error: "Email này đã được sử dụng",
        fullName,
        email: normalizedEmail,
        phone,
        address,
      });
    }

    const user = new User({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      address: address.trim(),
      password,
      role: "user",
    });

    await user.save();

    req.session.user = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
    };

    return res.redirect("/");
  } catch (error) {
    if (error && error.code === 11000) {
      return res.render("auth/register", {
        title: "Đăng ký",
        error: "Email này đã được sử dụng",
        fullName: req.body.fullName,
        email: (req.body.email || "").trim().toLowerCase(),
        phone: req.body.phone,
        address: req.body.address,
      });
    }

    console.error(error);
    res.status(500).render("error", {
      title: "Lỗi hệ thống",
      message: "Có lỗi xảy ra khi đăng ký. Vui lòng thử lại sau.",
    });
  }
});
// Đăng xuất
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).render("error", { message: "Lỗi đăng xuất" });
    }
    res.redirect("/");
  });
});

module.exports = router;
