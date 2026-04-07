const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  image: {
    type: String,
    default: null,
  },
  images: {
    type: [String],
    default: [],
  },
  stock: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviews: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

productSchema.pre("save", function (next) {
  if ((!this.images || this.images.length === 0) && this.image) {
    this.images = [this.image];
  }

  this.image = this.images && this.images.length > 0 ? this.images[0] : null;
  next();
});

productSchema.virtual("mainImage").get(function () {
  if (Array.isArray(this.images) && this.images.length > 0) {
    return this.images[0];
  }

  return this.image || null;
});

module.exports = mongoose.model("Product", productSchema);
