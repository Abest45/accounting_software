# FinAnalytics - Production-Ready Finance Backend

## Overview

FinAnalytics is a comprehensive, production-ready financial management system backend built with Node.js, Express, PostgreSQL, and Socket.IO for real-time data synchronization. The system includes robust security features, audit logging, and complete financial management capabilities.

## Features

### Core Features
- ✅ **User Authentication & Authorization** - JWT-based with role-based access control
- ✅ **Invoice Management** - Create, manage, and track invoices with real-time updates
- ✅ **Expense Tracking** - Record and categorize expenses
- ✅ **Receipt Management** - Track received payments and receipts
- ✅ **Inventory Management** - Manage products, stock levels, and reorder alerts
- ✅ **Purchase Orders** - Track supplier purchases
- ✅ **Payroll Management** - Employee salary processing and calculations
- ✅ **Real-Time Dashboard** - Live financial KPIs and analytics
- ✅ **Audit Logging** - Track all user activities and changes

### Security Features
- 🔒 **Helmet.js** - HTTP security headers
- 🔒 **Rate Limiting** - API request throttling
- 🔒 **CORS** - Cross-origin resource sharing
- 🔒 **Input Sanitization** - XSS and NoSQL injection prevention
- 🔒 **Password Hashing** - bcryptjs with salt rounds
- 🔒 **JWT Tokens** - Secure stateless authentication
- 🔒 **SQL Injection Prevention** - Parameterized queries via ORM
- 🔒 **Account Lockout** - Brute force protection
- 🔒 **Data Encryption** - Sensitive data encryption

### Additional Features
- 📊 **Real-Time Socket.IO** - Live data updates
- 📊 **Comprehensive Logging** - Winston logger with file rotation
- 📊 **Error Handling** - Global error handling with detailed responses
- 📊 **Database Migrations** - Sequelize CLI integration
- 📊 **Request Validation** - Express validator integration
- 📊 **API Documentation** - Complete endpoint documentation

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18
- **Database**: PostgreSQL 12+ with Sequelize ORM
- **Real-Time**: Socket.IO 4.7
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, helmet, express-rate-limit
- **Logging**: Winston
- **Validation**: express-validator, joi
- **Caching**: Redis (optional)

## Installation

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn

### Setup Instructions

1. **Install Dependencies**
```bash
cd backend
npm install
```

2. **Configure Environment Variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finanalytics_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key_here
CORS_ORIGIN=http://localhost:3000
```

3. **Create PostgreSQL Database**
```bash
createdb finanalytics_db
```

4. **Run Database Migrations**
```bash
npm run migrate
```

5. **Start Development Server**
```bash
npm run dev
```

Production build:
```bash
npm run prod
```

## API Endpoints

### Authentication
```
POST   /api/auth/register       - Register new user
POST   /api/auth/login          - Login user (returns access token, sets refresh token in httpOnly cookie)
POST   /api/auth/refresh        - Refresh access token using httpOnly cookie
POST   /api/auth/logout         - Logout user (invalidates refresh token)
PUT    /api/auth/profile        - Update user profile
```

## Secure Authentication Flow (Refresh Token + httpOnly Cookie)

### Overview
The backend uses a hardened two-token authentication system:
- **Access Token (JWT)**: Short-lived (default 7 days), sent in request body on login, stored in-memory on client
- **Refresh Token (httpOnly Cookie)**: Long-lived (default 7 days), issued on login, stored securely in httpOnly cookie, rotated on each refresh request

### Login Flow
```
1. Client sends POST /api/auth/login with email & password
2. Server validates credentials
3. Server generates access token (JWT) and refresh token
4. Server stores hashed refresh token and expiry in database
5. Server sends:
   - Access token in JSON response body → stored in-memory on client
   - Refresh token in httpOnly cookie (secure, sameSite=Lax) → browser auto-sends with requests
6. Client stores access token in memory only (not in localStorage/sessionStorage)
```

### Protected Request Flow (with Auto-Refresh)
```
1. Client sends request with Authorization: Bearer {accessToken}
2. If token is valid:
   - Server processes request normally
