/* ========================================
   FINANALYTICS AUTHENTICATION SYSTEM
   Secure Form Management & Validation
   ======================================== */

// ==================
// CONFIGURATION
// ==================

const CONFIG = {
    API_BASE_URL: 'http://localhost:5000/api',
    FORM_TIMEOUT: 30000,
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 1800000, // 30 minutes
    PASSWORD_MIN_LENGTH: 8,
    ADMIN_PASSWORD_MIN_LENGTH: 12,
    OTP_LENGTH: 6,
    TOKEN_REFRESH_INTERVAL: 300000, // 5 minutes
    CSRF_TOKEN_NAME: 'csrf-token',
};

// ==================
// SECURITY UTILITIES
// ==================

class SecurityManager {
    constructor() {
        this.csrfToken = null;
        this.sessionToken = null;
        this.isInitialized = false;
    }

    /**
     * Initialize security manager
     */
    async init() {
        if (this.isInitialized) return;
        
        this.generateCSRFToken();
        this.loadSessionFromStorage();
        this.setUpSecurityHeaders();
        this.isInitialized = true;
    }

    /**
     * Generate CSRF token
     */
    generateCSRFToken() {
        const token = this.generateRandomToken(32);
        this.csrfToken = token;
        sessionStorage.setItem(CONFIG.CSRF_TOKEN_NAME, token);
    }

    /**
     * Get CSRF token
     */
    getCSRFToken() {
        return this.csrfToken || sessionStorage.getItem(CONFIG.CSRF_TOKEN_NAME);
    }

    /**
     * Generate random token
     */
    generateRandomToken(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
            token += chars[array[i] % chars.length];
        }
        return token;
    }

    /**
     * Set up security headers
     */
    setUpSecurityHeaders() {
        // CSP meta tag
        const cspMeta = document.createElement('meta');
        cspMeta.httpEquiv = 'Content-Security-Policy';
        cspMeta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:;";
        document.head.appendChild(cspMeta);
    }

    /**
     * Load session from storage
     */
    loadSessionFromStorage() {
        this.sessionToken = localStorage.getItem('sessionToken');
    }

    /**
     * Save session to storage
     */
    saveSessionToStorage(token) {
        this.sessionToken = token;
        localStorage.setItem('sessionToken', token);
    }

    /**
     * Clear session
     */
    clearSession() {
        this.sessionToken = null;
        localStorage.removeItem('sessionToken');
        sessionStorage.removeItem(CONFIG.CSRF_TOKEN_NAME);
    }

    /**
     * Validate input against XSS
     */
    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Validate password strength
     */
    validatePasswordStrength(password, isAdmin = false) {
        const minLength = isAdmin ? CONFIG.ADMIN_PASSWORD_MIN_LENGTH : CONFIG.PASSWORD_MIN_LENGTH;
        const requirements = {
            length: password.length >= minLength,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        };

        if (isAdmin) {
            requirements.numberCount = (password.match(/\d/g) || []).length >= 2;
            requirements.specialCount = (password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length >= 2;
        }

        return requirements;
    }

    /**
     * Calculate password strength
     */
    calculatePasswordStrength(password, isAdmin = false) {
        const requirements = this.validatePasswordStrength(password, isAdmin);
        const metRequirements = Object.values(requirements).filter(v => v).length;
        const totalRequirements = Object.keys(requirements).length;
        const percentage = (metRequirements / totalRequirements) * 100;

        if (percentage < 40) return 'weak';
        if (percentage < 70) return 'fair';
        if (percentage < 100) return 'good';
        return 'strong';
    }

    /**
     * Validate phone number
     */
    isValidPhone(phone) {
        const re = /^[\d+\-\s()]+$/;
        return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }

    /**
     * Rate limit check
     */
    checkRateLimit(key) {
        const attempts = JSON.parse(localStorage.getItem(`attempts_${key}`) || '[]');
        const now = Date.now();
        const recentAttempts = attempts.filter(time => now - time < CONFIG.LOCKOUT_DURATION);

        if (recentAttempts.length >= CONFIG.MAX_ATTEMPTS) {
            const nextAvailable = recentAttempts[0] + CONFIG.LOCKOUT_DURATION;
            return {
                isLocked: true,
                remainingTime: nextAvailable - now,
            };
        }

        return { isLocked: false };
    }

    /**
     * Record attempt
     */
    recordAttempt(key) {
        const attempts = JSON.parse(localStorage.getItem(`attempts_${key}`) || '[]');
        attempts.push(Date.now());
        localStorage.setItem(`attempts_${key}`, JSON.stringify(attempts));
    }

    /**
     * Clear attempts
     */
    clearAttempts(key) {
        localStorage.removeItem(`attempts_${key}`);
    }
}

