# Quick Start Guide - FinAnalytics Backend

## 5-Minute Setup

### Step 1: Clone & Install
```bash
cd backend
npm install
```

### Step 2: Setup Database
```bash
# Create PostgreSQL database
createdb finanalytics_db

# Or use connection string
psql postgres -c "CREATE DATABASE finanalytics_db;"
```

### Step 3: Configure Environment
```bash
# Copy example to .env
cp .env.example .env

# Edit .env file with your settings
# Minimum required:
# DB_USER=postgres
# DB_PASSWORD=postgres (or your password)
# JWT_SECRET=any_random_string
```

### Step 4: Start Server
```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════╗
║   FinAnalytics Backend Server Started   ║
║   Environment: development             ║
║   Port: 5000                            ║
║   Database: finanalytics_db             ║
╚════════════════════════════════════════╝
```

## Testing Endpoints

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass@123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass@123"
  }'
```

Copy the returned `token` for the next requests.

### 3. Get Dashboard Stats
```bash
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Create Invoice
```bash
curl -X POST http://localhost:5000/api/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "clientName": "Acme Corp",
    "clientEmail": "contact@acme.com",
    "invoiceDate": "2024-12-01",
    "dueDate": "2024-12-31",
    "items": [
      {
        "description": "Web Development",
        "quantity": 1,
        "price": 5000
      }
    ],
    "taxRate": 10,
    "discount": 0
  }'
```

## Frontend Integration

Add this to your HTML before closing `</body>`:

```html
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
<script src="api-client.js"></script>
```

Usage in JavaScript:
```javascript
// Login
const loginResult = await APIs.auth.login('test@example.com', 'SecurePass@123');
console.log(loginResult);

// Get invoices
const invoices = await APIs.invoiceAPI.getAll({ page: 1, limit: 10 });
console.log(invoices);

// Create invoice
const newInvoice = await APIs.invoiceAPI.create({
  clientName: 'Client Name',
  clientEmail: 'client@email.com',
  dueDate: '2024-12-31',
  items: [{description: 'Service', quantity: 1, price: 1000}],
  taxRate: 10
});
```

## Common Issues & Solutions

### "Database connection refused"
- Make sure PostgreSQL is running
- Check database exists: `psql -l | grep finanalytics_db`
- Verify credentials in .env file

### "EADDRINUSE: address already in use :::5000"
- Port 5000 is in use
- Either: stop the conflicting process or change PORT in .env

### "Invalid token" error
- Token may have expired (7 days)
- Need to login again
- Check token format: `Bearer TOKEN`

### CORS errors in frontend
- Update CORS_ORIGIN in .env to match your frontend URL
- Example: `CORS_ORIGIN=http://localhost:3000`

## Next Steps

1. ✅ **Backend Running** - You're done!
2. 📝 **Read Full Docs** - See README.md
3. 🔌 **Connect Frontend** - Use api-client.js
4. 🗄️ **Add More Data** - Use API endpoints
5. 📊 **View Dashboard** - Real-time updates with Socket.IO

## Useful Commands

```bash
# Development
npm run dev          # With auto-reload

# Production
npm run prod         # Production build

# Testing
npm test             # Run tests

# Linting
npm run lint         # Check code style

# Database
npm run migrate      # Run migrations

# Logs
tail -f logs/combined.log    # View real-time logs
```

## Architecture Overview

```
FinAnalytics Backend
├── src/
│   ├── models/          # Database models (Sequelize)
│   ├── controllers/      # Business logic
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth, error handling, audit
│   ├── utils/           # JWT, validation, logging
│   ├── validators/      # Input validation
│   ├── config/          # Database & Redis config
│   └── server.js        # Express app & Socket.IO
├── logs/                # Application logs
├── package.json         # Dependencies
├── .env                 # Environment variables
└── README.md            # Full documentation
```

## Security Reminders

⚠️ **Before Production:**
- [ ] Change all default secrets
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Use strong database password
- [ ] Set up database backups
- [ ] Enable error monitoring
- [ ] Review CORS settings
- [ ] Set up rate limiting alerts

## Getting Help

1. Check logs: `tail -f logs/error.log`
2. Review README.md for detailed docs
3. Check API responses for error codes
4. Enable debug logging: `LOG_LEVEL=debug` in .env

---

**Happy developing!** 🚀
