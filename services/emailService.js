const nodemailer = require("nodemailer");
require("dotenv").config();

// Service class to handle all email-related operations
class EmailService {
    // Create and configure email transporter using Gmail
    static createTransporter() {
        return nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });
    }

    // Generate 6-digit OTP for verification
    static generateOtp() {
        const otp = Math.floor(100000 + Math.random() * 900000);
        console.log(' Generated OTP:', otp);
        return otp;
    }

    // Send verification email for user signup
    static async sendVerificationEmail(email, otp) {
        const transporter = this.createTransporter();

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "OTP Verification",
            text: `Your verification code is: ${otp}`,
            html: this.getVerificationEmailTemplate(otp)
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error(' Email sending failed:', error);
            throw new Error('Failed to send verification email');
        }
    }

    // Send password reset email with OTP
    static async sendPasswordResetEmail(email, otp) {
        const transporter = this.createTransporter();

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Password Reset OTP",
            text: `Your password reset code is: ${otp}`,
            html: this.getPasswordResetEmailTemplate(otp)
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error(' Password reset email sending failed:', error);
            throw new Error('Failed to send password reset email');
        }
    }

    static getVerificationEmailTemplate(otp) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Hi there,</h2>
                <p>Thank you for signing up. Please use the OTP below to verify your email address:</p>
                <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>Best regards,</p>
                <p><strong>Phoenix Team</strong></p>
            </div>
        `;
    }

    static getPasswordResetEmailTemplate(otp) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>You have requested to reset your password. Please use the OTP below to proceed:</p>
                <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this password reset, please ignore this email.</p>
                <p>Best regards,</p>
                <p><strong>Phoenix Team</strong></p>
            </div>
        `;
    }
}

module.exports = EmailService;
