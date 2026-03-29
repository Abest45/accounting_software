# Authentication Forms Documentation

## 📋 Overview

Complete production-ready authentication system with secure login, signup, admin access, and password recovery features.

**Features:**
- ✅ User & Admin registration
- ✅ Secure login with account lockout
- ✅ Password recovery via email
- ✅ Password strength validation
- ✅ 2FA ready (Admin)
- ✅ Session management
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ XSS prevention
- ✅ Responsive design
- ✅ Dark/Light mode support
- ✅ Accessibility compliant

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
# Now includes: nodemailer, validator, csurf, crypto
```

### 2. Update Environment Variables

Create or update `.env` with email configuration:

```env
# Email Configuration (Development - Ethereal)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_ethereal_email@ethereal.email
SMTP_PASSWORD=your_ethereal_password
SMTP_FROM_EMAIL=noreply@finanalytics.com
FRONTEND_URL=http://localhost:3000

# For Production (Gmail)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your_email@gmail.com
# SMTP_PASSWORD=your_app_password
```

### 3. Start Backend

```bash
npm run dev
# Server running on http://localhost:5000
```

### 4. Access Forms

Open in browser:
```
http://localhost:3000/auth-forms.html
```

---

## 📁 Files Structure

### Frontend Files
```
/
├── auth-forms.html      # Main authentication forms
├── auth-forms.css       # Responsive styling
└── auth-forms.js        # Form logic & validation
```

### Backend Files
```
backend/src/
├── controllers/auth.js       # Authentication logic (new methods)
├── routes/auth.js            # Authentication endpoints (updated)
├── models/User.js            # User model (new fields)
├── utils/email.js            # Email service
└── .env                       # Configuration
```

---

## 🔑 API Endpoints

### Authentication

#### User Registration
```http
POST /api/auth/register
Content-Type: application/json
X-CSRF-Token: <token>

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "uuid",
    "email": "john@example.com",
    "token": "jwt_token"
  }
}
```

#### User Login
```http
POST /api/auth/login
Content-Type: application/json
X-CSRF-Token: <token>

{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "role": "viewer"
    }
  }
}
```

#### Admin Registration (Request)
```http
POST /api/auth/admin/register
Content-Type: application/json
X-CSRF-Token: <token>

{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@company.com",
  "phone": "+91 9876543210",
  "company": "Acme Corp",
  "password": "AdminSecurePass123!@#",
  "confirmPassword": "AdminSecurePass123!@#"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Admin registration request submitted. Your account is pending approval by administrators."
}
```

#### Admin Login
```http
POST /api/auth/admin/login
Content-Type: application/json
X-CSRF-Token: <token>

{
  "email": "admin@company.com",
  "password": "AdminSecurePass123!@#",
  "twoFactorCode": "123456"  // Optional
}
```

### Password Recovery

#### Request Password Recovery
```http
POST /api/auth/forgot-password
Content-Type: application/json
X-CSRF-Token: <token>

{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password recovery link has been sent."
}
```

#### Validate Reset Token
```http
POST /api/auth/validate-reset-token
Content-Type: application/json

{
  "token": "reset_token_from_email"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "email": "john@example.com",
    "firstName": "John"
  }
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json
X-CSRF-Token: <token>

