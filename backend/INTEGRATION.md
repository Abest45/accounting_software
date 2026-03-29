# Frontend & Backend Integration Guide

## File Structure After Integration

```
finance/
├── index.html                 # Frontend HTML
├── finance.js                 # Frontend JavaScript (UPDATED)
├── finance.css               # Frontend CSS
├── api-client.js             # API Client (PLACE IN ROOT)
├── backend/                  # Backend folder
│   ├── src/
│   │   ├── server.js
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── utils/
│   ├── package.json
│   ├── .env
│   └── README.md
└── node_modules/             # (Created after npm install)
```

## Integration Steps

### Step 1: Copy API Client
Copy the api-client.js to your frontend root directory:
```bash
cp backend/src/utils/api-client.js ./api-client.js
```

### Step 2: Update HTML
Add these lines to index.html before closing `</body>`:

```html
<!-- Real-time Updates -->
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>

<!-- API Client -->
<script src="api-client.js"></script>

<!-- Updated Finance JS -->
<script src="finance.js"></script>
```

### Step 3: Update finance.js
Replace the old static chart data with API calls. Here's an example for the dashboard:

```javascript
// Initialize Charts (UPDATED)
document.addEventListener('DOMContentLoaded', async function() {
    
    // Load real-time data from backend
    async function initializeDashboard() {
        try {
            const stats = await APIs.dashboardAPI.getStats();
            if (!stats.success) {
                console.error('Failed to load stats:', stats.message);
                return;
            }
            
            const revenue = stats.data.totalRevenue;
            const netProfit = stats.data.netProfit;
            const expenses = stats.data.totalExpenses;
            const cashFlow = stats.data.cashFlow;
            
            // Update KPI Cards
            document.querySelectorAll('.kpi-value')[0].textContent = '$' + revenue.toLocaleString('en-US', {maximumFractionDigits: 0});
            document.querySelectorAll('.kpi-value')[1].textContent = '$' + netProfit.toLocaleString('en-US', {maximumFractionDigits: 0});
            document.querySelectorAll('.kpi-value')[2].textContent = '$' + expenses.toLocaleString('en-US', {maximumFractionDigits: 0});
            document.querySelectorAll('.kpi-value')[3].textContent = '$' + cashFlow.toLocaleString('en-US', {maximumFractionDigits: 0});
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
        }
    }
    
    // Call API instead of static data
    initializeDashboard();
    
    // Revenue vs Expenses Chart
    const revenueExpenseCtx = document.getElementById('revenueExpenseChart').getContext('2d');
    const revenueExpenseChart = new Chart(revenueExpenseCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Revenue',
                    data: [],
                    borderColor: '#00c853',
                    backgroundColor: 'rgba(0, 200, 83, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Expenses',
                    data: [],
                    borderColor: '#ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + context.raw.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
    
    // Load chart data
    async function updateRevenueChart() {
        const data = await APIs.dashboardAPI.getRevenueExpenses('monthly');
        if (data.success) {
            window.revenueExpenseChart = revenueExpenseChart;
            revenueExpenseChart.data.labels = data.data.map(d => 
                new Date(d.date).toLocaleDateString('en-US', {month: 'short', year: '2-digit'})
            );
            revenueExpenseChart.data.datasets[0].data = data.data.map(d => d.revenue || 0);
            revenueExpenseChart.data.datasets[1].data = data.data.map(d => d.expenses || 0);
            revenueExpenseChart.update();
        }
    }
    
    updateRevenueChart();
    
    // ... rest of your chart initialization
    
    // Real-time updates
    setInterval(() => {
        initializeDashboard();
        updateRevenueChart();
    }, 5000);
    
    // Subscribe to real-time updates
    socket.emit('subscribe_dashboard', { 
        userId: getUserId() // You need to implement this
    });
    
    // Listen to real-time events
    socket.on('invoice_created', (data) => {
        console.log('New invoice received:', data);
        initializeDashboard(); // Refresh dashboard
    });
});

// Helper function to get current user ID
function getUserId() {
    // Extract from localStorage or JWT token
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const decoded = JSON.parse(atob(token.split('.')[1]));
            return decoded.userId;
        } catch (e) {
            console.error('Failed to decode token');
            return null;
        }
    }
    return null;
}
```

### Step 4: Update Form Submissions