3. If token is expired/invalid (401 response):
   - Client automatically calls POST /api/auth/refresh
   - Browser auto-sends refreshToken cookie
   - Server validates refresh token, invalidates old one
   - Server issues new refresh token + new access token
   - Server updates httpOnly cookie with new refresh token
   - Client retries original request with new access token
```

### Token Rotation (Hardened)
On each refresh request:
- Old refresh token is immediately invalidated in database
- New refresh token is generated and stored (hashed)
- New httpOnly cookie is set
- Compromised tokens cannot be reused

### Logout Flow
```
POST /api/auth/logout
- Browser sends refreshToken cookie automatically
- Server invalidates refresh token in database
- Server clears httpOnly cookie on client
- Client clears in-memory access token
```

### Example: Login & Auto-Refresh in Browser
```javascript
// api-client.js handles this transparently

const auth = {
  async login(email, password) {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // browser auto-sends cookies
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      authToken = data.data.token; // store in-memory
      // refresh token cookie is set automatically by browser
    }
    return data;
  }
};

// Auto-refresh on 401
const apiCall = async (endpoint, method = 'GET', body = null) => {
  let response = await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${authToken}` },
    credentials: 'include' // sends refresh token cookie
  });

  if (response.status === 401) {
    // auto-refresh
    const refreshRes = await fetch('http://localhost:5000/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });
    const refreshData = await refreshRes.json();
    if (refreshData.success) {
      authToken = refreshData.data.token; // update in-memory token
      // retry original request with new token
    }
  }
  // ... continue
};
```

### Environment Variables for Auth
```env
# JWT/Token Configuration
JWT_SECRET=your_strong_secret_here
JWT_EXPIRE=7d                          # Access token expiry
REFRESH_TOKEN_EXPIRE_MS=604800000      # Refresh token expiry (7 days in ms)

# CORS Configuration (required for credentials)
CORS_ORIGIN=http://localhost:3000
```

### Security Notes
1. **httpOnly Cookies**: Refresh token cannot be accessed by JavaScript, protecting against XSS
2. **SameSite=Lax**: Protects against CSRF attacks
3. **Secure Flag**: In production, cookie only sent over HTTPS
4. **Token Rotation**: Old refresh token invalidated immediately on use, preventing replay attacks
5. **In-Memory Access Token**: Not persisted, lost on page reload (use refresh to re-obtain)
6. **Database Backed**: Refresh tokens hashed and stored in database for invalidation on logout/compromise

### Invoices
```
GET    /api/invoices            - Get all invoices
POST   /api/invoices            - Create invoice
GET    /api/invoices/:id        - Get invoice details
PUT    /api/invoices/:id        - Update invoice
DELETE /api/invoices/:id        - Delete invoice
```

### Expenses
```
GET    /api/expenses/expenses   - Get all expenses
POST   /api/expenses/expenses   - Create expense
PUT    /api/expenses/expenses/:id - Update expense
DELETE /api/expenses/expenses/:id - Delete expense
```

### Receipts
```
GET    /api/receipts            - Get all receipts
POST   /api/receipts            - Create receipt
DELETE /api/receipts/:id        - Delete receipt
```

### Inventory
```
GET    /api/inventory/products  - Get all products
POST   /api/inventory/products  - Add product
PUT    /api/inventory/products/:id - Update product
PUT    /api/inventory/products/:id/stock - Update stock
GET    /api/inventory/low-stock - Get low stock items
```

### Purchases
```
GET    /api/purchases           - Get all purchases
POST   /api/purchases           - Create purchase order
PUT    /api/purchases/:id       - Update purchase
```

### Payroll
```
GET    /api/payroll             - Get all payroll records
POST   /api/payroll             - Create payroll
POST   /api/payroll/process     - Process payroll
GET    /api/payroll/summary     - Get payroll summary
```

### Dashboard
```
GET    /api/dashboard/stats              - Get KPI statistics
GET    /api/dashboard/revenue-expenses   - Get revenue vs expenses
GET    /api/dashboard/expense-breakdown  - Get expense breakdown
GET    /api/dashboard/payroll-insights   - Get payroll insights
GET    /api/dashboard/inventory-status   - Get inventory status
GET    /api/dashboard/audit-logs         - Get audit logs
```

## Database Schema

### Users Table
- id (UUID) - Primary key
- username (String) - Unique
- email (String) - Unique
- password (String) - Hashed
- role (Enum) - admin, manager, analyst, viewer
- isActive (Boolean)
- loginAttempts (Integer)
- lockUntil (DateTime)

### Invoices Table
- id (UUID) - Primary key
- invoiceNumber (String) - Unique
- userId (UUID) - Foreign key
- clientName (String)
- items (JSON)
- subtotal (Decimal)
- totalAmount (Decimal)
- status (Enum) - draft, sent, paid, overdue, cancelled

### Expenses Table
- id (UUID) - Primary key
- userId (UUID) - Foreign key
- description (String)
- amount (Decimal)
- category (Enum)
- status (Enum) - pending, approved, rejected, paid

### Inventory Table
- id (UUID) - Primary key
- productCode (String) - Unique
- currentStock (Integer)
- unitCost (Decimal)
- sellingPrice (Decimal)

### Payroll Table
- id (UUID) - Primary key
- employeeId (String)
- basicSalary (Decimal)
- grossSalary (Decimal)
- netPay (Decimal)
- status (Enum) - pending, processed, paid, failed

### AuditLog Table
- id (UUID) - Primary key
- userId (UUID) - Foreign key
- action (String)
- entity (String)
- oldValues (JSON)
- newValues (JSON)
- timestamp (DateTime)

## Security Best Practices

1. **Environment Variables** - Never commit .env files
2. **Password Policy** - Enforce strong passwords:
   - Minimum 8 characters
   - Uppercase, lowercase, number, special character
3. **Rate Limiting** - 100 requests per 15 minutes
4. **JWT Expiration** - 7 days by default
5. **CORS** - Configured for specific origins only
6. **Account Lockout** - 5 failed attempts = 30 min lock
7. **Audit Logging** - All non-GET requests logged
8. **SQL Injection Prevention** - Using parameterized queries
9. **XSS Protection** - Input sanitization
10. **HTTPS** - Use in production only

## Real-Time Updates with Socket.IO

### Client Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: authToken }
});
```

### Subscribe to Updates
```javascript
socket.emit('subscribe_dashboard', { userId: currentUserId });
```

### Listen to Events
```javascript
socket.on('invoice_created', (data) => {
  console.log('New invoice:', data);
});

