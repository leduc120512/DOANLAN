const nodemailer = require("nodemailer");

function getMailConfig() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return {
    user,
    pass,
    from: process.env.EMAIL_FROM || user,
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

async function sendResetPasswordEmail({ to, resetUrl }) {
  const config = getMailConfig();

  if (!config) {
    throw new Error("Missing EMAIL_USER or EMAIL_APP_PASSWORD in .env");
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: config.from,
    to,
    subject: "Dat lai mat khau",
    html: `
      <p>Ban vua yeu cau dat lai mat khau.</p>
      <p>Vui long bam vao lien ket ben duoi de tao mat khau moi. Lien ket co hieu luc trong 1 gio.</p>
      <p><a href="${resetUrl}">Dat lai mat khau</a></p>
      <p>Neu ban khong yeu cau, co the bo qua email nay.</p>
    `,
  });
}

module.exports = {
  sendResetPasswordEmail,
};
