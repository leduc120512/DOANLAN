const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const Banner = require("../models/Banner");

const SEARCH_HISTORY_LIMIT = 10;

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
router.get("/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    const categories = await Category.find();
    const Comment = require("../models/Comment");
    const comments = await Comment.find({ product: req.params.id })
      .populate("user", "fullName")
      .sort({ createdAt: -1 });

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

module.exports = router;