{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

---

## 🔐 Security Features

### Frontend Security

#### CSRF Protection
- Generates unique CSRF token on page load
- Includes token in all POST requests
- Validated by backend

#### Input Validation
- Real-time validation
- Email format checking
- Password strength meter
- Phone number validation
- XSS prevention via HTML escaping

#### Password Requirements

**User Password:**
- Minimum 8 characters
- 1 uppercase letter (A-Z)
- 1 lowercase letter (a-z)
- 1 number (0-9)
- 1 special character (!@#$%^&*)

**Admin Password:**
- Minimum 12 characters
- 1 uppercase letter (A-Z)
- 1 lowercase letter (a-z)
- 2+ numbers (0-9)
- 2+ special characters (!@#$%^&*)

#### Rate Limiting
- 5 failed attempts allowed
- 30-minute lockout after max attempts
- Per-form attempt tracking

#### Session Management
- Auto-logout after 10 minutes of inactivity
- Token refresh every 5 minutes
- Secure localStorage for tokens
- Visibility change handling

### Backend Security

#### Password Security
- Bcrypt hashing (10 salt rounds)
- Password strength validation
- Account lockout mechanism
- Login attempt tracking

#### Token Security
- JWT with 7-day expiration
- Reset token expires in 30 minutes
- Hashed token storage in database
- One-time use per token

#### Email Security
- SMTP secure connection (TLS)
- HTML email with CSS
- Verified sender information
- Security notices in emails

#### API Security
- CORS validation
- Rate limiting
- XSS prevention
- SQL injection prevention
- HTTPS recommended for production

---

## 📧 Email Configuration

### Development (Ethereal Email)

1. Get a test account:
```bash
curl -X POST https://api.nodemailer.com/user -d "name=YOUR_NAME"
```

2. Update `.env`:
```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_ethereal_email
SMTP_PASSWORD=your_ethereal_password
```

3. Check emails at: https://ethereal.email

### Production (Gmail)

1. Enable 2FA on Google Account
2. Generate App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select Mail and Windows Computer
   - Copy generated password

3. Update `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=generated_app_password
```

### Production (SendGrid)

1. Sign up at https://sendgrid.com
2. Create API key
3. Update `.env`:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
```

---

## 💻 Form Features

### User Login
- Email and password fields
- "Remember me" checkbox
- "Forgot password?" link
- Form toggle to signup
- Real-time validation
- Session token storage

### User Signup
- First name, last name
- Email verification
- Password strength indicator
- Password confirmation
- Terms acceptance
- Form toggle to login
- Success message

### Admin Login
- Email and password
- 2FA code input (optional)
- Account lockout protection
- Enhanced security badge
- Admin-specific styling
- Form toggle to registration request

### Admin Signup (Registration Request)
- Company details
- Phone number
- Additional security requirements
- Approval pending status
- Audit trail
- Support contact

### Password Recovery Modal
- 3-step process:
  1. **Request**: Email entry
  2. **Confirmation**: Success message, email preview
  3. **Reset**: New password entry with strength meter

---

## 🎨 Customization

### Change Colors

Edit `auth-forms.css`:

```css
:root {
    --primary: #2c3e50;        /* Main color */
    --accent: #3498db;         /* Link/button color */
    --success: #27ae60;        /* Success messages */
    --error: #e74c3c;          /* Error messages */
    --warning: #f39c12;        /* Warning messages */
}
```

### Change Email Templates

Edit `auth-forms.js` or create custom templates in `utils/email.js`

### Add Custom Validation

```javascript
// In auth-forms.js
class SecurityManager {
    customValidator(value) {
        // Your validation logic
        return isValid;
    }
}
```

---

## 🧪 Testing

### Manual Testing

1. **Register User:**
   - Go to signup form
   - Fill all fields
   - Verify validation messages
   - Submit and check backend response

2. **Login:**
   - Enter credentials
   - Verify token in localStorage
   - Check redirect to dashboard

3. **Password Recovery:**
   - Click "Forgot password?"
   - Enter email
   - Check inbox for recovery email
   - Click recovery link
   - Enter new password
   - Verify login works

4. **Admin Access:**
   - Try admin login with user account (should fail)
   - Request admin registration
   - Check backend approval status

### Testing with Postman

```bash
# 1. User Signup
POST http://localhost:5000/api/auth/register
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "TestPass123!",
  "firstName": "Test",
  "lastName": "User"
}

# 2. User Login
POST http://localhost:5000/api/auth/login
{
  "email": "test@example.com",
  "password": "TestPass123!"
}

# 3. Forgot Password
POST http://localhost:5000/api/auth/forgot-password
{
  "email": "test@example.com"
}
```

---

## 🐛 Troubleshooting

### Email Not Sending

**Issue:** Emails not received
**Solution:**
1. Check `.env` configuration
2. Verify SMTP credentials
3. Check firewall/port access
4. Enable "Less secure app access" (Gmail)
5. Check spam folder

### "Token is invalid or expired"

**Issue:** Password reset link doesn't work
**Solution:**
1. Token expires after 30 minutes
2. Request a new recovery link
3. Check URL is complete and correct

### "Account is locked"

**Issue:** Too many login attempts
**Solution:**
1. Wait 30 minutes for automatic unlock
2. Contact admin to unlock manually
3. Reset via password recovery

### CORS Errors

**Issue:** Cross-origin request blocked
**Solution:**
1. Update CORS_ORIGIN in `.env`
2. Restart backend server
3. Clear browser cache

### 2FA Code Issues

**Issue:** 2FA code not working
**Solution:**
1. Ensure correct time on server
2. Code valid for 30 seconds only
3. Check timezone settings

---

## 📚 Additional Resources

- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Email Security](https://tools.ietf.org/html/rfc8689)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)

---

## 📝 Database Schema

### User Model Fields (Updated)

```sql
- id (UUID, PK)
- username (STRING, UNIQUE)
- email (STRING, UNIQUE)
- password (STRING, hashed)
- firstName (STRING)
- lastName (STRING)
- phone (STRING)
- role (ENUM: admin, manager, analyst, viewer, pending_admin)
- isActive (BOOLEAN)
- emailVerified (BOOLEAN)
- emailVerificationToken (STRING)
- isLocked (BOOLEAN)
- lockUntil (DATE)
- resetToken (STRING, hashed)
- resetTokenExpires (DATE)
- loginAttempts (INTEGER)
- twoFactorEnabled (BOOLEAN)
- twoFactorSecret (STRING)
- lastLogin (DATE)
- metadata (JSONB)
- createdAt (DATE)
- updatedAt (DATE)
```

---

## 🔄 Integration with Dashboard

After login, redirect to dashboard:

```javascript
// In your dashboard code
const token = localStorage.getItem('sessionToken');
const socket = io('http://localhost:5000', {
    auth: {
        token: token
    }
});
```

---

## 📞 Support

For issues or questions:
- Check documentation
- Review error logs
- Test with Postman
- Contact: support@finanalytics.com

---

**Version:** 1.0.0
**Last Updated:** December 2025
**Status:** Production Ready ✅
