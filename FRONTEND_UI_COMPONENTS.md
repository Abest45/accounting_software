# Frontend UI Components Documentation

## Overview

This document describes the frontend UI components for Two-Factor Authentication (2FA) and Financial Reports that have been added to the FinAnalytics application.

## Files Created

### 1. **components-2fa-reports.html**
HTML structure for all UI components (modals and panels).

### 2. **components-2fa-reports.js**
JavaScript logic for component functionality and event handling.

---

## Components

### 1. 2FA Setup Modal

**Purpose:** Allows users to enable two-factor authentication on their account.

**Features:**
- **Step 1: QR Code Display**
  - Shows QR code for scanning with authenticator app
  - Displays manual entry secret code
  - "Next Step" button to proceed

- **Step 2: Verification**
  - Input field for 6-digit code from authenticator
  - Displays 10 backup codes
  - "Download Backup Codes" button to save as text file
  - "Enable 2FA" button to confirm setup

**Integration:**
- Triggered by "Enable 2FA" button in 2FA Settings section
- Modal ID: `#twoFASetupModal`
- Backdrop ID: `#modalBackdrop`

**API Endpoints Used:**
- `POST /api/2fa/setup` - Initialize 2FA setup, returns QR code and secret
- `POST /api/2fa/verify-setup` - Verify token and enable 2FA

**Usage Example:**
```javascript
// Trigger manually if needed
TwoFASetup.openSetupModal();
```

---

### 2. 2FA Login Challenge Modal

**Purpose:** Prompts users for 2FA verification during login if 2FA is enabled.

**Features:**
- Single input field for 6-digit code or backup code
- Error message display
- Real-time status feedback

**Integration:**
- Automatically shown when login response includes `requires2FA: true`
- Modal ID: `#twoFALoginModal`
- Shown via `TwoFALogin.show(userId)`

**API Endpoint Used:**
- `POST /api/2fa/verify-login` - Verify 2FA token/backup code and complete login

**Usage Example:**
```javascript
// Called automatically from login form
TwoFALogin.show(userId);

// Manual close if needed
TwoFALogin.close();
```

---

### 3. 2FA Settings Component

**Purpose:** Displays 2FA status and provides enable/disable controls.

**Features:**
- Status badge (Enabled/Disabled with color coding)
- "Enable 2FA" button when disabled
- "Disable 2FA" button when enabled (requires password confirmation)
- Description text

**Integration:**
- Located in Settings section (`#settings`)
- Automatically checks status on page load
- Status updates after setup or disable actions

**HTML Location:** `index.html` lines ~1505-1525

**Usage:**
- Status auto-updates via `TwoFASetup.checkStatus()`
- No manual interaction needed

---

### 4. Report Download Panel

**Purpose:** Provides downloadable financial reports in PDF and Excel formats.

**Features:**
- Three report types:
  - **Invoice Report** - All invoices with line items
  - **P&L Report** - Profit and Loss statement
  - **Payroll Report** - Employee payroll details

- For each report:
  - Start date input
  - End date input
  - PDF download button (blue)
  - Excel download button (green)

- Default date range: Last 30 days

**Integration:**
- Located in Financial Reports section (`#financial-reports`)
- Auto-initializes with 30-day date range on page load
- Embedded inline with other financial reports

**HTML Location:** `index.html` lines ~237-290

**API Endpoints Used:**
- `GET /api/reports/invoices?format={pdf|excel}&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /api/reports/p-and-l?format={pdf|excel}&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /api/reports/payroll?format={pdf|excel}&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

**Usage:**
```javascript
// Trigger manually if needed
ReportDownload.downloadReport('invoices', 'pdf');

