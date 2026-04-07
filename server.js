const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const Category = require("./models/Category");

const app = express();

/* =========================
   KẾT NỐI MONGODB
========================= */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB kết nối thành công"))
  .catch((err) => {
    console.error("❌ MongoDB kết nối thất bại:", err);
    process.exit(1);
  });

/* =========================
   CẤU HÌNH VIEW ENGINE
========================= */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* =========================
   MIDDLEWARE CƠ BẢN
========================= */
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* =========================
   SESSION
========================= */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mysecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 ngày
    },
  }),
);

/* =========================
   GLOBAL VARIABLES CHO VIEW
========================= */
app.use(async (req, res, next) => {
  try {
    // User & Cart
    res.locals.user = req.session.user || null;
    res.locals.cart = req.session.cart || [];
    res.locals.searchHistory = Array.isArray(req.session.searchHistory)
      ? req.session.searchHistory
      : [];

    // Categories cho header
    const categories = await Category.find().lean();
    res.locals.categories = categories;

    // Custom layout wrapper
    const originalRender = res.render;

    res.render = function (view, options = {}, callback) {
      // Không dùng layout cho error / 404
      if (view === "error" || view === "404") {
        return originalRender.call(this, view, options, callback);
      }

      // Không wrap layout cho auth pages
      if (view.startsWith("auth/")) {
        return originalRender.call(this, view, options, callback);
      }

      // Render nội dung trước
      originalRender.call(this, view, options, (err, html) => {
        if (err) {
          console.error("❌ Render error:", err);
          return res.status(500).send(err.message);
        }

        // Render layout và truyền body
        originalRender.call(
          this,
          "layout",
          {
            ...options,
            body: html,
          },
          callback,
        );
      });
    };

    next();
  } catch (err) {
    console.error("🔥 Lỗi load global data:", err);
    next();
  }
});

/* =========================
   ROUTES
========================= */
app.use("/", require("./routes/home"));
app.use("/auth", require("./routes/auth"));
app.use("/user", require("./routes/user"));
app.use("/admin", require("./routes/admin"));
app.use("/cart", require("./routes/cart"));
app.use("/order", require("./routes/order"));

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).render("404", {
    title: "Không tìm thấy trang",
  });
});

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err.stack);
  res.status(500).render("error", {
    message: err.message || "Có lỗi xảy ra",
  });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server chạy trên port ${PORT}`);
  console.log(`👉 Truy cập: http://localhost:${PORT}`);
});
