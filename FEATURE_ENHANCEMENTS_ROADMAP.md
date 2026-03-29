# Feature Enhancement Roadmap

## Overview

This document outlines recommended enhancements to build upon the current 2FA, Reports, and Notifications foundation. These features will provide greater business value and user engagement.

---

## Feature 1: Budget Management & Expense Tracking

### Objective
Implement budget planning, tracking, and alerts to help users monitor spending against configured budgets.

### User Stories

**US-1: Create Departmental Budgets**
- As a Finance Manager, I want to set monthly/quarterly/annual budgets by department
- So that I can track spending against planned allocations

**US-2: Real-time Budget Status**
- As a Finance Manager, I want to see current budget utilization percentage
- So that I can quickly identify over-budget departments

**US-3: Automatic Budget Alerts**
- As a Finance Manager, I want to receive notifications when expenses exceed 80% of budget
- So that I can take preventive action before over-spending

**US-4: Budget vs Actual Reporting**
- As a Finance Manager, I want to generate detailed Budget vs Actual reports
- So that I can analyze variance and plan next period budgets

### Implementation Plan

#### Backend Changes

**1. New Model: Budget**
```javascript
// backend/src/models/Budget.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Budget', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: false },
    department: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    period: { type: DataTypes.ENUM('monthly', 'quarterly', 'annual'), defaultValue: 'monthly' },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: false },
    alertThreshold: { type: DataTypes.FLOAT, defaultValue: 0.8 }, // 80%
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });
};
```

**2. Budget Controller**
```javascript
// backend/src/controllers/budget.js
- POST /api/budget/create - Create new budget
- PUT /api/budget/:id - Update budget
- GET /api/budget/list - List all user budgets
- GET /api/budget/:id/status - Get current budget status with utilization
- DELETE /api/budget/:id - Delete budget
- GET /api/budget/report - Budget vs Actual report
```

**3. Budget Service**
```javascript
// backend/src/services/budgetService.js
- calculateUtilization(budgetId) - Calculate current spending % of budget
- checkBudgetThreshold(budgetId) - Check if threshold exceeded
- generateBudgetVsActualReport(budgetId, format) - PDF/Excel report
- triggerBudgetAlert(userId, budget) - Send notification if over threshold
```

**4. Budget Routes**
```javascript
// backend/src/routes/budget.js
router.post('/create', auth, budgetController.createBudget);
router.get('/list', auth, budgetController.listBudgets);
router.get('/:id/status', auth, budgetController.getBudgetStatus);
router.put('/:id', auth, budgetController.updateBudget);
router.delete('/:id', auth, budgetController.deleteBudget);
router.get('/report', auth, budgetController.generateReport);
```

**5. Notification Trigger**
- Modify `backend/src/controllers/expenses.js` to check budgets on expense creation
- Trigger `notifyBudgetExceeded()` from notifications service when threshold hit

#### Frontend Changes

**1. Budget Management UI** (in Settings or new "Budgets" section)
```html
<!-- Budget List -->
- Display existing budgets in table format
- Show department, amount, period, current utilization %
- Color-code by utilization (green <50%, yellow 50-80%, red >80%)
- Action buttons: Edit, Delete, View Report

<!-- Create/Edit Budget Modal -->
- Department dropdown (auto-populated from expenses)
- Budget amount input
- Period selector (monthly/quarterly/annual)
- Alert threshold slider (50-100%)
- Start/End date pickers
- Save button
```

**2. Budget Dashboard Widget**
```html
<!-- In Main Dashboard -->
- Show top 5 budgets with utilization progress bars
- Quick stats: Total Budgeted, Total Spent, % Utilization
- Link to detailed Budget Report
```

**3. Budget vs Actual Report**
- Added to Report Download panel
- Shows line-by-line budget vs actual spending
- Calculates variance and % variance
- Download as PDF or Excel

### Example API Usage

```bash
# Create a budget
curl -X POST http://localhost:5000/api/budget/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "department": "Marketing",
    "amount": 50000,
    "period": "monthly",
    "startDate": "2026-02-01",
    "endDate": "2026-02-28",
    "alertThreshold": 0.85
  }'

# Get budget status
curl http://localhost:5000/api/budget/abc123/status \
  -H "Authorization: Bearer TOKEN"

# Response: {
#   "budget": { ... },
#   "totalSpent": 42000,
#   "utilization": 0.84,
#   "remainingAmount": 8000,
#   "alertTriggered": true
# }
```

### Notification Enhancement

**New Notification Type: `budgetExceeded`**
```html
Subject: Budget Alert: {Department} Budget at {Utilization}%

Dear {UserName},

Your {Department} department budget has reached {Utilization}% of the monthly allocation.

Budget Details:
- Department: {Department}
- Total Budget: ${Amount}
- Spent to Date: ${Spent}
- Remaining: ${Remaining}
- Period: {StartDate} to {EndDate}

Threshold Alert: {AlertThreshold}%

Please review recent expenses or consider revising the budget.

[View Budget Report]
```

---