Replace form handlers with API calls:

```javascript
// Invoice Form Example
document.getElementById('invoiceForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Collect form data
    const invoiceData = {
        clientName: document.getElementById('clientName').value,
        clientEmail: document.getElementById('clientEmail').value,
        clientPhone: document.getElementById('clientPhone').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        dueDate: document.getElementById('dueDate').value,
        items: collectInvoiceItems(),
        taxRate: parseFloat(document.getElementById('taxRate').value),
        discount: parseFloat(document.getElementById('discount').value),
        status: document.getElementById('invoiceStatus').value,
        notes: document.getElementById('notes').value
    };
    
    // Send to backend
    const result = await APIs.invoiceAPI.create(invoiceData);
    
    if (result.success) {
        alert('Invoice created successfully!');
        this.reset();
    } else {
        alert('Error: ' + result.message);
    }
});

function collectInvoiceItems() {
    const items = [];
    document.querySelectorAll('.invoice-item').forEach(item => {
        items.push({
            description: item.querySelector('.item-description').value,
            quantity: parseInt(item.querySelector('.item-quantity').value),
            price: parseFloat(item.querySelector('.item-price').value)
        });
    });
    return items;
}
```

### Step 5: Implement Login/Logout

```javascript
// Login functionality
async function handleLogin(email, password) {
    const result = await APIs.auth.login(email, password);
    
    if (result.success) {
        localStorage.setItem('authToken', result.data.token);
        localStorage.setItem('userId', result.data.userId);
        // Show dashboard
        window.location.href = '/';
    } else {
        alert('Login failed: ' + result.message);
    }
}

// Logout
function handleLogout() {
    APIs.auth.logout();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    window.location.href = '/login.html';
}

// Check if user is authenticated
function isAuthenticated() {
    return localStorage.getItem('authToken') !== null;
}

// Redirect to login if not authenticated
if (!isAuthenticated() && window.location.pathname !== '/login.html') {
    window.location.href = '/login.html';
}
```

## Starting Both Services

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend (if using local server)
```bash
# Using Python 3
python -m http.server 3000

# Or using Node.js http-server
npx http-server . -p 3000
```

## Testing the Integration

1. **Open Frontend**: http://localhost:3000
2. **Check Browser Console**: Should show Socket.IO connection
3. **Register/Login**: Create a test account
4. **Create Data**: Use forms to create invoices, expenses, etc.
5. **Watch Real-Time Updates**: Dashboard should update every 5 seconds

## API Client Functions Reference

### Authentication
```javascript
// Register
await APIs.auth.register({
  username: 'user',
  email: 'user@example.com',
  password: 'SecurePass@123',
  firstName: 'John',
  lastName: 'Doe'
});

// Login
await APIs.auth.login('user@example.com', 'SecurePass@123');

// Logout
APIs.auth.logout();
```

### Invoices
```javascript
// Create
await APIs.invoiceAPI.create(invoiceData);

// Get all
await APIs.invoiceAPI.getAll({ page: 1, limit: 10 });

// Get specific
await APIs.invoiceAPI.getById(invoiceId);

// Update
await APIs.invoiceAPI.update(invoiceId, updatedData);

// Delete
await APIs.invoiceAPI.delete(invoiceId);
```

### Dashboard
```javascript
// Get stats
await APIs.dashboardAPI.getStats();

// Get revenue vs expenses
await APIs.dashboardAPI.getRevenueExpenses('monthly');

// Get expense breakdown
await APIs.dashboardAPI.getExpenseBreakdown();

// Get payroll insights
await APIs.dashboardAPI.getPayrollInsights();
```

## Environment Configuration

Make sure backend .env has correct CORS_ORIGIN:
```env
CORS_ORIGIN=http://localhost:3000
```

If frontend is on different port, update accordingly.

## Troubleshooting

### "Cannot GET /api/..." 
- Backend not running
- Check backend is on port 5000

### Socket.IO not connecting
- Check CORS_ORIGIN matches frontend URL
- Check firewall/network settings

### CORS errors
- Update CORS_ORIGIN in backend .env
- Restart backend server

### Authentication fails
- Clear localStorage
- Check JWT_SECRET in .env matches

---

**Integration Complete!** Your finance app now has a production-ready backend with real-time updates. 🎉
