const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const sendEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Phoenix Support" <${process.env.NODEMAILER_EMAIL}>`,
      to: email,
      subject: "This is your One-Time Password for Phoenix",
      text: `
Hello,

Thank you for choosing Phoenix.

Your One-Time Password is: ${otp}

Please use this code to complete your account verification. Do not share this OTP with anyone.

If you didn’t request this, please ignore this email.

Thanks,
Phoenix Support Team
      `,
      html: `
<div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  <p>Hello,</p>
  <p>Thank you for choosing <strong>Phoenix</strong>.</p>
  <p>Your One-Time Password (OTP) is:</p>
  <p style="font-size: 22px; font-weight: bold; background: #f0f0f0; display: inline-block; padding: 10px 20px; border-radius: 5px;">${otp}</p>
  <p>Please enter this code in the app to verify your account. This OTP will expire in 30 seconds.</p>
  <p style="color: #777;">If you didn’t request this, please ignore this email.</p>
  <br>
  <p>Thanks,<br><strong>Phoenix Support Team</strong></p>
</div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return info.accepted.length > 0;
  } catch (error) {
    console.log("Error sending email:", error.message);
    return false;
  }
};

module.exports = sendEmail;