// ==================
// FORM MANAGER
// ==================

class FormManager {
    constructor() {
        this.security = new SecurityManager();
        this.currentUserType = 'user';
        this.forms = {};
        this.isInitialized = false;
    }

    /**
     * Initialize form manager
     */
    async init() {
        if (this.isInitialized) return;

        await this.security.init();
        this.cacheElements();
        this.attachEventListeners();
        this.isInitialized = true;
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.userTypeButtons = document.querySelectorAll('.user-type-btn');
        this.userTypeForms = {
            user: document.querySelectorAll('.user-forms'),
            admin: document.querySelectorAll('.admin-forms'),
        };
        this.forms = {
            userLogin: document.getElementById('userLoginForm'),
            userSignup: document.getElementById('userSignupForm'),
            adminLogin: document.getElementById('adminLoginForm'),
            adminSignup: document.getElementById('adminSignupForm'),
            passwordRecovery: document.getElementById('passwordRecoveryForm'),
            passwordReset: document.getElementById('passwordResetForm'),
        };
        this.modal = document.getElementById('passwordRecoveryModal');
        this.modalSteps = document.querySelectorAll('.modal-step');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // User type selector
        this.userTypeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchUserType(btn.dataset.type));
        });

        // Form submissions
        Object.values(this.forms).forEach(form => {
            if (form) {
                form.addEventListener('submit', (e) => this.handleFormSubmit(e));
            }
        });

        // Toggle form buttons
        document.querySelectorAll('.toggle-form-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleForm(btn.dataset.target);
            });
        });

        // Password visibility toggle
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', (e) => this.togglePasswordVisibility(e));
        });

        // Forgot password links
        document.querySelectorAll('.forgot-password-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.openPasswordRecovery(link.dataset.type);
            });
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        });

        // Modal click outside
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Password recovery resend
        const resendBtn = document.getElementById('resendRecoveryBtn');
        if (resendBtn) {
            resendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showModalStep(1);
                const recoveryForm = document.getElementById('passwordRecoveryForm');
                if (recoveryForm) {
                    recoveryForm.reset();
                }
            });
        }

        // Real-time validation
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => {
                if (input.classList.contains('error')) {
                    this.validateField(input);
                }
                if (input.type === 'password' && input.name === 'password') {
                    this.updatePasswordStrength(input);
                }
            });
        });
    }

    /**
     * Switch user type
     */
    switchUserType(type) {
        this.currentUserType = type;
        
        this.userTypeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        this.userTypeForms.user.forEach(el => el.classList.toggle('active', type === 'user'));
        this.userTypeForms.admin.forEach(el => el.classList.toggle('active', type === 'admin'));

        // Reset forms
        this.forms.userLogin.reset();
        this.forms.userSignup.reset();
        this.forms.adminLogin.reset();
        this.forms.adminSignup.reset();

        // Clear messages
        document.querySelectorAll('.form-message').forEach(msg => {
            msg.classList.remove('show', 'success', 'error', 'warning', 'info');
        });
    }

    /**
     * Toggle form visibility
     */
    toggleForm(targetFormId) {
        const targetForm = document.getElementById(targetFormId);
        if (!targetForm) {
            console.warn(`Form ${targetFormId} not found`);
            return;
        }

        const parentGroup = targetForm.closest('.form-group');
        if (!parentGroup) return;

        const allForms = parentGroup.querySelectorAll('.auth-form');
        allForms.forEach(form => {
            form.classList.remove('active');
        });

        targetForm.classList.add('active');
        targetForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(e) {
        e.preventDefault();
        const button = e.currentTarget;
        const inputGroup = button.closest('.input-group');
        const input = inputGroup?.querySelector('input[type="password"], input[type="text"]');
        
        if (!input) return;
        
        if (input.type === 'password') {
            input.type = 'text';
            button.classList.add('show');
        } else {
            input.type = 'password';
            button.classList.remove('show');
        }
    }

    /**
     * Validate field
     */
    validateField(field) {
        const errors = [];

        if (!field.value.trim()) {
            errors.push('This field is required');
        } else {
            switch (field.type) {
                case 'email':
                    if (!this.security.isValidEmail(field.value)) {
                        errors.push('Please enter a valid email address');
                    }
                    break;
                case 'tel':
                    if (!this.security.isValidPhone(field.value)) {
                        errors.push('Please enter a valid phone number');
                    }
                    break;
                case 'password':
                    if (field.name === 'password') {
                        const isAdmin = this.currentUserType === 'admin';
                        const minLength = isAdmin ? CONFIG.ADMIN_PASSWORD_MIN_LENGTH : CONFIG.PASSWORD_MIN_LENGTH;
                        if (field.value.length < minLength) {
                            errors.push(`Password must be at least ${minLength} characters`);
                        }
                    }
                    break;
                case 'text':
                    if (field.name === 'phone' && !this.security.isValidPhone(field.value)) {
                        errors.push('Please enter a valid phone number');
                    }
                    break;
                case 'checkbox':
                    if (field.name === 'terms' && !field.checked) {
                        errors.push('You must agree to the terms');
                    }
                    break;
            }

            // Check confirm password
            if (field.name === 'confirmPassword') {
                const passwordField = field.form.querySelector('input[name="password"]');
                if (field.value !== passwordField.value) {
                    errors.push('Passwords do not match');
                }
            }
        }

        this.displayFieldError(field, errors);
        return errors.length === 0;
    }

    /**
     * Display field error
     */
    displayFieldError(field, errors) {
        const fieldWrapper = field.closest('.form-field');
        const errorElement = fieldWrapper?.querySelector('.field-error');
        
        if (errors.length > 0) {
            field.classList.remove('success');
            field.classList.add('error');
            if (errorElement) {
                errorElement.textContent = errors[0];
                errorElement.classList.add('show');
            }
        } else {
            field.classList.remove('error');
            if (field.type === 'email' || field.type === 'tel') {
                field.classList.add('success');
            }
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.classList.remove('show');
            }
        }
    }

    /**
     * Update password strength
     */
    updatePasswordStrength(field) {
        const form = field.form;
        const isAdmin = this.currentUserType === 'admin';
        const strength = this.security.calculatePasswordStrength(field.value, isAdmin);
        const requirements = this.security.validatePasswordStrength(field.value, isAdmin);

        // Find the closest password-strength div
        const fieldWrapper = field.closest('.form-field');
        const strengthDiv = fieldWrapper?.querySelector('.password-strength');
        
        if (strengthDiv) {
            strengthDiv.classList.remove('strength-weak', 'strength-fair', 'strength-good', 'strength-strong');
            strengthDiv.classList.add(`strength-${strength}`);
            strengthDiv.classList.add('show');
            const strengthText = strengthDiv.querySelector('.strength-text strong');
            if (strengthText) {
                strengthText.textContent = strength.charAt(0).toUpperCase() + strength.slice(1);
            }
        }

        // Update requirements
        const requirementsDiv = form.querySelector('.password-requirements');
        if (requirementsDiv) {
            requirementsDiv.classList.add('show');
            const requirementItems = requirementsDiv.querySelectorAll('li');
            requirementItems.forEach(li => {
                const req = li.dataset.requirement;
                li.classList.toggle('met', requirements[req]);
            });
        }
    }

    /**
     * Validate form
     */
    validateForm(form) {
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    /**
     * Handle form submission
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formId = form.id;

        // Validate form
        if (!this.validateForm(form)) {
            this.showFormMessage(form, 'Please fix the errors above', 'error');
            return;
        }

        // Rate limit check
        const limitCheck = this.security.checkRateLimit(form.id);
        if (limitCheck.isLocked) {
            const minutes = Math.ceil(limitCheck.remainingTime / 60000);
            this.showFormMessage(form, `Too many attempts. Please try again in ${minutes} minutes.`, 'warning');
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            // Record attempt
            this.security.recordAttempt(form.id);

            // Prepare form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Add CSRF token
            const csrfToken = this.security.getCSRFToken();

            let response;
            let endpoint;

            switch (formId) {
                case 'userLoginForm':
                    endpoint = '/auth/login';
                    response = await this.apiCall('POST', endpoint, data, csrfToken);
                    break;
                case 'userSignupForm':
                    endpoint = '/auth/register';
                    response = await this.apiCall('POST', endpoint, data, csrfToken);
                    break;
                case 'adminLoginForm':
                    endpoint = '/auth/admin/login';
                    response = await this.apiCall('POST', endpoint, data, csrfToken);
                    break;
                case 'adminSignupForm':
                    endpoint = '/auth/admin/register';
                    response = await this.apiCall('POST', endpoint, data, csrfToken);
                    break;
                case 'passwordRecoveryForm':
                    endpoint = '/auth/forgot-password';
                    response = await this.apiCall('POST', endpoint, data, csrfToken);
                    if (response.success) {
                        this.showModalStep(2);
                        document.querySelector('.status-email').textContent = data.email;
                        this.security.clearAttempts(form.id);
                    }
                    break;
                case 'passwordResetForm':
                    endpoint = '/auth/reset-password';
                    response = await this.apiCall('POST', endpoint, data, csrfToken);
                    if (response.success) {
                        this.showFormMessage(form, 'Password reset successfully! Redirecting to login...', 'success');
                        setTimeout(() => this.closeModal(), 2000);
                        this.security.clearAttempts('reset');
                    }
                    break;
            }

            if (response.success) {
                this.security.clearAttempts(form.id);
                
                // Check if 2FA is required
                if (response.requires2FA) {
                    this.showFormMessage(form, 'Two-factor authentication required', 'info');
                    // Store the userId for 2FA verification
                    sessionStorage.setItem('userId2FA', response.userId);

                    // Remember where to return focus when modal closes (password input of current form)
                    const pwdInput = form.querySelector('input[name="password"], input[type="password"]');
                    const focusSelector = pwdInput?.id ? `#${pwdInput.id}` : null;

                    // Show 2FA modal if available and set return focus selector
                    if (typeof TwoFALogin !== 'undefined' && TwoFALogin.show) {
                        setTimeout(() => {
                            TwoFALogin.returnFocusSelector = focusSelector;
                            TwoFALogin.show(response.userId);
                        }, 500);
                    }
                    return;
                }
                
                this.showFormMessage(form, response.message, 'success');

                // Handle successful login
                if (formId === 'userLoginForm' || formId === 'adminLoginForm') {
                    this.security.saveSessionToStorage(response.token);
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1500);
                }

                // Reset form
                setTimeout(() => form.reset(), 1000);
            } else {
                this.showFormMessage(form, response.message || 'An error occurred', 'error');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.showFormMessage(form, error.message || 'An unexpected error occurred', 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    /**
     * API call
     */
    async apiCall(method, endpoint, data, csrfToken) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify(data),
        };

        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Show form message
     */
    showFormMessage(form, message, type = 'info') {
        const messageEl = form.querySelector('.form-message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `form-message show ${type}`;
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            if (type === 'success' || type === 'error') {
                setTimeout(() => {
                    messageEl.classList.remove('show');
                }, 5000);
            }
        }
    }

    /**
     * Open password recovery modal
     */
    openPasswordRecovery(userType) {
        this.showModal();
        this.showModalStep(1);
        const recoveryForm = document.getElementById('passwordRecoveryForm');
        if (recoveryForm) {
            recoveryForm.querySelector('input[name="userType"]').value = userType;
        }
    }

    /**
     * Show modal
     */
    showModal() {
        if (this.modal) {
            this.modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        if (this.modal) {
            this.modal.classList.remove('show');
            document.body.style.overflow = '';
            this.showModalStep(1);
        }
    }

    /**
     * Show modal step
     */
    showModalStep(stepNumber) {
        this.modalSteps.forEach(step => {
            step.style.display = 'none';
        });
        const currentStep = document.querySelector(`.modal-step[data-step="${stepNumber}"]`);
        if (currentStep) {
            currentStep.style.display = 'block';
        }
    }
}

