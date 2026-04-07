const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Comment = require("../models/Comment");
const Coupon = require("../models/Coupon");

function getCartSubtotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

async function validateCouponForSubtotal(rawCode, subtotal) {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) {
    return {
      valid: false,
      message: "Vui lòng nhập mã giảm giá",
    };
  }

  const coupon = await Coupon.findOne({ code, isActive: true });
  if (!coupon) {
    return {
      valid: false,
      message: "Mã giảm giá không tồn tại hoặc đã bị khóa",
    };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return {
      valid: false,
      message: "Mã giảm giá đã hết hạn",
    };
  }

  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return {
      valid: false,
      message: "Mã giảm giá đã hết lượt sử dụng",
    };
  }

  if (subtotal < (coupon.minOrderValue || 0)) {
    return {
      valid: false,
      message: `Đơn hàng tối thiểu ${coupon.minOrderValue.toLocaleString("vi-VN")}₫ để dùng mã này`,
    };
  }

  let discountAmount = 0;
  if (coupon.discountType === "percent") {
    discountAmount = (subtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else {
    discountAmount = coupon.discountValue;
  }

  discountAmount = Math.max(0, Math.min(discountAmount, subtotal));

  return {
    valid: true,
    coupon,
    code,
    discountAmount,
    finalPrice: subtotal - discountAmount,
  };
}

// Checkout
router.get("/checkout", isAuthenticated, async (req, res) => {
  try {
    const cart = req.session.cart || [];

    if (cart.length === 0) {
      return res.redirect("/cart");
    }

    const total = getCartSubtotal(cart);

    res.render("order/checkout", {
      title: "Thanh toán",
      cart,
      total,
      user: req.session.user,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

// Xử lý đơn hàng
router.post("/create", isAuthenticated, async (req, res) => {
  try {
    const cart = req.session.cart || [];

    if (cart.length === 0) {
      return res.status(400).json({ error: "Giỏ hàng trống" });
    }

    const { customerName, customerPhone, customerAddress, couponCode } =
      req.body;

    if (!customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({ error: "Thông tin không đầy đủ" });
    }

    let subtotal = 0;
    const items = [];

    for (const item of cart) {
      const product = await Product.findById(item.productId);
      if (product) {
        items.push({
          product: item.productId,
          quantity: item.quantity,
          price: item.price,
        });
        subtotal += item.price * item.quantity;
      }
    }

    if (items.length === 0) {
      return res
        .status(400)
        .json({ error: "Không có sản phẩm hợp lệ trong giỏ hàng" });
    }

    let discountAmount = 0;
    let appliedCouponCode = null;
    let couponInfo = null;

    if ((couponCode || "").trim()) {
      const couponValidation = await validateCouponForSubtotal(
        couponCode,
        subtotal,
      );
      if (!couponValidation.valid) {
        return res.status(400).json({ error: couponValidation.message });
      }

      discountAmount = couponValidation.discountAmount;
      appliedCouponCode = couponValidation.code;
      couponInfo = {
        discountType: couponValidation.coupon.discountType,
        discountValue: couponValidation.coupon.discountValue,
      };

      couponValidation.coupon.usedCount += 1;
      await couponValidation.coupon.save();
    }

    const totalPrice = Math.max(0, subtotal - discountAmount);

    const order = new Order({
      user: req.session.user.id,
      items,
      totalPrice,
      subtotalPrice: subtotal,
      discountAmount,
      couponCode: appliedCouponCode,
      couponInfo,
      customerName,
      customerPhone,
      customerAddress,
    });

    await order.save();

    req.session.cart = [];

    res.json({ success: true, orderId: order._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/validate-coupon", isAuthenticated, async (req, res) => {
  try {
    const cart = req.session.cart || [];
    if (cart.length === 0) {
      return res.status(400).json({ error: "Giỏ hàng trống" });
    }

    const subtotal = getCartSubtotal(cart);
    const { couponCode } = req.body;
    const result = await validateCouponForSubtotal(couponCode, subtotal);

    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      success: true,
      code: result.code,
      subtotal,
      discountAmount: result.discountAmount,
      finalPrice: result.finalPrice,
      discountType: result.coupon.discountType,
      discountValue: result.coupon.discountValue,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Xem đơn hàng của user
router.get("/my-orders", isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.session.user.id })
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.render("order/my-orders", {
      title: "Đơn hàng của tôi",
      orders,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

// Chi tiết đơn hàng
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product")
      .populate("user");

    if (!order) {
      return res
        .status(404)
        .render("error", { message: "Không tìm thấy đơn hàng" });
    }

    // Kiểm tra quyền
    if (order.user._id.toString() !== req.session.user.id) {
      return res
        .status(403)
        .render("error", { message: "Bạn không có quyền xem đơn hàng này" });
    }

    res.render("order/order-detail", {
      title: "Chi tiết đơn hàng",
      order,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

// Hủy đơn hàng
router.post("/:id/cancel", isAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    if (order.user.toString() !== req.session.user.id) {
      return res.status(403).json({ error: "Bạn không có quyền" });
    }

    if (order.status !== "Pending") {
      return res
        .status(400)
        .json({ error: "Chỉ có thể hủy đơn hàng đang chờ xử lý" });
    }

    order.status = "Cancelled";
    await order.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thêm bình luận (chỉ user đã mua mới có thể)
// Thêm bình luận (chỉ user đã mua mới có thể)
// --------------------- PHẦN QUAN TRỌNG ---------------------

// Định nghĩa route comment phải là thế này (không có /orders/ ở đầu)
router.post("/:productId/comment", isAuthenticated, async (req, res) => {
  console.log("DEBUG: Đã vào route comment POST /order/:productId/comment");
  console.log("Product ID:", req.params.productId);
  console.log("User ID:", req.session.user?.id);
  console.log("Body nhận được:", req.body);

  try {
    const { rating, text } = req.body;
    const productId = req.params.productId;

    if (!rating || !text) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
    }

    const order = await Order.findOne({
      user: req.session.user.id,
      "items.product": productId,
      status: { $ne: "Cancelled" },
    });

    if (!order) {
      return res.status(403).json({
        error:
          "Bạn chỉ có thể bình luận khi đã mua và nhận sản phẩm thành công",
      });
    }

    if (order.status !== "Delivered" && order.status !== "Completed") {
      return res.status(403).json({
        error: "Chỉ có thể đánh giá khi đơn hàng đã giao thành công",
      });
    }

    const comment = new Comment({
      product: productId,
      user: req.session.user.id,
      order: order._id,
      rating: parseInt(rating),
      text,
    });

    await comment.save();

    const comments = await Comment.find({ product: productId });
    const avgRating =
      comments.length > 0
        ? comments.reduce((sum, c) => sum + c.rating, 0) / comments.length
        : 0;

    await Product.findByIdAndUpdate(productId, {
      rating: avgRating,
      reviews: comments.length,
    });

    res.json({ success: true, message: "Đánh giá đã được gửi!" });
  } catch (error) {
    console.error("Lỗi khi xử lý comment:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi gửi đánh giá" });
  }
});

router.post("/:productId/review", isAuthenticated, async (req, res) => {
  req.url = `/${req.params.productId}/comment`;
  return router.handle(req, res, () => {});
});

module.exports = router;
