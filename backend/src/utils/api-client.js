// API Configuration
const DEFAULT_API_URL = 'http://localhost:5000';

function resolveApiBaseUrl() {
  const customUrl = localStorage.getItem('finanalytics-api-url');
  if (customUrl) {
    return customUrl.replace(/\/+$/, '');
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return DEFAULT_API_URL;
  }

  if (window.location.protocol === 'https:' || window.location.protocol === 'http:') {
    const port = window.location.port || '5000';
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }

  return DEFAULT_API_URL;
}

const API_BASE_URL = `${resolveApiBaseUrl()}/api`;
window.FIN_API_BASE_URL = API_BASE_URL;
let authToken = null; // keep access token in memory only

// Socket.IO for real-time updates (connect after login)
const socket = io(resolveApiBaseUrl(), { autoConnect: false });

// ==================== AUTHENTICATION ====================

const auth = {
  async register(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData)
    });
    const data = await response.json();
    if (data.success) {
      authToken = data.data.token;
      socket.auth = { token: authToken };
      socket.connect();
    }
    return data;
  },

  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.success) {
      authToken = data.data.token;
      socket.auth = { token: authToken };
      socket.connect();
    }
    return data;
  },

  async logout() {
    // notify server to clear refresh cookie
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignore
    }
    authToken = null;
    if (socket && socket.connected) socket.disconnect();
  },

  // expose current access token (in-memory) for UI needs
  getToken() { return authToken; }
};

// ==================== API HELPER ====================

const apiCall = async (endpoint, method = 'GET', body = null) => {
  const makeOptions = (token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers, credentials: 'include' };
    if (body) opts.body = JSON.stringify(body);
    return opts;
  };

  try {
    let response = await fetch(`${API_BASE_URL}${endpoint}`, makeOptions(authToken));

    // If unauthorized, attempt token refresh once
    if (response.status === 401) {
      try {
        const refreshResp = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        const refreshData = await refreshResp.json();
        if (refreshResp.ok && refreshData.success && refreshData.data && refreshData.data.token) {
          authToken = refreshData.data.token;
          // retry original request with new token
          response = await fetch(`${API_BASE_URL}${endpoint}`, makeOptions(authToken));
        } else {
          return refreshData;
        }
      } catch (err) {
        return { success: false, message: 'Session expired' };
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, message: 'Network error' };
  }
};

// ==================== INVOICE API ====================

const invoiceAPI = {
  create: (data) => apiCall('/invoices', 'POST', data),
  getAll: (params = {}) => apiCall(`/invoices?${new URLSearchParams(params)}`),
  getById: (id) => apiCall(`/invoices/${id}`),
  update: (id, data) => apiCall(`/invoices/${id}`, 'PUT', data),
  delete: (id) => apiCall(`/invoices/${id}`, 'DELETE')
};

// ==================== EXPENSE API ====================

const expenseAPI = {
  create: (data) => apiCall('/expenses/expenses', 'POST', data),
  getAll: (params = {}) => apiCall(`/expenses/expenses?${new URLSearchParams(params)}`),
  update: (id, data) => apiCall(`/expenses/expenses/${id}`, 'PUT', data),
  delete: (id) => apiCall(`/expenses/expenses/${id}`, 'DELETE')
};

// ==================== RECEIPT API ====================

const receiptAPI = {
  create: (data) => apiCall('/receipts', 'POST', data),
  getAll: (params = {}) => apiCall(`/receipts?${new URLSearchParams(params)}`),
  delete: (id) => apiCall(`/receipts/${id}`, 'DELETE')
};

// ==================== INVENTORY API ====================

const inventoryAPI = {
  createProduct: (data) => apiCall('/inventory/products', 'POST', data),
  getProducts: (params = {}) => apiCall(`/inventory/products?${new URLSearchParams(params)}`),
  updateProduct: (id, data) => apiCall(`/inventory/products/${id}`, 'PUT', data),
  updateStock: (id, data) => apiCall(`/inventory/products/${id}/stock`, 'PUT', data),
  getLowStock: () => apiCall('/inventory/low-stock'),
  createPurchase: (data) => apiCall('/inventory/purchases', 'POST', data),
  getPurchases: (params = {}) => apiCall(`/inventory/purchases?${new URLSearchParams(params)}`)
};

// ==================== PAYROLL API ====================

const payrollAPI = {
  create: (data) => apiCall('/payroll', 'POST', data),
  getAll: (params = {}) => apiCall(`/payroll?${new URLSearchParams(params)}`),
  process: (payrollIds) => apiCall('/payroll/process', 'POST', { payrollIds }),
  getSummary: () => apiCall('/payroll/summary')
};

// ==================== DASHBOARD API ====================

const dashboardAPI = {
  getStats: (params = {}) => apiCall(`/dashboard/stats?${new URLSearchParams(params)}`),
  getRevenueExpenses: (period = 'monthly') => apiCall(`/dashboard/revenue-expenses?period=${period}`),
  getExpenseBreakdown: () => apiCall('/dashboard/expense-breakdown'),
  getPayrollInsights: () => apiCall('/dashboard/payroll-insights'),
  getInventoryStatus: () => apiCall('/dashboard/inventory-status'),
  getAuditLogs: (params = {}) => apiCall(`/dashboard/audit-logs?${new URLSearchParams(params)}`)
};

// ==================== REAL-TIME SOCKET EVENTS ====================

// Invoice updates
socket.on('invoice_created', (data) => {
  console.log('New invoice created:', data);
  // Trigger UI update
  updateDashboard();
});

socket.on('invoice_updated', (data) => {
  console.log('Invoice updated:', data);
  updateDashboard();
});

socket.on('invoice_deleted', (data) => {
  console.log('Invoice deleted:', data);
  updateDashboard();
});

// ==================== REAL-TIME DATA UPDATES ====================

async function updateDashboard() {
  const stats = await dashboardAPI.getStats();
  if (stats.success) {
    updateKPICards(stats.data);
    updateCharts(stats.data);
  }
}

function updateKPICards(data) {
  const updateKPI = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) {
      const currentValue = parseFloat(element.textContent.replace(/[^0-9.-]+/g, '')) || 0;
      animateValue(element, currentValue, parseFloat(value), 1000);
    }
  };

  updateKPI('.kpi-cards .kpi-value:nth-child(1)', data.totalRevenue);
  updateKPI('.kpi-cards .kpi-value:nth-child(2)', data.netProfit);
  updateKPI('.kpi-cards .kpi-value:nth-child(3)', data.totalExpenses);
  updateKPI('.kpi-cards .kpi-value:nth-child(4)', data.cashFlow);
}

async function updateCharts(data) {
  // Update revenue vs expenses chart
  const revenueData = await dashboardAPI.getRevenueExpenses('monthly');
  if (revenueData.success && window.revenueExpenseChart) {
    window.revenueExpenseChart.data.labels = revenueData.data.map(d => new Date(d.date).toLocaleDateString());
    window.revenueExpenseChart.data.datasets[0].data = revenueData.data.map(d => d.revenue);
    window.revenueExpenseChart.data.datasets[1].data = revenueData.data.map(d => d.expenses);
    window.revenueExpenseChart.update();
  }
}

// Start real-time updates every 5 seconds
setInterval(updateDashboard, 5000);

// Subscribe to dashboard updates
socket.emit('subscribe_dashboard', { userId: getUserId() });

// Export APIs for global use
window.APIs = {
  auth,
  invoiceAPI,
  expenseAPI,
  receiptAPI,
  inventoryAPI,
  payrollAPI,
  dashboardAPI
};