socket.on('invoice_updated', (data) => {
  console.log('Invoice updated:', data);
});
```

## Error Handling

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Logging

Logs are stored in the `logs/` directory:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

Log levels: error, warn, info, http, debug, verbose, silly

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Performance Optimization

1. **Database Indexes** - Created on frequently queried columns
2. **Connection Pooling** - Min 2, Max 20 connections
3. **Compression** - gzip compression enabled
4. **Pagination** - All list endpoints paginated
5. **Caching** - Redis integration for session caching

## Production Deployment

### Checklist
- [ ] Set NODE_ENV=production
- [ ] Use strong JWT_SECRET
- [ ] Configure PostgreSQL SSL
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure error monitoring (e.g., Sentry)
- [ ] Enable rate limiting
- [ ] Set up logging service
- [ ] Configure CORS for production domain
- [ ] Use environment-specific .env file

### Docker Deployment
```bash
docker build -t finanalytics-backend .
docker run -p 5000:5000 --env-file .env finanalytics-backend
```

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
- Ensure database exists

### JWT Token Issues
- Verify JWT_SECRET is set
- Check token expiration
- Ensure Authorization header format: "Bearer TOKEN"

### Real-Time Updates Not Working
- Verify Socket.IO is connected
- Check CORS_ORIGIN matches client domain
- Verify authentication token is valid

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For support, email: support@finanalytics.com
Documentation: https://docs.finanalytics.com

---

**Last Updated**: December 2025
**Version**: 1.0.0
**Status**: Production Ready
