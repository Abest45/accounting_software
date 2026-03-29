# Quick Reference: Frontend UI Components

## Setup & Usage

### Include in HTML
```html
<!-- At end of body, before closing tag -->
<script src="components-2fa-reports.js"></script>
```

### Initialize Automatically
Components auto-initialize on page load via `DOMContentLoaded` event.

---

## Component Summary

| Component | Location | Trigger | Purpose |
|-----------|----------|---------|---------|
| 2FA Setup Modal | Settings | "Enable 2FA" button | Configure 2FA with QR code |
| 2FA Login Modal | Login | Auto-show if 2FA enabled | Verify 2FA during login |
| 2FA Settings | Settings | Page load | Display 2FA status |
| Report Panel | Financial Reports | Page load | Download invoice/P&L/payroll reports |

---

## 2FA Setup - User Steps

1. Go to Settings
2. Click "Enable 2FA"
3. Modal appears with QR code
4. Scan with authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
5. Click "Next Step"
6. Enter 6-digit code from app
7. Download or save backup codes
8. Click "Enable 2FA"
9. Status changes to "Enabled"

**Backup Code Usage:** If phone is lost, user can login with any backup code instead of 6-digit code.

---

## 2FA Login - User Steps

1. Login normally (email + password)
2. If 2FA enabled, modal appears automatically
3. Enter either:
   - 6-digit code from authenticator app, OR
   - One of 10 backup codes
4. Click "Verify"
5. Logged in and redirected to dashboard

---

## Report Download - User Steps

1. Go to Financial Reports
2. For each report type (Invoice, P&L, Payroll):
   - Start Date: Pick date or use default (30 days ago)
   - End Date: Pick date or use default (today)
3. Click "PDF" or "Excel"
4. File downloads automatically
5. Open from Downloads folder

---

## JavaScript API

### Access Global Classes
```javascript
// In browser console or any script on page
window.TwoFASetup
window.TwoFALogin
window.ReportDownload
```

### Manual Trigger Examples

#### Enable 2FA Setup
```javascript
TwoFASetup.openSetupModal();
```

#### Show 2FA Login Challenge
```javascript
TwoFALogin.show('user-id-here');
```

#### Download Report
```javascript
ReportDownload.downloadReport('invoices', 'pdf');
ReportDownload.downloadReport('p-and-l', 'excel');
ReportDownload.downloadReport('payroll', 'pdf');
```

#### Check 2FA Status
```javascript
TwoFASetup.checkStatus();
```

---

## Common Issues & Solutions

### Issue: Modal doesn't appear
**Solution:** Check browser console for errors. Ensure `components-2fa-reports.js` is loaded.

### Issue: API calls fail with 401
**Solution:** User not authenticated. Verify JWT token in localStorage.

### Issue: Date inputs not working
**Solution:** Older browser? Use YYYY-MM-DD format manually instead of date picker.

### Issue: Download doesn't start
**Solution:** Check browser download settings. Try different browser.

---

## API Endpoints Called

### 2FA
- `POST /api/2fa/setup` - Initialize setup
- `POST /api/2fa/verify-setup` - Enable 2FA
- `POST /api/2fa/verify-login` - Verify login
- `POST /api/2fa/disable` - Disable 2FA
- `GET /api/auth/profile` - Get user profile (for status)

### Reports
- `GET /api/reports/invoices?format={pdf|excel}&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /api/reports/p-and-l?format={pdf|excel}&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /api/reports/payroll?format={pdf|excel}&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

---

## Styling Customization

### Modal Styling
Modals use inline styles. To customize:

```javascript
// In console
const modal = document.getElementById('twoFASetupModal');
modal.style.width = '600px'; // Wider
modal.style.padding = '40px'; // More padding
// etc...
```

### Button Styling
Buttons use `.btn` and `.btn-primary` classes. Customize in CSS:

```css
.btn-primary {
  background-color: #007bff; /* Change blue */
  padding: 12px 20px; /* Change size */
  border-radius: 8px; /* Change shape */
}
```

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Modals | ✅ | ✅ | ✅ | ✅ |
| Date Input | ✅ | ✅ | ✅ | ✅ |
| Fetch API | ✅ | ✅ | ✅ | ✅ |
| File Download | ✅ | ✅ | ✅ | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ |

---

## Security Notes

1. **Never** store sensitive data in localStorage
2. **Always** use HTTPS in production (for httpOnly cookies)
3. **Backup codes** are single-use; save securely
4. **QR codes** expire after modal closes
5. **Reports** only show user's own data
6. **Modals** clear data when closed

---

## Performance Tips

1. **Large Reports:** Set smaller date range (< 1 year)
2. **Multiple Downloads:** Wait for one to complete before next
3. **Slow Connection:** PDF may take 5-10 seconds to generate
4. **Mobile:** Use WiFi for faster downloads
5. **Cache:** Reports not cached; always fresh data

---

## Troubleshooting Commands

### Check if components loaded
```javascript
typeof TwoFASetup !== 'undefined' // Should be true
typeof TwoFALogin !== 'undefined' // Should be true
typeof ReportDownload !== 'undefined' // Should be true
```

### Check authentication
```javascript
localStorage.getItem('accessToken') // Should have value
localStorage.getItem('user') // Should be JSON string
```

### Test API call
```javascript
fetch('http://localhost:5000/api/auth/profile', {
  credentials: 'include'
}).then(r => r.json()).then(d => console.log(d))
```

### Check 2FA modal HTML
```javascript
document.getElementById('twoFASetupModal').style.display // Should see it
```

---

## File Structure

```
components-2fa-reports.js
  ├── Helper function: apiCall()
  ├── Class: TwoFASetup
  │   ├── Properties: secretData, backupCodes
  │   └── Methods: 8 public methods
  ├── Class: TwoFALogin
  │   ├── Property: userId
  │   └── Methods: 5 public methods
  ├── Class: ReportDownload
  │   └── Methods: 3 public methods
  └── Initialization code on DOMContentLoaded
