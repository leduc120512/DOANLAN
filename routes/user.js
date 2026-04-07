const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const User = require('../models/User');

// Trang profile
router.get('/profile', isAuthenticated, (req, res) => {
  res.render('user/profile', {
    title: 'Thông tin cá nhân',
    user: req.session.user
  });
});

// Cập nhật profile
router.post('/profile/update', isAuthenticated, async (req, res) => {
  try {
    const { fullName, phone, address } = req.body;
    
    if (!fullName || !phone || !address) {
      return res.status(400).json({ error: 'Thông tin không đầy đủ' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.session.user.id,
      { fullName, phone, address },
      { new: true }
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
router.post('/change-password', isAuthenticated, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Thông tin không đầy đủ' });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Mật khẩu mới không trùng khớp' });
    }
    
    const user = await User.findById(req.session.user.id);
    const isPasswordMatch = await user.comparePassword(oldPassword);
    
    if (!isPasswordMatch) {
      return res.status(400).json({ error: 'Mật khẩu cũ không đúng' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
