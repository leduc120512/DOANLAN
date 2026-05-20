const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const User = require("../models/User");
const { sendNewPasswordEmail } = require("../utils/mailer");

function generateTemporaryPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";

  for (let i = 0; i < 10; i += 1) {
    password += alphabet[crypto.randomInt(alphabet.length)];
  }

  return `${password}A1!`;
}

function renderLogin(res, { error = null, success = null } = {}) {
  return res.render("auth/login", {
    title: "Dang nhap",
    error,
    success,
  });
}

// Trang dang nhap
router.get("/login", (req, res) => {
  return renderLogin(res, {
    success:
      req.query.reset === "success"
        ? "Mat khau da duoc cap nhat. Vui long dang nhap lai."
        : null,
  });
});

// Xu ly dang nhap
router.post("/login", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return renderLogin(res, {
        error: "Email va mat khau khong duoc de trong",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return renderLogin(res, {
        error: "Email hoac mat khau khong dung",
      });
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return renderLogin(res, {
        error: "Email hoac mat khau khong dung",
      });
    }

    req.session.user = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    if (user.mustChangePassword) {
      return res.redirect("/user/profile?mustChangePassword=1");
    }

    if (user.role === "admin") {
      return res.redirect("/admin");
    }

    return res.redirect("/");
  } catch (error) {
    return res.status(500).render("error", { message: error.message });
  }
});

// Trang quen mat khau
router.get("/forgot-password", (req, res) => {
  return res.render("auth/forgot-password", {
    title: "Quen mat khau",
    error: null,
    success: null,
    email: "",
  });
});

// Tao mat khau moi va gui qua email
router.post("/forgot-password", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();

  try {
    if (!email) {
      return res.render("auth/forgot-password", {
        title: "Quen mat khau",
        error: "Vui long nhap email",
        success: null,
        email,
      });
    }

    const user = await User.findOne({ email });

    if (user) {
      const temporaryPassword = generateTemporaryPassword();

      user.password = temporaryPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.mustChangePassword = true;
      await user.save();

      await sendNewPasswordEmail({
        to: user.email,
        temporaryPassword,
      });
    }

    return res.render("auth/forgot-password", {
      title: "Quen mat khau",
      error: null,
      success:
        "Neu email ton tai trong he thong, chung toi da tao mat khau moi va gui qua email.",
      email: "",
    });
  } catch (error) {
    console.error(error);
    return res.render("auth/forgot-password", {
      title: "Quen mat khau",
      error:
        "Chua gui duoc email. Kiem tra EMAIL_USER va EMAIL_APP_PASSWORD trong .env.",
      success: null,
      email,
    });
  }
});

// Trang dat lai mat khau
router.get("/reset-password/:token", async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    return res.render("auth/reset-password", {
      title: "Dat lai mat khau",
      error: user
        ? null
        : "Lien ket dat lai mat khau khong hop le hoac da het han.",
      token: req.params.token,
      isInvalid: !user,
    });
  } catch (error) {
    return res.status(500).render("error", { message: error.message });
  }
});

// Xu ly dat lai mat khau
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.render("auth/reset-password", {
        title: "Dat lai mat khau",
        error: "Vui long nhap day du mat khau moi",
        token: req.params.token,
        isInvalid: false,
      });
    }

    if (password.length < 6) {
      return res.render("auth/reset-password", {
        title: "Dat lai mat khau",
        error: "Mat khau moi phai co it nhat 6 ky tu",
        token: req.params.token,
        isInvalid: false,
      });
    }

    if (password !== confirmPassword) {
      return res.render("auth/reset-password", {
        title: "Dat lai mat khau",
        error: "Mat khau xac nhan khong trung khop",
        token: req.params.token,
        isInvalid: false,
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.render("auth/reset-password", {
        title: "Dat lai mat khau",
        error: "Lien ket dat lai mat khau khong hop le hoac da het han.",
        token: req.params.token,
        isInvalid: true,
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.mustChangePassword = false;
    await user.save();

    return res.redirect("/auth/login?reset=success");
  } catch (error) {
    return res.status(500).render("error", { message: error.message });
  }
});

// Trang dang ky
router.get("/register", (req, res) => {
  return res.render("auth/register", {
    title: "Dang ky",
    error: null,
  });
});

// Xu ly dang ky
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, phone, address, password, confirmPassword } =
      req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (
      !fullName ||
      !normalizedEmail ||
      !phone ||
      !address ||
      !password ||
      !confirmPassword
    ) {
      return res.render("auth/register", {
        title: "Dang ky",
        error: "Vui long dien day du thong tin",
        fullName,
        email: normalizedEmail,
        phone,
        address,
      });
    }

    if (password !== confirmPassword) {
      return res.render("auth/register", {
        title: "Dang ky",
        error: "Mat khau xac nhan khong trung khop",
        fullName,
        email: normalizedEmail,
        phone,
        address,
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.render("auth/register", {
        title: "Dang ky",
        error: "Email nay da duoc su dung",
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
      mustChangePassword: user.mustChangePassword,
    };

    return res.redirect("/");
  } catch (error) {
    if (error && error.code === 11000) {
      return res.render("auth/register", {
        title: "Dang ky",
        error: "Email nay da duoc su dung",
        fullName: req.body.fullName,
        email: (req.body.email || "").trim().toLowerCase(),
        phone: req.body.phone,
        address: req.body.address,
      });
    }

    console.error(error);
    return res.status(500).render("error", {
      title: "Loi he thong",
      message: "Co loi xay ra khi dang ky. Vui long thu lai sau.",
    });
  }
});

// Dang xuat
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).render("error", { message: "Loi dang xuat" });
    }

    return res.redirect("/");
  });
});

module.exports = router;
