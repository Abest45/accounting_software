/**
 * Email Service Utility
 * Handles all email communications including password recovery
 */

const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    /**
     * Initialize email transporter
     */
    initializeTransporter() {
        // For development, use a test account
        // For production, update with real SMTP credentials
        if (process.env.NODE_ENV === 'production') {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD,
                },
            });
        } else {
            // For development - using Ethereal (disposable email service)
            nodemailer.createTestAccount((err, testAccount) => {
                if (err) {
                    logger.error('Failed to create test email account:', err);
                    return;
                }

                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                });
            });
        }
    }

    /**
     * Send password recovery email
     * @param {string} email - User email
     * @param {string} firstName - User first name
     * @param {string} resetToken - Password reset token
     * @param {string} resetLink - Password reset link
     * @param {string} expiresIn - Token expiration time (e.g., "30 minutes")
     */
    async sendPasswordRecoveryEmail(email, firstName, resetToken, resetLink, expiresIn = '30 minutes') {
        try {
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background: #f5f5f5;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            overflow: hidden;
                        }
                        .header {
                            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                            color: white;
                            padding: 20px;
                            text-align: center;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 24px;
                            font-weight: 600;
                        }
                        .content {
                            padding: 30px 20px;
                        }
                        .greeting {
                            font-size: 16px;
                            color: #2c3e50;
                            margin-bottom: 20px;
                        }
                        .message {
                            font-size: 14px;
                            color: #555;
                            line-height: 1.6;
                            margin-bottom: 20px;
                        }
                        .button-container {
                            text-align: center;
                            margin: 30px 0;
                        }
                        .reset-button {
                            display: inline-block;
                            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                            color: white;
                            padding: 12px 30px;
                            text-decoration: none;
                            border-radius: 5px;
                            font-weight: 600;
                            transition: transform 0.2s;
                        }
                        .reset-button:hover {
                            transform: translateY(-2px);
                        }
                        .warning {
                            background: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 3px;
                            font-size: 13px;
                            color: #856404;
                        }
                        .code-section {
                            background: #f8f9fa;
                            padding: 15px;
                            border-radius: 5px;
                            margin: 20px 0;
                            text-align: center;
                            font-family: monospace;
                        }
                        .code {
                            font-size: 16px;
                            letter-spacing: 2px;
                            font-weight: bold;
                            color: #2c3e50;
                            word-break: break-all;
                        }
                        .footer {
                            background: #f8f9fa;
                            padding: 20px;
                            text-align: center;
                            font-size: 12px;
                            color: #999;
                            border-top: 1px solid #e0e0e0;
                        }
                        .security-notice {
                            background: #e8f5e9;
                            border-left: 4px solid #4caf50;
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 3px;
                            font-size: 13px;
                            color: #2e7d32;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>💰 FinAnalytics</h1>
                            <p style="margin: 5px 0 0 0; font-size: 13px;">Password Recovery</p>
                        </div>

                        <div class="content">
                            <div class="greeting">
                                Hi ${this.escapeHtml(firstName)},
                            </div>

                            <div class="message">
                                We received a request to reset the password for your FinAnalytics account. 
                                If you didn't make this request, you can safely ignore this email.
                            </div>

                            <div class="message">
                                To reset your password, click the button below:
                            </div>

                            <div class="button-container">
                                <a href="${resetLink}" class="reset-button">Reset Your Password</a>
                            </div>

                            <div class="message" style="text-align: center; color: #999; font-size: 13px;">
                                Or copy this link: <br>
                                <span style="word-break: break-all;">${resetLink}</span>
                            </div>

                            <div class="warning">
                                <strong>⏰ Important:</strong> This password reset link will expire in <strong>${expiresIn}</strong>. 
                                After that, you'll need to request a new reset link.
                            </div>

                            <div class="security-notice">
                                <strong>🔒 Security Tip:</strong> Never share this link with anyone. FinAnalytics support staff will 
                                never ask for your password or this reset link.
                            </div>

                            <div class="message" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 13px;">
                                <strong>Need help?</strong> If you're having trouble resetting your password, 
                                please contact our support team at support@finanalytics.com
                            </div>
                        </div>

                        <div class="footer">
                            <p>© 2025 FinAnalytics. All rights reserved.</p>
                            <p>This is an automated message. Please do not reply to this email.</p>
                            <p>
                                <a href="https://finanalytics.com" style="color: #3498db; text-decoration: none;">Visit FinAnalytics</a> | 
                                <a href="https://finanalytics.com/security" style="color: #3498db; text-decoration: none;">Security Policy</a>
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const plainTextContent = `
Hi ${firstName},

We received a request to reset the password for your FinAnalytics account. 
If you didn't make this request, you can safely ignore this email.

To reset your password, visit this link (expires in ${expiresIn}):
${resetLink}

IMPORTANT: This link is confidential and should not be shared with anyone.

If you're having trouble, contact: support@finanalytics.com

© 2025 FinAnalytics. All rights reserved.
            `;

            const mailOptions = {
                from: `"FinAnalytics" <${process.env.SMTP_FROM_EMAIL || 'noreply@finanalytics.com'}>`,
                to: email,
                subject: 'Password Reset Request - FinAnalytics',
                html: htmlContent,
                text: plainTextContent,
                headers: {
                    'X-Priority': '3',
                    'Importance': 'normal',
                    'X-Mailer': 'FinAnalytics/1.0',
                },
            };

            const result = await this.transporter.sendMail(mailOptions);
            
            logger.info(`Password recovery email sent to ${email}`, { result });

            // Log preview URL for development
            if (process.env.NODE_ENV === 'development') {
                const previewUrl = nodemailer.getTestMessageUrl(result);
                if (previewUrl) {
                    logger.info(`Email preview: ${previewUrl}`);
                }
            }

            return { success: true, messageId: result.messageId };
        } catch (error) {
            logger.error('Failed to send password recovery email:', error);
            throw new Error('Failed to send password recovery email');
        }
    }

    /**
     * Send verification email
     */
    async sendVerificationEmail(email, firstName, verificationLink) {
        try {
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background: #f5f5f5;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            overflow: hidden;
                        }
                        .header {
                            background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
                            color: white;
                            padding: 20px;
                            text-align: center;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 24px;
                            font-weight: 600;
                        }
                        .content {
                            padding: 30px 20px;
                        }
                        .button-container {
                            text-align: center;
                            margin: 30px 0;
                        }
                        .verify-button {
                            display: inline-block;
                            background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
                            color: white;
                            padding: 12px 30px;
                            text-decoration: none;
                            border-radius: 5px;
                            font-weight: 600;
                        }
                        .footer {
                            background: #f8f9fa;
                            padding: 20px;
                            text-align: center;
                            font-size: 12px;
                            color: #999;
                            border-top: 1px solid #e0e0e0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>💰 FinAnalytics</h1>
                            <p style="margin: 5px 0 0 0; font-size: 13px;">Email Verification</p>
                        </div>

                        <div class="content">
                            <p>Hi ${this.escapeHtml(firstName)},</p>

                            <p>Welcome to FinAnalytics! To complete your account setup, please verify your email address:</p>

                            <div class="button-container">
                                <a href="${verificationLink}" class="verify-button">Verify Email Address</a>
                            </div>

                            <p style="font-size: 13px; color: #999;">
                                Or copy this link: <br>
                                <span style="word-break: break-all;">${verificationLink}</span>
                            </p>
                        </div>

                        <div class="footer">
                            <p>© 2025 FinAnalytics. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: `"FinAnalytics" <${process.env.SMTP_FROM_EMAIL || 'noreply@finanalytics.com'}>`,
                to: email,
                subject: 'Verify Your Email - FinAnalytics',
                html: htmlContent,
            };

            const result = await this.transporter.sendMail(mailOptions);
            logger.info(`Verification email sent to ${email}`);

            return { success: true, messageId: result.messageId };
        } catch (error) {
            logger.error('Failed to send verification email:', error);
            throw new Error('Failed to send verification email');
        }
    }

    /**
     * Send welcome email
     */
    async sendWelcomeEmail(email, firstName, adminPanel = false) {
        try {
            const panelInfo = adminPanel 
                ? '<p>You have been granted administrator access. Visit the <a href="https://admin.finanalytics.com" style="color: #3498db;">Admin Dashboard</a> to manage your account.</p>'
                : '';

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background: #f5f5f5;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            overflow: hidden;
                        }
                        .header {
                            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                            color: white;
                            padding: 20px;
                            text-align: center;
                        }
                        .content {
                            padding: 30px 20px;
                        }
                        .footer {
                            background: #f8f9fa;
                            padding: 20px;
                            text-align: center;
                            font-size: 12px;
                            color: #999;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Welcome to FinAnalytics!</h1>
                        </div>

                        <div class="content">
                            <p>Hi ${this.escapeHtml(firstName)},</p>

                            <p>Your FinAnalytics account has been successfully created! You can now access all the features of our platform.</p>

                            <h3>Getting Started:</h3>
                            <ul>
                                <li>Complete your profile</li>
                                <li>Set up your financial accounts</li>
                                <li>Configure security settings</li>
                                <li>Start tracking your finances</li>
                            </ul>

                            ${panelInfo}

                            <p>If you have any questions, our support team is here to help: support@finanalytics.com</p>
                        </div>

                        <div class="footer">
                            <p>© 2025 FinAnalytics. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: `"FinAnalytics" <${process.env.SMTP_FROM_EMAIL || 'noreply@finanalytics.com'}>`,
                to: email,
                subject: 'Welcome to FinAnalytics',
                html: htmlContent,
            };

            const result = await this.transporter.sendMail(mailOptions);
            logger.info(`Welcome email sent to ${email}`);

            return { success: true, messageId: result.messageId };
        } catch (error) {
            logger.error('Failed to send welcome email:', error);
            throw new Error('Failed to send welcome email');
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Test email service
     */
    async testConnection() {
        try {
            if (!this.transporter) {
                return { success: false, message: 'Transporter not initialized' };
            }

            await this.transporter.verify();
            logger.info('Email service connection verified');
            return { success: true, message: 'Email service connected successfully' };
        } catch (error) {
            logger.error('Email service connection failed:', error);
            return { success: false, message: error.message };
        }
    }
}

module.exports = new EmailService();