## Feature 2: Notification Preferences & Settings

### Objective
Allow users to customize which notifications they receive and how often, reducing alert fatigue.

### User Stories

**US-1: Notification Type Preferences**
- As a User, I want to choose which notification types I receive
- So that I'm not overwhelmed with irrelevant alerts

**US-2: Notification Frequency**
- As a User, I want to set how often I receive notifications (real-time, daily digest, weekly)
- So that notifications fit my work style

**US-3: Notification Channel Preferences**
- As a User, I want to choose notification delivery methods (email, SMS, in-app)
- So that I can receive alerts through my preferred channels

**US-4: Quiet Hours**
- As a User, I want to set quiet hours when notifications should not be sent
- So that I'm not disturbed outside work hours

### Implementation Plan

#### Backend Changes

**1. New Model: NotificationPreference**
```javascript
// backend/src/models/NotificationPreference.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('NotificationPreference', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    
    // Notification types
    invoiceCreated: { type: DataTypes.BOOLEAN, defaultValue: true },
    invoiceOverdue: { type: DataTypes.BOOLEAN, defaultValue: true },
    invoicePaid: { type: DataTypes.BOOLEAN, defaultValue: true },
    expenseCreated: { type: DataTypes.BOOLEAN, defaultValue: false },
    expenseApproval: { type: DataTypes.BOOLEAN, defaultValue: true },
    inventoryLow: { type: DataTypes.BOOLEAN, defaultValue: true },
    payrollProcessed: { type: DataTypes.BOOLEAN, defaultValue: true },
    budgetExceeded: { type: DataTypes.BOOLEAN, defaultValue: true },
    systemAlert: { type: DataTypes.BOOLEAN, defaultValue: true },
    
    // Frequency
    frequency: { type: DataTypes.ENUM('immediate', 'daily', 'weekly', 'never'), defaultValue: 'immediate' },
    
    // Channels
    emailNotifications: { type: DataTypes.BOOLEAN, defaultValue: true },
    smsNotifications: { type: DataTypes.BOOLEAN, defaultValue: false },
    inAppNotifications: { type: DataTypes.BOOLEAN, defaultValue: true },
    
    // Quiet hours
    quietHoursEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    quietHoursStart: { type: DataTypes.STRING }, // HH:MM format
    quietHoursEnd: { type: DataTypes.STRING },   // HH:MM format
    quietHoursTimezone: { type: DataTypes.STRING, defaultValue: 'UTC' },
    
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });
};
```

**2. Notification Preference Controller**
```javascript
// backend/src/controllers/notificationPreference.js
- GET /api/notification-preferences - Get user preferences
- PUT /api/notification-preferences - Update preferences
- POST /api/notification-preferences/test-email - Send test notification
```

**3. Notification Service Enhancement**
```javascript
// Modify backend/src/services/notifications.js

// Before sending any notification:
// 1. Check if notification type is enabled in user preferences
// 2. Check if current time falls in quiet hours
// 3. If frequency is 'weekly/daily', queue for digest instead of sending immediately
// 4. Respect channel preferences (email/SMS/in-app)

async function sendEmail(userId, type, data) {
  const prefs = await NotificationPreference.findByPk(userId);
  
  // Check if this notification type is enabled
  if (!prefs[toCamelCase(type)]) return; // Silently skip
  
  // Check quiet hours
  if (this.isInQuietHours(prefs)) {
    // Queue for next quiet hours end time
    return;
  }
  
  // Send email
  // ... existing code ...
}
```

#### Frontend Changes

**1. Notification Preferences Panel** (in Settings)
```html
<div id="notificationPreferencesPanel">
  <h3>Notification Preferences</h3>
  
  <!-- Notification Types Toggle -->
  <div class="preference-group">
    <h4>Notification Types</h4>
    <label><input type="checkbox" id="pref_invoiceCreated" checked> Invoice Created</label>
    <label><input type="checkbox" id="pref_invoiceOverdue" checked> Invoice Overdue</label>
    <label><input type="checkbox" id="pref_invoicePaid" checked> Invoice Paid</label>
    <label><input type="checkbox" id="pref_expenseCreated"> Expense Created</label>
    <label><input type="checkbox" id="pref_expenseApproval" checked> Expense Needs Approval</label>
    <label><input type="checkbox" id="pref_inventoryLow" checked> Inventory Low</label>
    <label><input type="checkbox" id="pref_payrollProcessed" checked> Payroll Processed</label>
    <label><input type="checkbox" id="pref_budgetExceeded" checked> Budget Exceeded</label>
    <label><input type="checkbox" id="pref_systemAlert" checked> System Alerts</label>
  </div>
  
  <!-- Frequency Selection -->
  <div class="preference-group">
    <h4>Notification Frequency</h4>
    <label><input type="radio" name="frequency" value="immediate" checked> Immediate</label>
    <label><input type="radio" name="frequency" value="daily"> Daily Digest</label>
    <label><input type="radio" name="frequency" value="weekly"> Weekly Digest</label>
    <label><input type="radio" name="frequency" value="never"> Never</label>
  </div>
  
  <!-- Channel Preferences -->
  <div class="preference-group">
    <h4>Notification Channels</h4>
    <label><input type="checkbox" id="pref_email" checked> Email</label>
    <label><input type="checkbox" id="pref_sms"> SMS</label>
    <label><input type="checkbox" id="pref_inApp" checked> In-App</label>
  </div>
  
  <!-- Quiet Hours -->
  <div class="preference-group">
    <h4>Quiet Hours</h4>
    <label><input type="checkbox" id="quietHoursEnabled"> Enable Quiet Hours</label>
    <div id="quietHoursSettings" style="display:none; margin-left:20px;">
      <label>Start Time: <input type="time" id="quietHoursStart"></label>
      <label>End Time: <input type="time" id="quietHoursEnd"></label>
      <label>Timezone: <select id="quietHoursTimezone"></select></label>
    </div>
  </div>
  
  <!-- Test Notification -->
  <div class="preference-group">
    <button id="sendTestNotification" class="btn btn-primary">Send Test Email</button>
  </div>
  
  <!-- Save Button -->
  <button id="savePreferences" class="btn btn-primary">Save Preferences</button>
</div>
```