// Set default dates
ReportDownload.setDefaultDates();
```

---

## Component Classes

### TwoFASetup
Manages 2FA setup workflow.

**Methods:**
- `init()` - Initialize event listeners
- `openSetupModal()` - Start 2FA setup process
- `nextStep()` - Move to verification step
- `verifySetting()` - Verify and enable 2FA
- `downloadBackupCodes()` - Download backup codes as text file
- `openDisableModal()` - Disable 2FA with password confirmation
- `checkStatus()` - Check and display current 2FA status
- `showModal()` - Display the setup modal
- `closeModal()` - Close the setup modal

**Properties:**
- `secretData` - Secret key and QR code from API
- `backupCodes` - Array of 10 backup codes

---

### TwoFALogin
Manages 2FA login verification.

**Methods:**
- `init()` - Initialize event listeners
- `show(userId)` - Display login challenge modal
- `verifyLogin()` - Verify token/backup code and complete login
- `showError(message)` - Display error message
- `close()` - Close the login modal

**Properties:**
- `userId` - User ID for verification

---

### ReportDownload
Manages financial report downloads.

**Methods:**
- `init()` - Initialize event listeners
- `setDefaultDates()` - Set date inputs to last 30 days
- `downloadReport(reportType, format)` - Download report as PDF or Excel

**Report Types:**
- `invoices` - Invoice report
- `p-and-l` - Profit and Loss report
- `payroll` - Payroll report

**Formats:**
- `pdf` - PDF document
- `excel` - Excel spreadsheet

---

## Styling & Appearance

### Modal Styling
- **Position:** Fixed, centered on screen
- **Z-index:** 1000 (modal), 999 (backdrop)
- **Width:** 90% with max-width constraints
- **Background:** White with rounded corners and shadow
- **Close button:** Top-right corner

### Report Panel Styling
- **Grid Layout:** Responsive (1-3 columns based on screen size)
- **Cards:** White background with border
- **Buttons:** Blue (PDF), Green (Excel)
- **Date inputs:** HTML5 date picker

### 2FA Settings Styling
- **Status Badge:** Color-coded (green for enabled, red for disabled)
- **Buttons:** Primary blue for enable, danger red for disable

---

## Integration with Existing Files

### index.html
- 2FA Settings component added to Settings section
- Report Download panel added to Financial Reports section
- Modals added before closing body tag
- Script reference added

### auth-forms.html
- 2FA Login modal added
- Script reference added

### auth-forms.js
- Login handler updated to check for `requires2FA` flag
- Automatically shows 2FA modal when required

### finance.js
- No changes needed; components are self-contained

---

## API Integration

### Authentication
- All API calls use `credentials: 'include'` to send httpOnly cookies
- Access token checked automatically; 401 responses trigger refresh
- User must be authenticated to access 2FA setup or report downloads

### Error Handling
- HTTP errors are caught and displayed as user-friendly messages
- Failed downloads show alert with error message
- Failed 2FA verification shows inline error text

---

## User Flow

### Enabling 2FA
1. User navigates to Settings
2. Clicks "Enable 2FA" button
3. Modal opens with QR code
4. User scans with authenticator app
5. User clicks "Next Step"
6. User enters 6-digit code
7. User downloads or notes backup codes
8. User clicks "Enable 2FA"
9. Status updates to "Enabled"

### Logging In with 2FA
1. User enters email and password in login form
2. Server returns `requires2FA: true`
3. Login modal appears automatically
4. User enters 6-digit code OR backup code
5. Verification succeeds
6. User redirected to dashboard
7. Session established with JWT token

### Downloading Reports
1. User navigates to Financial Reports
2. Selects date range (default: last 30 days)
3. Selects format (PDF or Excel)
4. Clicks download button
5. Report generates server-side
6. File downloads to user's computer
7. Browser handles download naturally

---

## Troubleshooting

### Modal Not Appearing
- Check browser console for JavaScript errors
- Verify `components-2fa-reports.js` is loaded
- Check z-index of other page elements

### API Calls Failing
- Verify backend server is running on port 5000
- Check CORS configuration in backend
- Verify user is authenticated (check localStorage.accessToken)

### Date Range Issues
- Ensure start date is before end date
- Dates must be in YYYY-MM-DD format
- Historical dates may have no data

### Download Not Triggering
- Check browser's download settings
- Verify pop-ups are not blocked
- Check browser console for fetch errors

---

## Security Considerations

### 2FA
- Backup codes are single-use and tracked server-side
- 6-digit codes expire after 30 seconds
- Codes include 1 backward/forward step tolerance for clock skew
- Disabled only with password confirmation

### Reports
- User-scoped: Can only download their own data
- Date range filtering reduces data exposure
- Files streamed as downloads, not stored server-side
- Access token required for each request

### Modals
- Backdrop click closes modals
- X button closes modals
- No data persists in localStorage
- Sensitive data cleared on modal close

---

## Future Enhancements

1. **Notification Preferences Panel**
   - Email notification toggles
   - Notification frequency settings
   - Opt-in/opt-out controls

2. **Bulk Report Download**
   - Select multiple report types
   - Zip file with all reports
   - Scheduled report delivery

3. **2FA Recovery Options**
   - Email recovery codes
   - SMS backup option
   - Account recovery assistant

4. **Advanced Reporting**
   - Custom date ranges with presets
   - Report templates/formatting
   - Email report delivery
   - Report scheduling

5. **Real-time Download Status**
   - Progress bar for large reports
   - ETA calculation
   - Retry on failure

---

## Testing

### Manual Testing Checklist
- [ ] 2FA setup completes successfully
- [ ] Backup codes download correctly
- [ ] 2FA disabled with password
- [ ] Login requires 2FA challenge
- [ ] Backup codes work as substitute
- [ ] Invoice report downloads as PDF
- [ ] Invoice report downloads as Excel
- [ ] P&L report downloads as PDF
- [ ] P&L report downloads as Excel
- [ ] Payroll report downloads as PDF
- [ ] Payroll report downloads as Excel
- [ ] Date filtering works correctly
- [ ] Invalid date ranges rejected
- [ ] User can't see other users' data

### Automated Testing
See `backend/src/tests/twoFactorAuth.test.js` and `backend/src/tests/reports.test.js` for Jest test suites.

---

## References

- [Auth Components](AUTH_SYSTEM_IMPLEMENTATION.md)
- [2FA Backend Implementation](FEATURES_2FA_REPORTS_NOTIFICATIONS.md)
- [Report Generation Backend](FEATURES_2FA_REPORTS_NOTIFICATIONS.md)
- [Backend API Documentation](backend/INTEGRATION.md)
