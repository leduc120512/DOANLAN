const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const Notification = require("../models/Notification");

// Trang profile
router.get("/profile", isAuthenticated, (req, res) => {
  res.render("user/profile", {
    title: "Thông tin cá nhân",
    user: req.session.user,
  });
});

router.get("/notifications", isAuthenticated, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.render("user/notifications", {
      title: "Thông báo của tôi",
      notifications,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

router.get("/notifications/realtime", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const baseFilter = { user: userId };
    const unreadCount = await Notification.countDocuments({
      ...baseFilter,
      isRead: false,
    });

    const latestNotifications = await Notification.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    const { after } = req.query;
    let newNotifications = [];

    if (after) {
      const parsedAfter = new Date(after);
      if (!Number.isNaN(parsedAfter.getTime())) {
        newNotifications = await Notification.find({
          ...baseFilter,
          createdAt: { $gt: parsedAfter },
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
      }
    }

    return res.json({
      success: true,
      unreadCount,
      latestNotifications,
      newNotifications,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/notifications/:id/read", isAuthenticated, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.session.user.id },
      { $set: { isRead: true } },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ error: "Không tìm thấy thông báo" });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/notifications/read-all", isAuthenticated, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.session.user.id, isRead: false },
      { $set: { isRead: true } },
    );

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Cập nhật profile
router.post("/profile/update", isAuthenticated, async (req, res) => {
  try {
    const { fullName, phone, address } = req.body;

    if (!fullName || !phone || !address) {
      return res.status(400).json({ error: "Thông tin không đầy đủ" });
    }

    const user = await User.findByIdAndUpdate(
      req.session.user.id,
      { fullName, phone, address },
      { new: true },
    );

    req.session.user.fullName = user.fullName;
    req.session.user.phone = user.phone;
    req.session.user.address = user.address;

    res.json({ success: true, user: req.session.user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Đổi mật khẩu
router.post("/change-password", isAuthenticated, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "Thông tin không đầy đủ" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Mật khẩu mới không trùng khớp" });
    }

    const user = await User.findById(req.session.user.id);
    const isPasswordMatch = await user.comparePassword(oldPassword);

    if (!isPasswordMatch) {
      return res.status(400).json({ error: "Mật khẩu cũ không đúng" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