**2. In-App Notification Center**
```html
<!-- Dropdown/Panel showing recent notifications -->
<div id="notificationCenter">
  <div id="notificationBell" style="position:fixed; top:20px; left:20px;">
    <i class="fas fa-bell"></i>
    <span id="notificationBadge">0</span>
  </div>
  
  <div id="notificationDropdown" style="display:none;">
    <!-- List of recent notifications -->
    <div id="notificationsList"></div>
    <button id="clearAllNotifications">Clear All</button>
  </div>
</div>
```

**3. JavaScript Handler**
```javascript
// components-notification-preferences.js
const NotificationPreferences = {
  init() {
    // Load preferences
    // Set checkboxes/radios to current values
    // Add event listeners
    // Handle save
    // Handle test email
  },
  
  async savePreferences() {
    // Collect form data
    // Send PUT request to backend
    // Show success/error message
  },
  
  async sendTestNotification() {
    // POST to /api/notification-preferences/test-email
    // Show confirmation
  }
};
```

### Notification Digest Format

**Daily Digest Email (if frequency = daily)**
```
Subject: Your Daily Notification Digest - {Date}

Dear {UserName},

Here's a summary of your notifications for today:

INVOICES (3)
- Invoice INV-001 is overdue (Due: 2026-01-30)
- Invoice INV-002 was paid (Amount: $5,000)
- Invoice INV-003 was created (Amount: $2,500)

EXPENSES (2)
- Expense EXP-001 needs your approval
- Expense EXP-002 was approved by Manager

BUDGET ALERTS (1)
- Marketing budget at 85% ($42,500 of $50,000)

INVENTORY (1)
- Product SKU-001 is low (5 units left)

[View All Notifications]
```

---

## Implementation Priority

### Phase 1 (Week 1-2): Budget Management
1. Create Budget model and database migration
2. Implement Budget CRUD endpoints
3. Add budget utilization calculation
4. Create notification trigger for budget exceeded
5. Build frontend budget management UI
6. Add budget dashboard widget

### Phase 2 (Week 3-4): Notification Preferences
1. Create NotificationPreference model
2. Implement preference endpoints
3. Update notification service to check preferences
4. Build frontend preferences panel
5. Add in-app notification center
6. Implement quiet hours logic

### Phase 3 (Week 5): Polish & Testing
1. Comprehensive testing of both features
2. Performance optimization
3. Documentation updates
4. User training materials

---

## Estimated Effort

| Task | Frontend | Backend | Testing | Total |
|------|----------|---------|---------|-------|
| Budget Management | 16h | 24h | 12h | 52h |
| Notification Preferences | 12h | 16h | 8h | 36h |
| Testing & Polish | 8h | 8h | 16h | 32h |
| **Total** | **36h** | **48h** | **36h** | **120h** |

---

## Success Metrics

### Budget Management
- Users can create/edit/delete budgets
- Budget alerts trigger within 5 minutes of threshold exceeded
- 90% email delivery success rate
- <500ms API response time for budget queries

### Notification Preferences
- Users save preferences successfully
- 100% compliance with preference settings
- <100ms preference lookup time
- Test emails deliver within 1 minute

---

## User Benefits

### Budget Management
✅ Prevent over-spending and unexpected expenses
✅ Better financial planning and forecasting
✅ Real-time visibility into budget utilization
✅ Automated alerts reduce manual monitoring
✅ Historical data for trend analysis

### Notification Preferences
✅ Reduced alert fatigue
✅ Better work-life balance (quiet hours)
✅ Personalized notification experience
✅ Flexible frequency to match work style
✅ Control over communication channels

---

## Conclusion

These two features significantly enhance the platform by adding financial governance (budgets) and user experience (notification control). Combined with existing 2FA and reporting features, they provide a comprehensive financial management solution.
