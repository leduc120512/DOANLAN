const express = require("express");
const router = express.Router();
const { isAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const Banner = require("../models/Banner");
const Coupon = require("../models/Coupon");

// Dashboard admin
router.get("/", isAdmin, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalCategories = await Category.countDocuments();
    const totalBanners = await Banner.countDocuments();
    const totalCoupons = await Coupon.countDocuments();
    const totalRevenue = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      stats: {
        totalProducts,
        totalOrders,
        totalCategories,
        totalBanners,
        totalCoupons,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

// ========== QUẢN LÝ SẢN PHẨM ==========

// Danh sách sản phẩm
router.get("/products", isAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const products = await Product.find(filter)
      .populate("category")
      .sort({ createdAt: -1 });
    const categories = await Category.find();

    res.render("admin/products/list", {
      title: "Quản lý sản phẩm",
      products,
      categories,
      search: search || "",
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

// Trang thêm sản phẩm
router.get("/products/add", isAdmin, async (req, res) => {
  const categories = await Category.find();
  res.render("admin/products/add", { categories });
});

// Xử lý thêm sản phẩm
router.post(
  "/products/add",
  isAdmin,
  upload.array("images", 8),
  async (req, res) => {
    const { name, description, price, category, stock } = req.body;
    const uploadedImages = Array.isArray(req.files)
      ? req.files.map((file) => "/uploads/" + file.filename)
      : [];

    const product = new Product({
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock),
      images: uploadedImages,
      image: uploadedImages[0] || null,
    });

    await product.save();

    // redirect kèm thông báo
    res.redirect("/admin/products?success=add");
  },
);

// ================= EDIT PAGE =================
router.get("/products/:id/edit", isAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id);
  const categories = await Category.find();

  if (!product) {
    return res
      .status(404)
      .render("error", { message: "Không tìm thấy sản phẩm" });
  }

  res.render("admin/products/edit", { product, categories });
});

// Xử lý sửa sản phẩm
router.post(
  "/products/:id/edit",
  isAdmin,
  upload.array("images", 8),
  async (req, res) => {
    const { name, description, price, category, stock } = req.body;
    const uploadedImages = Array.isArray(req.files)
      ? req.files.map((file) => "/uploads/" + file.filename)
      : [];

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .render("error", { message: "Không tìm thấy sản phẩm" });
    }

    const existingImages =
      Array.isArray(product.images) && product.images.length > 0
        ? [...product.images]
        : product.image
          ? [product.image]
          : [];
    const mergedImages = existingImages.concat(uploadedImages);

    const updateData = {
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock),
      images: mergedImages,
      image: mergedImages[0] || null,
    };

    await Product.findByIdAndUpdate(req.params.id, updateData);

    res.redirect("/admin/products?success=edit");
  },
);

router.post("/products/:id/images/delete", isAdmin, async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "Thiếu ảnh cần xóa" });
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
  }

  const currentImages =
    Array.isArray(product.images) && product.images.length > 0
      ? [...product.images]
      : product.image
        ? [product.image]
        : [];

  const filteredImages = currentImages.filter((img) => img !== imageUrl);

  product.images = filteredImages;
  product.image = filteredImages[0] || null;
  await product.save();

  res.json({ success: true, images: filteredImages });
});
// ================= DELETE =================
router.post("/products/:id/delete", isAdmin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);

  res.redirect("/admin/products?success=delete");
});
// ========== QUẢN LÝ DANH MỤC ==========

