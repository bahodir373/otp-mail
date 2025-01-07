require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// MongoDB ulanishi
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  expiresAt: Date,
});
const OTP = mongoose.model("OTP", otpSchema);

// Nodemailer transporti
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// OTP yuborish endpointi
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email kiritilishi kerak." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 xonali OTP
  const expiresAt = new Date(Date.now() + 1 * 60 * 1000); // 1 daqiqa

  await OTP.create({ email, otp, expiresAt });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Sizning tasdiqlash kodingiz",
    text: `Sizning tasdiqlash kodingiz: ${otp}. Kod 1 daqiqa davomida amal qiladi.`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      return res.status(500).json({ message: "Email yuborishda xatolik yuz berdi." });
    }
    res.status(200).json({ message: "Tasdiqlash kodingiz emailga yuborildi." });
  });
});

// OTP tekshirish endpointi
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email va tasdiqlash kodi kiritilishi kerak." });
  }

  const record = await OTP.findOne({ email, otp });

  if (!record) {
    return res.status(400).json({ message: "Noto'g'ri email yoki tasdiqlash kodi." });
  }

  if (record.expiresAt < new Date()) {
    await OTP.deleteOne({ email, otp }); // Muddati tugagan kodni o'chirish
    return res.status(400).json({ message: "Tasdiqlash kodingiz muddati tugagan." });
  }

  res.status(200).json({ message: "OTP tasdiqlandi." });

  // Foydalanilgan OTPni o'chirish
  await OTP.deleteOne({ email, otp });
});

// Serverni ishga tushirish
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishlamoqda`);
});
