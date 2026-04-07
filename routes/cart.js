const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// Thêm vào giỏ hàng
router.post("/add", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Sản phẩm không tồn tại" });
    }

    if (!req.session.cart) {
      req.session.cart = [];
    }

    const existingItem = req.session.cart.find(
      (item) => item.productId === productId,
    );

    if (existingItem) {
      existingItem.quantity += parseInt(quantity) || 1;
    } else {
      req.session.cart.push({
        productId,
        name: product.name,
        price: product.price,
        image: product.mainImage,
        quantity: parseInt(quantity) || 1,
      });
    }

    res.json({ success: true, cartCount: req.session.cart.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Xem giỏ hàng
router.get("/", async (req, res) => {
  try {
    const cart = req.session.cart || [];
    let total = 0;

    cart.forEach((item) => {
      total += item.price * item.quantity;
    });

    res.render("cart", {
      title: "Giỏ hàng",
      cart,
      total,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

// Cập nhật số lượng
router.post("/update", (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!req.session.cart) {
      return res.status(404).json({ error: "Giỏ hàng trống" });
    }

    const item = req.session.cart.find((item) => item.productId === productId);

    if (item) {
      item.quantity = parseInt(quantity) || 1;

      if (item.quantity <= 0) {
        req.session.cart = req.session.cart.filter(
          (item) => item.productId !== productId,
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Xóa khỏi giỏ hàng
router.post("/remove", (req, res) => {
  try {
    const { productId } = req.body;

    if (req.session.cart) {
      req.session.cart = req.session.cart.filter(
        (item) => item.productId !== productId,
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Làm trống giỏ hàng
router.get("/clear", (req, res) => {
  req.session.cart = [];
  res.redirect("/cart");
});

module.exports = router;
