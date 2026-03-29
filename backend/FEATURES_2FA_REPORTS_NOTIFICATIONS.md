# Feature Documentation: 2FA, Reports, & Email Notifications

## Overview
This document covers three major security and compliance features added to FinAnalytics:
1. **Two-Factor Authentication (2FA)** — TOTP-based security with backup codes
2. **Report Generation** — PDF and Excel exports for invoices, P&L, and payroll
3. **Email Notifications** — Event-driven notifications for key business events

---

## 1. Two-Factor Authentication (2FA)

### Overview
Two-Factor Authentication adds an additional security layer using Time-based One-Time Passwords (TOTP) via authenticator apps like Google Authenticator, Microsoft Authenticator, or Authy.

### Features
- ✅ TOTP token generation and verification
- ✅ QR code display for easy setup
- ✅ 10 backup codes for account recovery
- ✅ 2FA verification on login
- ✅ Enable/disable with password confirmation
- ✅ Secure backup code usage tracking

### Setup Flow (Frontend)

```javascript
// 1. User initiates 2FA setup
const setupRes = await APIs.auth.setup2FA();
// Response includes: { qrCode, secret, backupCodes }

// 2. User scans QR code with authenticator app
// 3. User enters 6-digit code from app
const verifyRes = await fetch('/api/2fa/verify-setup', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    token: '123456', // from authenticator app
    secret: setupRes.data.secret,
    backupCodes: setupRes.data.backupCodes
  })
});

// 4. On next login, user sees 2FA challenge
// POST /auth/login returns { requires2FA: true, userId }
// 5. User verifies token
const loginRes = await fetch('/api/2fa/verify-login', {
  method: 'POST',
  body: JSON.stringify({
    userId: '...',
    token: '123456' // or backup code
  })
});
```

### API Endpoints

#### Setup 2FA
```
POST /api/2fa/setup
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": ["ABC12345", "XYZ98765", ...]
  }
}
```

#### Verify & Enable 2FA
```
POST /api/2fa/verify-setup
Authorization: Bearer {token}

Body:
{
  "token": "123456",
  "secret": "JBSWY3DPEHPK3PXP",
  "backupCodes": ["ABC12345", ...]
}
```

#### Verify 2FA Login
```
POST /api/2fa/verify-login

Body:
{
  "userId": "uuid",
  "token": "123456"  // or backup code
}

Response:
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "email": "user@example.com"
  }
}
```

#### Disable 2FA
```
POST /api/2fa/disable
Authorization: Bearer {token}

Body:
{
  "password": "user_password"
}
```

### Security Notes
- Backup codes are single-use and removed after use
- TOTP token window allows 30 seconds clock skew tolerance
- Disabling 2FA requires password confirmation
- 2FA status persists after token refresh
- Consider mandating 2FA for admin accounts

---

## 2. Report Generation

### Overview
Generate financial reports in PDF and Excel formats for compliance, auditing, and business intelligence.

### Supported Reports
1. **Invoice Report** — All invoices with totals and status summary
2. **Profit & Loss Report** — Revenue, expenses, net profit, profit margin, expense breakdown
3. **Payroll Report** — Employee payroll records with gross/net breakdown

### Features
- ✅ PDF and Excel export formats
- ✅ Date range filtering (startDate, endDate query params)
- ✅ User-scoped reports (user only sees their data)
- ✅ Professional formatting with headers and summaries
- ✅ Automatic download as attachment

### API Endpoints

#### Invoice Report
```
GET /api/reports/invoices?format=pdf&startDate=2026-01-01&endDate=2026-01-31
Authorization: Bearer {token}

Query Parameters:
- format: "pdf" or "excel" (default: pdf)
- startDate: ISO date string (optional)
- endDate: ISO date string (optional)

Response: PDF or Excel file stream with Content-Disposition: attachment
```

#### Profit & Loss Report
```
GET /api/reports/p-and-l?format=excel&startDate=2026-01-01&endDate=2026-01-31
Authorization: Bearer {token}

Response includes:
- Total Revenue
- Total Expenses
- Net Profit
- Profit Margin %
- Expense breakdown by category
```

#### Payroll Report
```
GET /api/reports/payroll?format=pdf&startDate=2026-01-01&endDate=2026-01-31
Authorization: Bearer {token}

Response includes:
- Employee list with ID
- Basic Salary
- Gross Salary
- Net Pay
- Status (pending/processed/paid)
- Date
```

### Usage Examples

#### JavaScript/Fetch
```javascript
// Download invoice report as Excel
const response = await fetch(
  '/api/reports/invoices?format=excel&startDate=2026-01-01',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'invoices.xlsx';
a.click();
```

#### Command Line (curl)
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5000/api/reports/p-and-l?format=pdf" \
  -o p-and-l-report.pdf
