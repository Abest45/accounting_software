/**
 * 2FA and Reports Component Management
 * Handles UI for Two-Factor Authentication setup/login and Financial Reports
 */

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(JSON.parse(options.body)) : undefined;
  
  const response = await fetch(`http://localhost:5000${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
}

// ============ 2FA Setup Modal ============
const TwoFASetup = {
  secretData: null,
  backupCodes: null,

  init() {
    document.getElementById('enableTwoFA')?.addEventListener('click', () => this.openSetupModal());
    document.getElementById('disableTwoFA')?.addEventListener('click', () => this.openDisableModal());
    document.getElementById('close2FASetup')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modalBackdrop')?.addEventListener('click', () => this.closeModal());
    document.getElementById('next2FAStep')?.addEventListener('click', () => this.nextStep());
    document.getElementById('verify2FASetup')?.addEventListener('click', () => this.verifySetting());
    document.getElementById('downloadBackupCodes')?.addEventListener('click', () => this.downloadBackupCodes());
    this.checkStatus();
  },

  async openSetupModal() {
    try {
      const response = await apiCall('/api/2fa/setup', { method: 'POST' });
      this.secretData = response;
      this.backupCodes = response.backupCodes;
      
      // Display QR code and secret
      document.getElementById('qrCodeImage').src = response.qrCode;
      document.getElementById('manualSecret').textContent = response.secret;
      document.getElementById('setupStep1').style.display = 'block';
      document.getElementById('setupStep2').style.display = 'none';
      
      this.showModal();
    } catch (error) {
      alert('Failed to initialize 2FA setup: ' + error.message);
    }
  },

  nextStep() {
    document.getElementById('setupStep1').style.display = 'none';
    document.getElementById('setupStep2').style.display = 'block';
    
    // Display backup codes
    const backupCodesList = this.backupCodes
      .map((code, i) => `<span style="display:inline-block; width:45%; margin:5px 2.5%; font-family:monospace; font-size:12px;">${code}</span>`)
      .join('');
    document.getElementById('backupCodesDisplay').innerHTML = backupCodesList;
  },

  async verifySetting() {
    const token = document.getElementById('twoFATokenInput').value.trim();
    if (!token || token.length !== 6 || isNaN(token)) {
      alert('Please enter a valid 6-digit code');
      return;
    }

    try {
      await apiCall('/api/2fa/verify-setup', {
        method: 'POST',
        body: JSON.stringify({
          token,
          secret: this.secretData.secret,
          backupCodes: this.backupCodes
        })
      });

      alert('2FA has been successfully enabled! Your backup codes have been saved.');
      this.closeModal();
      this.checkStatus();
    } catch (error) {
      alert('Failed to verify code: ' + error.message);
    }
  },

  downloadBackupCodes() {
    const content = 'BACKUP CODES FOR 2FA\n\nSave these codes in a secure location.\nEach code can only be used once.\n\n' + 
                   this.backupCodes.join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', 'backup-codes.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  },

  async openDisableModal() {
    const password = prompt('Enter your password to disable 2FA:');
    if (!password) return;

    try {
      await apiCall('/api/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      alert('2FA has been disabled.');
      this.checkStatus();
    } catch (error) {
      alert('Failed to disable 2FA: ' + error.message);
    }
  },

  async checkStatus() {
    try {
      // Try to get 2FA status from user data or from an API call
      let is2FAEnabled = false;
      
      // Try localStorage first
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          is2FAEnabled = user.twoFactorEnabled || false;
        } catch (e) {
          // localStorage user data is not valid JSON
        }
      }
      
      // Also try to fetch from API
      try {
        const response = await apiCall('/api/auth/profile');
        if (response && response.user) {
          is2FAEnabled = response.user.twoFactorEnabled || false;
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      } catch (e) {
        // API call failed, use localStorage data
      }
      
      const statusEl = document.getElementById('twoFAStatus');
      const statusText = document.getElementById('twoFAStatusText');
      const enabledButtons = document.getElementById('twoFAEnabledButtons');
      const disabledButtons = document.getElementById('twoFADisabledButtons');

      if (statusEl && statusText && enabledButtons && disabledButtons) {
        if (is2FAEnabled) {
          statusText.textContent = 'Enabled';
          statusEl.style.background = '#d4edda';
          statusEl.style.color = '#155724';
          enabledButtons.style.display = 'block';
          disabledButtons.style.display = 'none';
        } else {
          statusText.textContent = 'Disabled';
          statusEl.style.background = '#f8d7da';
          statusEl.style.color = '#721c24';
          enabledButtons.style.display = 'none';
          disabledButtons.style.display = 'block';
        }
      }
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
    }
  },

  showModal() {
    document.getElementById('twoFASetupModal').style.display = 'block';
    document.getElementById('modalBackdrop').style.display = 'block';
  },

  closeModal() {
    document.getElementById('twoFASetupModal').style.display = 'none';
    document.getElementById('modalBackdrop').style.display = 'none';
    document.getElementById('twoFATokenInput').value = '';
  }
};

// ============ 2FA Login Modal ============
const TwoFALogin = {
  userId: null,

  init() {
    // Called from login form when 2FA is required
    document.getElementById('verify2FALogin')?.addEventListener('click', () => this.verifyLogin());
    document.getElementById('twoFALoginToken')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.verifyLogin();
    });

    // Close handlers (close button or backdrop click)
    document.getElementById('close2FALogin')?.addEventListener('click', () => this.close());
    document.getElementById('modalBackdrop')?.addEventListener('click', (e) => {
      // if backdrop visible, close modal
      const backdrop = document.getElementById('modalBackdrop');
      if (backdrop && backdrop.style.display !== 'none') this.close();
    });
  },

  show(userId) {
    this.userId = userId;
    this.keydownHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this.keydownHandler);

    const modal = document.getElementById('twoFALoginModal');
    const backdrop = document.getElementById('modalBackdrop');
    if (modal) modal.style.display = 'block';
    if (backdrop) backdrop.style.display = 'block';

    const tokenInput = document.getElementById('twoFALoginToken');
    tokenInput?.focus();
    document.getElementById('twoFALoginStatus').textContent = '';
  },

  async verifyLogin() {
    const tokenEl = document.getElementById('twoFALoginToken');
    const token = tokenEl.value.trim();
    const statusEl = document.getElementById('twoFALoginStatus');
    const spinner = document.getElementById('twoFALoginSpinner');
    const verifyBtn = document.getElementById('verify2FALogin');

    if (!token) {
      this.showError('Please enter a code');
      return;
    }

    // Set loading state
    verifyBtn.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';
    statusEl.textContent = '';

    try {
      const response = await apiCall('/api/2fa/verify-login', {
        method: 'POST',
        body: JSON.stringify({
          userId: this.userId,
          token
        })
      });

      // Store the session token returned from verification (consistent with SecurityManager)
      if (response.accessToken) {
        localStorage.setItem('sessionToken', response.accessToken);
      }
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      // Clear temporary 2FA state and close modal
      sessionStorage.removeItem('userId2FA');
      this.close();

      // Redirect to dashboard (consistent path)
      window.location.href = '/dashboard';
    } catch (error) {
      this.showError(error.message || 'Invalid code or backup code');
      tokenEl.value = '';
      tokenEl.focus();
    } finally {
      verifyBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
    }
  },

  showError(message) {
    document.getElementById('twoFALoginStatus').textContent = '❌ ' + message;
  },

  close() {
    const modal = document.getElementById('twoFALoginModal');
    const backdrop = document.getElementById('modalBackdrop');
    if (modal) modal.style.display = 'none';
    if (backdrop) backdrop.style.display = 'none';

    const tokenInput = document.getElementById('twoFALoginToken');
    if (tokenInput) {
      tokenInput.value = '';
    }

    // Remove keydown handler
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    // Restore focus to original field if available
    if (this.returnFocusSelector) {
      const el = document.querySelector(this.returnFocusSelector);
      if (el) el.focus();
    }

    // Clear returnFocusSelector
    this.returnFocusSelector = null;
  }
};

// ============ Report Download ============
const ReportDownload = {
  init() {
    // Invoice Report
    document.getElementById('downloadInvoicePDF')?.addEventListener('click', () => this.downloadReport('invoices', 'pdf'));
    document.getElementById('downloadInvoiceExcel')?.addEventListener('click', () => this.downloadReport('invoices', 'excel'));

    // P&L Report
    document.getElementById('downloadPLPDF')?.addEventListener('click', () => this.downloadReport('p-and-l', 'pdf'));
    document.getElementById('downloadPLExcel')?.addEventListener('click', () => this.downloadReport('p-and-l', 'excel'));

    // Payroll Report
    document.getElementById('downloadPayrollPDF')?.addEventListener('click', () => this.downloadReport('payroll', 'pdf'));
    document.getElementById('downloadPayrollExcel')?.addEventListener('click', () => this.downloadReport('payroll', 'excel'));

    this.setDefaultDates();
  },

  setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const formatDate = (date) => date.toISOString().split('T')[0];

    // Set default dates for all report types
    const dateFields = [
      ['invoiceStartDate', 'invoiceEndDate'],
      ['plStartDate', 'plEndDate'],
      ['payrollStartDate', 'payrollEndDate']
    ];

    dateFields.forEach(([startId, endId]) => {
      const startEl = document.getElementById(startId);
      const endEl = document.getElementById(endId);
      if (startEl) startEl.value = formatDate(thirtyDaysAgo);
      if (endEl) endEl.value = formatDate(today);
    });
  },

  async downloadReport(reportType, format) {
    let startDateId, endDateId;

    if (reportType === 'invoices') {
      startDateId = 'invoiceStartDate';
      endDateId = 'invoiceEndDate';
    } else if (reportType === 'p-and-l') {
      startDateId = 'plStartDate';
      endDateId = 'plEndDate';
    } else {
      startDateId = 'payrollStartDate';
      endDateId = 'payrollEndDate';
    }

    const startDate = document.getElementById(startDateId).value;
    const endDate = document.getElementById(endDateId).value;

    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date must be before end date');
      return;
    }

    try {
      const queryParams = new URLSearchParams({
        format,
        startDate,
        endDate
      });

      const response = await fetch(`/api/reports/${reportType}?${queryParams}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to download report');
      }

      // Determine file extension
      const extension = format === 'pdf' ? 'pdf' : 'xlsx';
      const filename = `${reportType}-${new Date().toISOString().split('T')[0]}.${extension}`;

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(`${reportType} report downloaded successfully!`);
    } catch (error) {
      alert('Failed to download report: ' + error.message);
    }
  }
};

// ============ Initialize on Page Load ============
document.addEventListener('DOMContentLoaded', () => {
  TwoFASetup.init();
  TwoFALogin.init();
  ReportDownload.init();
  TwoFASetup.checkStatus();
});

// Export for integration with login form
window.TwoFALogin = TwoFALogin;
window.TwoFASetup = TwoFASetup;
window.ReportDownload = ReportDownload;
