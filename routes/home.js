const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const Banner = require("../models/Banner");
const mongoose = require("mongoose");
const ProductReport = require("../models/ProductReport");

const SEARCH_HISTORY_LIMIT = 10;

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeKeyword(keyword) {
  return (keyword || "").trim();
}

function saveSearchKeywordToSession(req, keyword) {
  const value = normalizeKeyword(keyword);
  if (!value) return;

  const history = Array.isArray(req.session.searchHistory)
    ? req.session.searchHistory
    : [];

  const deduped = history.filter(
    (item) =>
      typeof item === "string" &&
      item.trim().toLowerCase() !== value.toLowerCase(),
  );

  req.session.searchHistory = [value, ...deduped].slice(
    0,
    SEARCH_HISTORY_LIMIT,
  );
}

function getProductIdFromKey(productKey) {
  const value = String(productKey || "").trim();
  const match = value.match(/([a-fA-F0-9]{24})$/);
  return match
    ? match[1]
    : mongoose.Types.ObjectId.isValid(value)
      ? value
      : null;
}

async function findProductByKey(productKey) {
  const productId = getProductIdFromKey(productKey);

  if (productId) {
    const byId = await Product.findById(productId).populate("category");
    if (byId) {
      return byId;
    }
  }

  const normalizedKey = slugify(productKey);
  const bySlug = await Product.findOne({ slug: normalizedKey }).populate(
    "category",
  );

  if (bySlug) {
    return bySlug;
  }

  const products = await Product.find().populate("category");
  return (
    products.find((product) => slugify(product.name) === normalizedKey) || null
  );
}

// Trang chủ
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();
    const banners = await Banner.find({ isActive: true }).sort({
      sortOrder: 1,
      createdAt: -1,
    });
    const topProducts = await Product.find()
      .populate("category")
      .sort({ rating: -1 })
      .limit(3);

    res.render("index", {
      title: "Trang chủ",
      categories,
      banners,
      topProducts,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

// Tìm kiếm sản phẩm
router.get("/search", async (req, res) => {
  try {
    const { keyword, category } = req.query;
    const normalizedKeyword = normalizeKeyword(keyword);
    let filter = {};

    if (normalizedKeyword) {
      filter.name = { $regex: normalizedKeyword, $options: "i" };
      saveSearchKeywordToSession(req, normalizedKeyword);
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    const products = await Product.find(filter).populate("category");
    const categories = await Category.find();

    res.render("search", {
      title: "Kết quả tìm kiếm",
      products,
      categories,
      keyword: normalizedKeyword,
      selectedCategory: category || "all",
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

router.post("/search/history/clear", (req, res) => {
  req.session.searchHistory = [];
  res.json({ success: true });
});

// Lọc theo danh mục
router.get("/category/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    const products = await Product.find({ category: req.params.id }).populate(
      "category",
    );
    const categories = await Category.find();

    if (!category) {
      return res
        .status(404)
        .render("error", { message: "Không tìm thấy danh mục" });
    }

    res.render("category", {
      title: category.name,
      category,
      products,
      categories,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

// Xem chi tiết sản phẩm
router.get("/product/:productKey", async (req, res) => {
  try {
    const product = await findProductByKey(req.params.productKey);
    const categories = await Category.find();
    const Comment = require("../models/Comment");
    const comments = product
      ? await Comment.find({ product: product._id })
          .populate("user", "fullName")
          .sort({ createdAt: -1 })
      : [];

    if (!product) {
      return res
        .status(404)
        .render("error", { message: "Không tìm thấy sản phẩm" });
    }

    res.render("product-detail", {
      title: product.name,
      product,
      categories,
      comments,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
});

router.post("/product/:productId/report", async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res
        .status(401)
        .json({ error: "Vui lòng đăng nhập để gửi báo cáo" });
    }

    const { reason, details } = req.body;
    const productId = req.params.productId;

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: "Vui lòng chọn lý do báo cáo" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    }

    await ProductReport.create({
      product: productId,
      user: req.session.user.id,
      reason: String(reason).trim(),
      details: String(details || "").trim(),
    });

    return res.json({ success: true, message: "Đã gửi báo cáo" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