// Danh sách danh mục
router.get("/categories", isAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const categories = await Category.find(filter).sort({ createdAt: -1 });

    res.render("admin/categories/list", {
      title: "Quản lý danh mục",
      categories,
      search: search || "",
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

// Thêm danh mục
router.post(
  "/categories/add",
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res
          .status(400)
          .json({ error: "Tên danh mục không được để trống" });
      }

      const category = new Category({
        name,
        description,
        image: req.file ? "/uploads/" + req.file.filename : null,
      });
      await category.save();

      res.json({ success: true, category });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Sửa danh mục
router.post(
  "/categories/:id/edit",
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res
          .status(400)
          .json({ error: "Tên danh mục không được để trống" });
      }

      const updateData = { name, description };
      if (req.file) {
        updateData.image = "/uploads/" + req.file.filename;
      }

      const category = await Category.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
        },
      );

      res.json({ success: true, category });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Xóa danh mục
router.post("/categories/:id/delete", isAdmin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== QUẢN LÝ ĐƠN HÀNG ==========

// Danh sách đơn hàng
router.get("/orders", isAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;
    let filter = {};

    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("user", "fullName email")
      .populate("items.product", "name price")
      .sort({ createdAt: -1 });

    res.render("admin/orders/list", {
      title: "Quản lý đơn hàng",
      orders,
      search: search || "",
      selectedStatus: status || "all",
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

// Chi tiết đơn hàng
router.get("/orders/:id", isAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user")
      .populate("items.product");

    if (!order) {
      return res
        .status(404)
        .render("error", { message: "Không tìm thấy đơn hàng" });
    }

    res.render("admin/orders/detail", {
      title: "Chi tiết đơn hàng",
      order,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

// Cập nhật trạng thái đơn hàng
router.post("/orders/:id/status", isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true },
    );

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== QUẢN LÝ BANNER ==========
router.get("/banners", isAdmin, async (req, res) => {
  try {
    const banners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 });
    res.render("admin/banners/list", {
      title: "Quản lý banner",
      banners,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

router.post(
  "/banners/add",
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, subtitle, link, sortOrder } = req.body;

      if (!title || !req.file) {
        return res
          .status(400)
          .json({ error: "Cần nhập tiêu đề và chọn ảnh banner" });
      }

      const banner = new Banner({
        title: title.trim(),
        subtitle: (subtitle || "").trim(),
        link: (link || "/search").trim(),
        sortOrder: Number(sortOrder) || 0,
        image: "/uploads/" + req.file.filename,
        isActive: true,
      });

      await banner.save();
      res.json({ success: true, banner });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/banners/:id/edit",
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, subtitle, link, sortOrder, isActive } = req.body;
      const updateData = {
        title: (title || "").trim(),
        subtitle: (subtitle || "").trim(),
        link: (link || "/search").trim(),
        sortOrder: Number(sortOrder) || 0,
        isActive: isActive === "true" || isActive === true || isActive === "on",
      };

      if (!updateData.title) {
        return res
          .status(400)
          .json({ error: "Tiêu đề banner không được để trống" });
      }

      if (req.file) {
        updateData.image = "/uploads/" + req.file.filename;
      }

      const banner = await Banner.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
      });

      res.json({ success: true, banner });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post("/banners/:id/toggle", isAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ error: "Không tìm thấy banner" });
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    res.json({ success: true, isActive: banner.isActive });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/banners/:id/delete", isAdmin, async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== QUẢN LÝ MÃ GIẢM GIÁ ==========
router.get("/coupons", isAdmin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.render("admin/coupons/list", {
      title: "Quản lý mã giảm giá",
      coupons,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

router.post("/coupons/add", isAdmin, async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      usageLimit,
      expiresAt,
      isActive,
    } = req.body;

    const normalizedCode = (code || "").trim().toUpperCase();
    if (!normalizedCode) {
      return res.status(400).json({ error: "Mã giảm giá không được để trống" });
    }

    if (!["percent", "fixed"].includes(discountType)) {
      return res.status(400).json({ error: "Loại giảm giá không hợp lệ" });
    }

    const coupon = new Coupon({
      code: normalizedCode,
      description: (description || "").trim(),
      discountType,
      discountValue: Number(discountValue) || 0,
      minOrderValue: Number(minOrderValue) || 0,
      maxDiscount: Number(maxDiscount) || 0,
      usageLimit: Number(usageLimit) || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive === "true" || isActive === true || isActive === "on",
    });

    await coupon.save();
    res.json({ success: true, coupon });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({ error: "Mã giảm giá đã tồn tại" });
    }

    res.status(500).json({ error: error.message });
  }
});

router.post("/coupons/:id/edit", isAdmin, async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      usageLimit,
      expiresAt,
      isActive,
    } = req.body;

    const normalizedCode = (code || "").trim().toUpperCase();
    if (!normalizedCode) {
      return res.status(400).json({ error: "Mã giảm giá không được để trống" });
    }

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      {
        code: normalizedCode,
        description: (description || "").trim(),
        discountType,
        discountValue: Number(discountValue) || 0,
        minOrderValue: Number(minOrderValue) || 0,
        maxDiscount: Number(maxDiscount) || 0,
        usageLimit: Number(usageLimit) || 0,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive === "true" || isActive === true || isActive === "on",
      },
      { new: true },
    );

    res.json({ success: true, coupon });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({ error: "Mã giảm giá đã tồn tại" });
    }

    res.status(500).json({ error: error.message });
  }
});

router.post("/coupons/:id/toggle", isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ error: "Không tìm thấy mã giảm giá" });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({ success: true, isActive: coupon.isActive });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/coupons/:id/delete", isAdmin, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
