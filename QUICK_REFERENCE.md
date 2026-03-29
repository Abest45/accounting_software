# FinAnalytics - Quick Reference Guide

## 🎯 Start Here

### 1. Initial Setup (One Time)
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create database
createdb finanalytics_db

# Start server
npm run dev
```

### 2. Access Points
- Backend API: `http://localhost:5000/api`
- Frontend: `http://localhost:3000`
- Health Check: `http://localhost:5000/api/health`
- Documentation: `backend/README.md`

---

## 📋 Common Commands

### Development
```bash
npm run dev              # Start with auto-reload
npm run dev:debug       # Debug mode
npm test                # Run tests
npm run lint            # Code quality check
```

### Production
```bash
npm run prod            # Production build
npm start               # Start production server
NODE_ENV=production node src/server.js
```

### Database
```bash
npm run migrate         # Run migrations
npm run seed            # Seed database
psql -U postgres finanalytics_db  # Connect to DB
```

### Utilities
```bash
tail -f logs/error.log      # Watch error logs
tail -f logs/combined.log   # Watch all logs
curl http://localhost:5000/api/health  # Health check
```

---

## 🔑 Environment Variables

### Must Have
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finanalytics_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your_secret_key_here
```

### Recommended
```env
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=100
```

### Optional
```env
REDIS_HOST=localhost
REDIS_PORT=6379
SMTP_HOST=smtp.gmail.com
```

---

## 📡 API Quick Reference

### Authentication
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"user@example.com","password":"Pass@123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass@123"}'
```

### Get Token
```bash
# Extract from login response
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass@123"}' | jq -r '.data.token')
```

### Invoices
```bash
# Create
curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName":"Client","clientEmail":"c@example.com",
    "dueDate":"2024-12-31","items":[{"description":"Service","quantity":1,"price":1000}],
    "taxRate":10
  }'

# Get all
curl -X GET "http://localhost:5000/api/invoices?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Get one
curl -X GET http://localhost:5000/api/invoices/INVOICE_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Dashboard Stats
```bash
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🗂️ Project Files

### Key Files
| File | Purpose |
|------|---------|
| `src/server.js` | Express app & Socket.IO |
| `src/models/index.js` | Database setup |
| `src/controllers/*` | Business logic |
| `src/routes/*` | API endpoints |
| `src/middleware/*` | Auth, errors, logging |
| `.env` | Configuration |
| `package.json` | Dependencies |

### Generate Files
| File | Command |
|------|---------|
| New Model | Create in `src/models/` |
| New Controller | Create in `src/controllers/` |
| New Route | Create in `src/routes/` |
| New Middleware | Create in `src/middleware/` |

---

## 🔐 Security Checklist

Before Production:
- [ ] Change JWT_SECRET
- [ ] Set NODE_ENV=production
- [ ] Update CORS_ORIGIN
- [ ] Enable HTTPS
- [ ] Set strong DB_PASSWORD
- [ ] Configure rate limits
- [ ] Enable error monitoring
- [ ] Set up database backups
- [ ] Review security headers
- [ ] Test authentication

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process on port 5000
lsof -i :5000
# Kill it
kill -9 PID

# Or change PORT in .env
PORT=5001 npm run dev
```

### Database Connection Failed
```bash
# Check PostgreSQL status
pg_isready

# Check database exists
psql -l | grep finanalytics_db

# Create if missing
createdb finanalytics_db

# Verify credentials
psql -U postgres -h localhost finanalytics_db
```

### CORS Errors
```bash
# Update .env
CORS_ORIGIN=http://localhost:3000

# Restart server
npm run dev
```

### Clear Everything
```bash
# Remove node modules
rm -rf node_modules

# Reinstall
npm install

# Restart
npm run dev
```

---

## 📊 Database Queries

### User Table
```sql
-- Check users
SELECT id, username, email, role FROM users;

-- Check login attempts
SELECT username, loginAttempts, lockUntil FROM users;