// ==================
// INITIALIZATION
// ==================

document.addEventListener('DOMContentLoaded', async () => {
    const formManager = new FormManager();
    await formManager.init();

    // Log initialization
    console.log('✓ FinAnalytics Authentication System Initialized');
    console.log('✓ Security Manager Active');
    console.log('✓ Forms Ready');
});

// ==================
// ERROR HANDLING
// ==================

window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
});

// ==================
// SESSION MANAGEMENT
// ==================

class SessionManager {
    constructor() {
        this.tokenRefreshInterval = null;
    }

    /**
     * Initialize session
     */
    init() {
        this.setUpAutoLogout();
        this.setUpTokenRefresh();
        this.setUpVisibilityChange();
    }

    /**
     * Set up auto logout
     */
    setUpAutoLogout() {
        let logoutTimer;

        const resetTimer = () => {
            clearTimeout(logoutTimer);
            logoutTimer = setTimeout(() => {
                this.logout();
            }, CONFIG.TOKEN_REFRESH_INTERVAL * 2);
        };

        document.addEventListener('mousemove', resetTimer);
        document.addEventListener('keypress', resetTimer);
        document.addEventListener('click', resetTimer);
    }

    /**
     * Set up token refresh
     */
    setUpTokenRefresh() {
        this.tokenRefreshInterval = setInterval(() => {
            const token = localStorage.getItem('sessionToken');
            if (token) {
                this.refreshToken(token);
            }
        }, CONFIG.TOKEN_REFRESH_INTERVAL);
    }

    /**
     * Refresh token
     */
    async refreshToken(token) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                this.logout();
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
    }

    /**
     * Set up visibility change
     */
    setUpVisibilityChange() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInterval(this.tokenRefreshInterval);
            } else {
                this.setUpTokenRefresh();
            }
        });
    }

    /**
     * Logout
     */
    logout() {
        localStorage.removeItem('sessionToken');
        window.location.href = '/';
    }
}

// Initialize session manager if token exists
if (localStorage.getItem('sessionToken')) {
    const sessionManager = new SessionManager();
    sessionManager.init();
}
