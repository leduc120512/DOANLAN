# QuạtStore - Website Bán Quạt

Một website bán quạt đầy đủ chức năng được xây dựng bằng **Node.js + Express + EJS + MongoDB** với giao diện xanh dương, hỗ trợ tiếng Việt.

## Tính năng

### Cho Admin
- Dashboard quản lí
- Quản lí sản phẩm (thêm, sửa, xóa, upload ảnh)
- Quản lí danh mục sản phẩm
- Quản lí đơn hàng (cập nhật trạng thái)
- Tìm kiếm sản phẩm và đơn hàng

### Cho User
- Đăng ký / Đăng nhập
- Xem sản phẩm và chi tiết
- Tìm kiếm theo tên hoặc danh mục
- Giỏ hàng (lưu trong session)
- Thanh toán / Tạo đơn hàng
- Quản lí đơn hàng cá nhân
- Sửa thông tin cá nhân & đổi mật khẩu
- Bình luận sản phẩm (chỉ user đã mua)
- Xem top 3 sản phẩm bán chạy

## Yêu cầu

- Node.js (v14 hoặc cao hơn)
- MongoDB (local hoặc cloud)
- npm hoặc pnpm

## Cài đặt

### 1. Clone hoặc tải project

### 2. Cài đặt dependencies
```bash
npm install
# hoặc
pnpm install
```

### 3. Cấu hình MongoDB

Tạo file `.env` và cấu hình:
```
MONGODB_URI=mongodb://localhost:27017/fan-store
PORT=3000
SESSION_SECRET=your_secret_key_here
NODE_ENV=development
```

### 4. Seed dữ liệu mẫu

```bash
npm run seed
```

Sau khi seed, bạn có tài khoản:
- **Admin**: admin@quatstore.com / admin123
- **User**: user1@quatstore.com / user123

### 5. Chạy ứng dụng

```bash
# Development
npm run dev

# Production
npm start
```

Truy cập: http://localhost:3000

## Cấu trúc Project

```
fan-store/
├── models/                 # MongoDB schemas
│   ├── User.js
│   ├── Product.js
│   ├── Category.js
│   ├── Order.js
│   └── Comment.js
├── routes/                 # Express routes
│   ├── home.js
│   ├── auth.js
│   ├── user.js
│   ├── cart.js
│   ├── order.js
│   └── admin.js
├── middleware/             # Custom middleware
│   ├── auth.js
│   └── upload.js
├── views/                  # EJS templates
│   ├── layout.ejs
│   ├── index.ejs
│   ├── partials/
│   ├── auth/
│   ├── user/
│   ├── order/
│   └── admin/
├── public/                 # Static files
│   └── uploads/           # Upload images
├── scripts/               # Utility scripts
│   └── seed.js
└── server.js             # Main app file
```

## Database Schema

### Users
- fullName, email, phone, address
- password (hashed bcrypt)
- role (user/admin)

### Products
- name, description, price, stock
- category (reference)
- image, rating, reviews

### Orders
- user (reference)
- items (product, quantity, price)
- totalPrice, status
- customerName, customerPhone, customerAddress

### Comments
- product, user, order (references)
- rating (1-5), text

### Categories
- name, description

## Features Chi Tiết

### Authentication
- Bcrypt password hashing
- Express-session middleware
- Middleware kiểm tra quyền (isAdmin, isAuthenticated)

### Image Upload
- Multer middleware
- Lưu vào `/public/uploads`
- Hỗ trợ JPG, PNG, GIF
- Max 5MB

### Cart System
- Session-based cart
- Thêm/xóa/cập nhật sản phẩm
- Tính toán tổng tiền

### Orders
- Trạng thái: Pending, Processing, Shipped, Delivered, Cancelled
- Hủy đơn (chỉ khi Pending)

### Comments
- Chỉ user đã mua sản phẩm mới bình luận
- Tính rating trung bình tự động

## Tuy chỉnh

### Thay đổi màu chủ đề
Sửa file `views/layout.ejs` trong section CSS

### Thêm tính năng mới
1. Tạo route trong `routes/`
2. Tạo view trong `views/`
3. Update model nếu cần

## Troubleshooting

### MongoDB connection error
- Kiểm tra MongoDB đang chạy
- Kiểm tra MONGODB_URI trong .env

### Image upload error
- Kiểm tra quyền ghi thư mục `/public/uploads`
- Kiểm tra kích thước file < 5MB

### Session lost
- Kiểm tra SESSION_SECRET trong .env
- Xóa browser cookies

## License

MIT
