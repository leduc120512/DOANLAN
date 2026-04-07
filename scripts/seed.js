const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Comment = require('../models/Comment');

async function seed() {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Kết nối MongoDB thành công');

    // Xóa dữ liệu cũ
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Comment.deleteMany({});
    console.log('Xóa dữ liệu cũ thành công');

    // Tạo users
    const adminUser = await User.create({
      fullName: 'Admin User',
      email: 'admin@quatstore.com',
      phone: '0123456789',
      address: 'Hà Nội, Việt Nam',
      password: 'admin123',
      role: 'admin'
    });

    const normalUser1 = await User.create({
      fullName: 'Nguyễn Văn A',
      email: 'user1@quatstore.com',
      phone: '0987654321',
      address: 'TP Hồ Chí Minh, Việt Nam',
      password: 'user123',
      role: 'user'
    });

    const normalUser2 = await User.create({
      fullName: 'Trần Thị B',
      email: 'user2@quatstore.com',
      phone: '0912345678',
      address: 'Đà Nẵng, Việt Nam',
      password: 'user123',
      role: 'user'
    });

    console.log('Tạo users thành công');

    // Tạo categories
    const category1 = await Category.create({
      name: 'Quạt điện thường',
      description: 'Các loại quạt điện tiêu chuẩn'
    });

    const category2 = await Category.create({
      name: 'Quạt đứng',
      description: 'Quạt đứng cao cấp'
    });

    const category3 = await Category.create({
      name: 'Quạt trần',
      description: 'Quạt trần nhà thông minh'
    });

    const category4 = await Category.create({
      name: 'Quạt mini',
      description: 'Quạt mini cầm tay tiện lợi'
    });

    console.log('Tạo categories thành công');

    // Tạo products
    const products = await Product.create([
      {
        name: 'Quạt tháp gió mát TOSHIBA TC-F45',
        description: 'Quạt tháp cao 1m2 với công suất 80W, hẹn giờ tắt 15 tiếng, điều khiển từ xa',
        price: 2500000,
        category: category1._id,
        stock: 15,
        image: '/uploads/sample-fan-1.jpg',
        rating: 4.5,
        reviews: 12
      },
      {
        name: 'Quạt đứng PANASONIC F-409MD',
        description: 'Quạt đứng công suất 100W, 5 cánh quạt, điều khiển tốc độ 3 mức',
        price: 1800000,
        category: category2._id,
        stock: 10,
        image: '/uploads/sample-fan-2.jpg',
        rating: 4.2,
        reviews: 8
      },
      {
        name: 'Quạt trần DANNER ĐK-35',
        description: 'Quạt trần 36 inch, công suất 60W, 2 cánh gỗ, tích hợp đèn LED',
        price: 3200000,
        category: category3._id,
        stock: 8,
        image: '/uploads/sample-fan-3.jpg',
        rating: 4.7,
        reviews: 15
      },
      {
        name: 'Quạt mini USB REMAX F11',
        description: 'Quạt mini cầm tay chạy USB, nhỏ gọn, phù hợp để bàn làm việc',
        price: 350000,
        category: category4._id,
        stock: 50,
        image: '/uploads/sample-fan-4.jpg',
        rating: 4.0,
        reviews: 20
      },
      {
        name: 'Quạt điện thường MIDEA MF-1612',
        description: 'Quạt tròn 40cm, công suất 50W, 3 mức tốc độ, gồm tua điều chỉnh',
        price: 950000,
        category: category1._id,
        stock: 25,
        image: '/uploads/sample-fan-5.jpg',
        rating: 4.3,
        reviews: 18
      },
      {
        name: 'Quạt đứng FUJIKARA FD-1600',
        description: 'Quạt đứng hiện đại, thiết kế thon gọn, công suất 75W, hẹn giờ 8 tiếng',
        price: 2100000,
        category: category2._id,
        stock: 12,
        image: '/uploads/sample-fan-6.jpg',
        rating: 4.6,
        reviews: 10
      },
      {
        name: 'Quạt trần CASPER XPACE 7 BLADES',
        description: 'Quạt trần 7 cánh, công suất 65W, tối ưu hóa lưu thông không khí',
        price: 3800000,
        category: category3._id,
        stock: 5,
        image: '/uploads/sample-fan-7.jpg',
        rating: 4.8,
        reviews: 22
      },
      {
        name: 'Quạt mini cầm tay SUNBEAM',
        description: 'Quạt mini cầm tay 3 tốc độ, pin sạc 4000mAh, dùng 10 giờ',
        price: 420000,
        category: category4._id,
        stock: 40,
        image: '/uploads/sample-fan-8.jpg',
        rating: 4.4,
        reviews: 16
      }
    ]);

    console.log('Tạo products thành công');

    // Tạo orders
    const order1 = await Order.create({
      user: normalUser1._id,
      items: [
        {
          product: products[0]._id,
          quantity: 1,
          price: products[0].price
        }
      ],
      totalPrice: products[0].price,
      status: 'Delivered',
      customerName: normalUser1.fullName,
      customerPhone: normalUser1.phone,
      customerAddress: normalUser1.address
    });

    const order2 = await Order.create({
      user: normalUser2._id,
      items: [
        {
          product: products[1]._id,
          quantity: 2,
          price: products[1].price
        },
        {
          product: products[4]._id,
          quantity: 1,
          price: products[4].price
        }
      ],
      totalPrice: products[1].price * 2 + products[4].price,
      status: 'Processing',
      customerName: normalUser2.fullName,
      customerPhone: normalUser2.phone,
      customerAddress: normalUser2.address
    });

    console.log('Tạo orders thành công');

    // Tạo comments
    await Comment.create([
      {
        product: products[0]._id,
        user: normalUser1._id,
        order: order1._id,
        rating: 5,
        text: 'Quạt rất tốt, gió mát, hẹn giờ chính xác. Rất hài lòng với sản phẩm này!'
      },
      {
        product: products[0]._id,
        user: normalUser2._id,
        order: order2._id,
        rating: 4,
        text: 'Quạt hoạt động tốt, chỉ là hơi ồn một chút'
      }
    ]);

    console.log('Tạo comments thành công');

    console.log('\n=== SEED DATA HOÀN THÀNH ===');
    console.log('\nTài khoản admin để test:');
    console.log('Email: admin@quatstore.com');
    console.log('Password: admin123');
    console.log('\nTài khoản user để test:');
    console.log('Email: user1@quatstore.com');
    console.log('Password: user123');

    mongoose.disconnect();
  } catch (error) {
    console.error('Lỗi seed database:', error);
    mongoose.disconnect();
    process.exit(1);
  }
}

seed();