-- Reset account lockout
UPDATE users SET loginAttempts = 0, lockUntil = NULL WHERE id = 'USER_ID';
```

### Invoices
```sql
-- Total revenue
SELECT SUM(totalAmount) FROM invoices WHERE status = 'paid';

-- Pending invoices
SELECT * FROM invoices WHERE status = 'pending';

-- Overdue invoices
SELECT * FROM invoices WHERE dueDate < NOW() AND status != 'paid';
```

### Audit Log
```sql
-- Recent actions
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;

-- User activity
SELECT * FROM audit_logs WHERE userId = 'USER_ID' ORDER BY timestamp DESC;
```

---

## 🔌 Socket.IO Events

### Client -> Server
```javascript
// Subscribe to updates
socket.emit('subscribe_dashboard', { userId: 'USER_ID' });

// Create invoice
socket.emit('create_invoice', { data });

// Update invoice
socket.emit('update_invoice', { id, data });
```

### Server -> Client
```javascript
// Invoice events
socket.on('invoice_created', (data) => {});
socket.on('invoice_updated', (data) => {});
socket.on('invoice_deleted', (data) => {});

// Dashboard events
socket.on('dashboard_update', (data) => {});
socket.on('inventory_alert', (data) => {});
```

---

## 📈 Performance Tips

1. **Database Queries**
   - Use pagination
   - Add indexes on frequently queried columns
   - Use connection pooling

2. **API Responses**
   - Enable gzip compression (already done)
   - Paginate large results
   - Cache frequently accessed data

3. **Real-Time Updates**
   - Limit update frequency
   - Use WebSocket instead of polling
   - Batch multiple updates

4. **Frontend**
   - Lazy load images
   - Cache API responses
   - Debounce search inputs

---

## 🚀 Deployment

### Heroku
```bash
git push heroku main
heroku logs --tail
heroku config:set JWT_SECRET=new_secret
```

### Docker
```bash
docker build -t finanalytics .
docker run -p 5000:5000 --env-file .env finanalytics
```

### AWS EC2
```bash
ssh -i key.pem ec2-user@instance
cd /app
npm install
npm run prod
```

---

## 📱 Frontend Integration

### Add to HTML
```html
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
<script src="api-client.js"></script>
<script src="finance.js"></script>
```

### Use APIs
```javascript
// Login
await APIs.auth.login('user@example.com', 'password');

// Get invoices
const invoices = await APIs.invoiceAPI.getAll({ page: 1 });

// Create invoice
await APIs.invoiceAPI.create(invoiceData);

// Listen to updates
socket.on('invoice_created', (data) => {
  console.log('New invoice:', data);
});
```

---

## 🆘 Support

### Check Logs
```bash
tail -f logs/error.log      # Error logs
tail -f logs/combined.log   # All logs
```

### Test Endpoint
```bash
curl http://localhost:5000/api/health
# Should return: {"success": true, "message": "Server is running"}
```

### Debug Mode
```bash
DEBUG=* npm run dev
```

### Common Errors
| Error | Solution |
|-------|----------|
| 401 Unauthorized | Check token, re-login |
| 404 Not Found | Check endpoint URL |
| 429 Too Many Requests | Wait or increase rate limit |
| 500 Server Error | Check logs, restart server |

---

## 📞 Quick Links

- **Backend Docs**: `backend/README.md`
- **Quick Start**: `backend/QUICKSTART.md`
- **Integration**: `backend/INTEGRATION.md`
- **API Docs**: Swagger (optional)
- **GitHub**: (your-repo-url)

---

## 🎓 Learning Resources

### Express.js
- [Express Guide](https://expressjs.com/)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

### Sequelize
- [Sequelize Docs](https://sequelize.org/)
- [Sequelize Associations](https://sequelize.org/master/manual/associations.html)

### Socket.IO
- [Socket.IO Guide](https://socket.io/docs/)
- [Real-Time Examples](https://socket.io/get-started/chat/)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)

---

**Version**: 1.0.0
**Last Updated**: December 2025
**Status**: Production Ready

Happy Coding! 🚀