```

---

## Event Flow

### 2FA Setup Flow
```
1. User clicks "Enable 2FA" button
   → TwoFASetup.openSetupModal()
   
2. Modal opens with QR code
   → Displays secret, backup codes
   
3. User scans QR code
   → (External authenticator app)
   
4. User clicks "Next Step"
   → Hides step 1, shows step 2
   
5. User enters 6-digit code
   → TwoFASetup.verifySetting()
   
6. POST request to /api/2fa/verify-setup
   → Server verifies and enables 2FA
   
7. Response success
   → Modal closes
   → Status updates to "Enabled"
```

### Report Download Flow
```
1. User selects dates and format
   
2. User clicks download button
   → ReportDownload.downloadReport(type, format)
   
3. GET request to /api/reports/{type}
   → Query params: format, startDate, endDate
   
4. Server generates file
   → PDF or Excel file created
   
5. File sent as blob
   → Browser handles download
   
6. File appears in Downloads folder
```

---

## FAQ

**Q: How long are 2FA codes valid?**
A: 30 seconds. Each code refreshes every 30 seconds.

**Q: Can I use the same backup code twice?**
A: No. Each backup code is single-use. Once used, it's removed from your account.

**Q: What happens if I lose my authenticator app?**
A: Use one of your 10 backup codes to login. Consider re-enabling 2FA after recovery.

**Q: Can I download multiple reports at once?**
A: Yes. Download one, then start another while it's downloading (parallel).

**Q: Are reports stored on the server?**
A: No. Reports are generated on-demand and streamed directly to your browser. Each download is fresh data.

**Q: Do reports include confidential data?**
A: Only your own data. You cannot see other users' invoices or expenses.

**Q: Can I schedule report delivery?**
A: Not yet. Future enhancement will add email scheduling.

**Q: What if download fails?**
A: Try again. Check browser console for errors. Ensure date range is valid (start < end).

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Escape` | Close modals |
| `Enter` | Submit 2FA code |
| `Tab` | Navigate form fields |
| `Ctrl+C` | Copy backup code |

---

## Environment Variables

None needed for frontend. Components use:
- Hostname: `localhost:5000` (for local dev)
- Production: Change in `components-2fa-reports.js` line 8

```javascript
// Current (local)
const url = `http://localhost:5000${endpoint}`;

// For production, change to:
const url = `https://api.yourdomain.com${endpoint}`;
```

---

## Future Roadmap

- [ ] In-app notification center
- [ ] Notification preferences panel
- [ ] Budget management dashboard
- [ ] Budget alerts
- [ ] Report scheduling
- [ ] Email digest delivery
- [ ] SMS notifications
- [ ] Slack integration
- [ ] Mobile app components
- [ ] Advanced filtering

---

## Support & Documentation

- **Main Docs:** See [FRONTEND_UI_COMPONENTS.md](FRONTEND_UI_COMPONENTS.md)
- **API Docs:** See [backend/INTEGRATION.md](backend/INTEGRATION.md)
- **Backend Features:** See [FEATURES_2FA_REPORTS_NOTIFICATIONS.md](backend/FEATURES_2FA_REPORTS_NOTIFICATIONS.md)
- **Enhancements:** See [FEATURE_ENHANCEMENTS_ROADMAP.md](FEATURE_ENHANCEMENTS_ROADMAP.md)

---

**Version:** 1.0
**Last Updated:** February 1, 2026
**Status:** Production Ready ✅
