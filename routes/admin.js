const express = require("express");
const router = express.Router();
const { isAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const Coupon = require("../models/Coupon");
const ProductReport = require("../models/ProductReport");
const Notification = require("../models/Notification");

function getUploadErrorMessage(error) {
  if (!error) {
    return "Upload thất bại";
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return "Mỗi ảnh tối đa 5MB";
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return "Tối đa 8 ảnh cho mỗi sản phẩm";
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return "Tên field upload không hợp lệ hoặc vượt quá số ảnh cho phép";
  }

  return error.message || "Upload thất bại";
}

function logUploadRequest(req) {
  console.error("[UPLOAD_DEBUG] request", {
    method: req.method,
    url: req.originalUrl,
    contentType: req.headers["content-type"] || null,
    contentLength: req.headers["content-length"] || null,
    bodyKeys: req.body ? Object.keys(req.body) : [],
  });
}

function logUploadError(req, error) {
  console.error("[UPLOAD_DEBUG] error", {
    method: req.method,
    url: req.originalUrl,
    code: error?.code || null,
    field: error?.field || null,
    message: error?.message || null,
    stack: error?.stack || null,
  });
}

function getOrderStatusNotification(status, orderId) {
  const shortOrderId = String(orderId || "")
    .slice(-8)
    .toUpperCase();

  if (status === "Processing") {
    return {
      title: "Đơn hàng đã được duyệt",
      message: `Đơn #${shortOrderId} đã được shop xác nhận và chuẩn bị giao.`,
    };
  }

  if (status === "Shipped") {
    return {
      title: "Đơn hàng đang được vận chuyển",
      message: `Đơn #${shortOrderId} đang trên đường giao đến bạn.`,
    };
  }

  if (status === "Delivered") {
    return {
      title: "Đơn hàng giao thành công",
      message: `Đơn #${shortOrderId} đã giao thành công. Cảm ơn bạn đã mua hàng.`,
    };
  }

  if (status === "Cancelled") {
    return {
      title: "Đơn hàng đã bị hủy",
      message: `Đơn #${shortOrderId} đã bị hủy. Nếu cần hỗ trợ, vui lòng liên hệ shop.`,
    };
  }

  return null;
}

function getRecentMonths(count) {
  const months = [];
  const now = new Date();

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    months.push({
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: `${String(month).padStart(2, "0")}/${year}`,
      year,
      month,
      startDate: date,
    });
  }

  return months;
}

// Dashboard admin
router.get("/", isAdmin, async (req, res) => {
  try {
    const recentMonths = getRecentMonths(6);
    const chartStartDate = recentMonths[0].startDate;
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalCategories = await Category.countDocuments();
    const totalCoupons = await Coupon.countDocuments();
    const totalReports = await ProductReport.countDocuments();
    const totalRevenue = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);
    const monthlyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: chartStartDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Delivered"] },
                "$totalPrice",
                0,
              ],
            },
          },
        },
      },
    ]);
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const monthlyMap = monthlyOrders.reduce((result, item) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
      result[key] = item;
      return result;
    }, {});
    const statusMap = ordersByStatus.reduce((result, item) => {
      result[item._id] = item.count;
      return result;
    }, {});

    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      stats: {
        totalProducts,
        totalOrders,
        totalCategories,
        totalCoupons,
        totalReports,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
      chartData: {
        months: recentMonths.map((month) => month.label),
        orderCounts: recentMonths.map(
          (month) => monthlyMap[month.key]?.orders || 0,
        ),
        revenue: recentMonths.map(
          (month) => monthlyMap[month.key]?.revenue || 0,
        ),
        statusLabels: [
          "Pending",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancelled",
        ],
        statusCounts: [
          "Pending",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancelled",
        ].map((status) => statusMap[status] || 0),
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
  res.render("admin/products/add", { categories, error: null });
});

// Xử lý thêm sản phẩm
router.post("/products/add", isAdmin, async (req, res) => {
  upload.array("images", 8)(req, res, async (uploadError) => {
    if (uploadError) {
      logUploadRequest(req);
      logUploadError(req, uploadError);
      const categories = await Category.find();

      return res.status(400).render("admin/products/add", {
        categories,
        error: {
          code: uploadError.code || "UPLOAD_ERROR",
          message: getUploadErrorMessage(uploadError),
          rawMessage: uploadError.message || null,
          field: uploadError.field || null,
        },
      });
    }

    try {
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
      return res.redirect("/admin/products?success=add");
    } catch (error) {
      logUploadRequest(req);
      logUploadError(req, error);
      const categories = await Category.find();

      return res.status(500).render("admin/products/add", {
        categories,
        error: {
          code: error.code || "CREATE_PRODUCT_ERROR",
          message: error.message || "Không thể tạo sản phẩm",
          rawMessage: error.message || null,
          field: null,
        },
      });
    }
  });
});

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
router.post("/products/:id/edit", isAdmin, async (req, res) => {
  upload.array("images", 8)(req, res, async (uploadError) => {
    if (uploadError) {
      logUploadRequest(req);
      logUploadError(req, uploadError);
      return res.status(400).render("error", {
        message: getUploadErrorMessage(uploadError),
      });
    }

    try {
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

      return res.redirect("/admin/products?success=edit");
    } catch (error) {
      logUploadRequest(req);
      logUploadError(req, error);
      return res.status(500).render("error", {
        message: error.message || "Không thể cập nhật sản phẩm",
      });
    }
  });
});

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

router.get("/reports", isAdmin, async (req, res) => {
  try {
    const reports = await ProductReport.find()
      .populate("product", "name image slug")
      .populate("user", "fullName email")
      .sort({ createdAt: -1 });

    res.render("admin/reports/list", {
      title: "Báo cáo sản phẩm",
      reports,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
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

    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    const previousStatus = existingOrder.status;
    existingOrder.status = status;
    existingOrder.updatedAt = new Date();
    await existingOrder.save();

    if (existingOrder.user && existingOrder.status !== "Pending") {
      const notificationInfo = getOrderStatusNotification(
        existingOrder.status,
        existingOrder._id,
      );

      if (notificationInfo) {
        const wasStatusChanged = existingOrder.status !== previousStatus;

        if (wasStatusChanged) {
          await Notification.create({
            user: existingOrder.user,
            order: existingOrder._id,
            status: existingOrder.status,
            title: notificationInfo.title,
            message: notificationInfo.message,
          });
        }
      }
    }

    res.json({ success: true, order: existingOrder });
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
