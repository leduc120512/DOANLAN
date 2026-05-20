const nodemailer = require("nodemailer");

function getMailConfig() {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_APP_PASSWORD || "").replace(/\s/g, "");
  const from = (process.env.EMAIL_FROM || user).trim();

  if (!user || !pass) {
    return null;
  }

  return {
    user,
    pass,
    from,
  };
}

function createTransporter() {
  const config = getMailConfig();

  if (!config) {
    throw new Error("Missing EMAIL_USER or EMAIL_APP_PASSWORD in .env");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

async function sendNewPasswordEmail({ to, temporaryPassword }) {
  const config = getMailConfig();

  if (!config) {
    throw new Error("Missing EMAIL_USER or EMAIL_APP_PASSWORD in .env");
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: config.from,
    to,
    subject: "Mat khau moi cua ban",
    html: `
      <p>Ban vua yeu cau dat lai mat khau.</p>
      <p>He thong da tao mat khau moi cho tai khoan cua ban:</p>
      <p><strong>${temporaryPassword}</strong></p>
      <p>Vui long dang nhap bang mat khau nay va doi lai mat khau sau khi dang nhap.</p>
      <p>Neu ban khong yeu cau, co the bo qua email nay.</p>
    `,
  });
}

module.exports = {
  sendNewPasswordEmail,
};