```

### Technical Notes
- Reports are generated on-demand (no database bloat)
- PDF uses PDFKit library with basic formatting
- Excel uses ExcelJS with column formatting
- Reports respect user access control via JWT
- Date filters are applied at database query level

---

## 3. Email Notifications

### Overview
Event-driven email notifications alert users to important business events. Uses Bull queue with Redis for reliable async processing.

### Notification Types

| Event | Trigger | Recipients |
|-------|---------|------------|
| **Invoice Overdue** | Invoice due date passed | User |
| **Invoice Created** | New invoice generated | Client (if email on file) |
| **Low Inventory** | Stock below reorder level | User |
| **Payroll Processed** | Payroll run completed | Manager |
| **Budget Exceeded** | Spending exceeds limit | Budget owner + Manager |
| **Expense Approval Required** | Expense awaiting approval | Approver |

### Setup & Configuration

#### Environment Variables
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@finanalytics.com

# Redis (for Bull queue)
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Start Email Queue Worker
```bash
# Add to server startup or run separately
npm start
# Email processing starts automatically
```

### Usage Examples

#### Trigger Invoice Created Notification
```javascript
// In invoices.js controller
const notifications = require('../services/notifications');

await notifications.notifyInvoiceCreated(
  'client@example.com',
  'INV-12345',
  'Acme Corp',
  5000.00
);
```

#### Trigger Low Inventory Alert
```javascript
const notifications = require('../services/notifications');

await notifications.notifyLowInventory(
  'manager@company.com',
  'Product X',
  15, // current stock
  50  // reorder level
);
```

#### Trigger Payroll Notification
```javascript
await notifications.notifyPayrollProcessed(
  'manager@company.com',
  25, // employee count
  125000.00, // total amount
  'January 2026'
);
```

### API for Custom Notifications

```javascript
// Import service
const { sendEmail } = require('./services/notifications');

// Send custom email
await sendEmail(
  'recipient@example.com',
  'templateName',
  [templateDataArg1, templateDataArg2, ...]
);
```

### Adding New Notification Templates

Edit [backend/src/services/notifications.js](backend/src/services/notifications.js):

```javascript
const templates = {
  myNewTemplate: (arg1, arg2) => ({
    subject: 'Email Subject',
    html: `<h2>Title</h2><p>Content with ${arg1}</p>`
  })
};

// Export new trigger function
const notifyMyEvent = async (email, arg1, arg2) => {
  await sendEmail(email, 'myNewTemplate', [arg1, arg2]);
};
```

### Monitoring & Debugging

#### Queue Status
```javascript
// Check queue length
const emailQueue = require('bull')('email-notifications', { redis: {...} });
const count = await emailQueue.count();
console.log(`Pending emails: ${count}`);
```

#### View Failed Jobs
```javascript
const failed = await emailQueue.getFailed();
console.log(failed); // Array of failed jobs
```

#### Retry Failed Email
```javascript
const job = failed[0];
await job.retry();
```

### Best Practices
1. **Batch notifications**: Send digest emails instead of individual ones for frequent events
2. **Opt-in settings**: Allow users to control which notifications they receive
3. **Rate limiting**: Avoid notification spam (e.g., max 1 email per 5 minutes per event type)
4. **Unsubscribe links**: Include in email templates for GDPR compliance
5. **Monitor queue**: Set up alerts if queue backs up (>100 pending emails)

---

## Integration Checklist

### Installation
```bash
# Install new dependencies
npm install

# Run migrations for 2FA
npm run migrate
```

### Configuration
```env
# .env file
JWT_SECRET=your_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Testing

#### Test 2FA
```bash
npm test -- --testNamePattern="2FA"
```

#### Test Reports
```bash
npm test -- --testNamePattern="Report"
```

#### Test Notifications
```bash
npm test -- --testNamePattern="Email"
```

### Deployment Considerations
1. **Redis required** for email queue (use managed Redis service like AWS ElastiCache)
2. **SMTP credentials** must be environment variables (never hardcoded)
3. **Monitor email queue** in production
4. **Backup codes** should be securely displayed to users only once
5. **Rate limiting** on 2FA endpoints to prevent brute force
6. **HTTPS only** for 2FA and sensitive operations

### Frontend Integration (index.html)

```javascript
// 2FA Setup
document.getElementById('setup2fa').addEventListener('click', async () => {
  const res = await fetch('/api/2fa/setup', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  // Display QR code and backup codes
  displayQRCode(data.data.qrCode);
  displayBackupCodes(data.data.backupCodes);
});

// Download report
document.getElementById('downloadReport').addEventListener('click', async () => {
  const response = await fetch('/api/reports/p-and-l?format=excel', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `p-and-l-${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
});
```

---

## Troubleshooting

### 2FA Issues
- **"Invalid 2FA token"**: Check system clock sync; TOTP has 60-second window
- **"Backup codes not working"**: Codes are single-use; once used, they're removed
- **QR code not displaying**: Ensure qrcode library is loaded correctly

### Report Issues
- **Excel file corrupted**: Check available disk space for temp files
- **PDF appears blank**: Verify invoice/expense records exist in database
- **"Permission denied" on download**: Ensure JWT token is valid and user owns the data

### Email Issues
- **Emails not sending**: Check SMTP credentials and Redis connection
- **Queue backing up**: Monitor with `emailQueue.count()`; may need to scale email workers
- **Bounced emails**: Verify recipient email addresses are valid

---

## References
- TOTP/2FA: https://github.com/speakeasyjs/speakeasy
- QR Codes: https://github.com/davidshimjs/qrcodejs
- PDF Generation: http://pdfkit.org/
- Excel Export: https://github.com/exceljs/exceljs
- Bull Queue: https://github.com/OptimalBits/bull
- Email (Nodemailer): https://nodemailer.com/

---

**Last Updated**: January 30, 2026
**Version**: 1.0.0
