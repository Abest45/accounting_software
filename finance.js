// ==========================================
// THEME MANAGEMENT SYSTEM
// ==========================================

const ThemeManager = {
    themes: {
        'default-blue': {
            '--primary': '#1a237e',
            '--primary-light': '#534bae',
            '--primary-dark': '#000051',
            '--secondary': '#00c853',
            '--secondary-dark': '#009624',
            '--danger': '#f44336',
            '--warning': '#ff9800',
            '--info': '#2196f3',
            '--dark': '#263238',
            '--light': '#f5f5f5',
            '--gray': '#90a4ae',
            '--white': '#ffffff',
            '--background': '#f5f5f5',
            '--text': '#263238',
            '--on-primary': '#ffffff',
            '--on-secondary': '#ffffff',
            '--on-danger': '#ffffff',
            '--on-background': '#263238'
        },
        'dark-mode': {
            '--primary': '#121212',
            '--primary-light': '#1e1e1e',
            '--primary-dark': '#000000',
            '--secondary': '#4caf50',
            '--secondary-dark': '#388e3c',
            '--danger': '#ef5350',
            '--warning': '#ffb74d',
            '--info': '#64b5f6',
            '--dark': '#e0e0e0',
            '--light': '#303030',
            '--gray': '#757575',
            '--white': '#ffffff',
            '--background': '#303030',
            '--text': '#e0e0e0',
            '--on-primary': '#ffffff',
            '--on-secondary': '#ffffff',
            '--on-danger': '#ffffff',
            '--on-background': '#e0e0e0'
        },
        'light-mode': {
            '--primary': '#ffffff',
            '--primary-light': '#f5f5f5',
            '--primary-dark': '#e0e0e0',
            '--secondary': '#4caf50',
            '--secondary-dark': '#388e3c',
            '--danger': '#d32f2f',
            '--warning': '#f57c00',
            '--info': '#1976d2',
            '--dark': '#212121',
            '--light': '#fafafa',
            '--gray': '#bdbdbd',
            '--white': '#ffffff',
            '--background': '#fafafa',
            '--text': '#212121',
            '--on-primary': '#212121',
            '--on-secondary': '#ffffff',
            '--on-danger': '#ffffff',
            '--on-background': '#212121'
        },
        'green-theme': {
            '--primary': '#1b5e20',
            '--primary-light': '#2e7d32',
            '--primary-dark': '#003300',
            '--secondary': '#00c853',
            '--secondary-dark': '#009624',
            '--danger': '#c62828',
            '--warning': '#f57f17',
            '--info': '#00695c',
            '--dark': '#263238',
            '--light': '#f1f8e9',
            '--gray': '#689f38',
            '--white': '#ffffff',
            '--background': '#f1f8e9',
            '--text': '#263238',
            '--on-primary': '#ffffff',
            '--on-secondary': '#ffffff',
            '--on-danger': '#ffffff',
            '--on-background': '#263238'
        }
    },

    init() {
        const savedTheme = localStorage.getItem('dashboard-theme') || 'default-blue';
        this.setTheme(savedTheme);
        
        // Set theme selector
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            themeSelect.value = savedTheme.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            themeSelect.addEventListener('change', (e) => {
                const selectedTheme = e.target.value.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace('default-blue', 'default-blue')
                    .replace('dark-mode', 'dark-mode')
                    .replace('light-mode', 'light-mode')
                    .replace('green-theme', 'green-theme');
                this.setTheme(selectedTheme);
            });
        }

        // Save preferences button
        const saveBtn = document.querySelector('button.btn-primary');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.savePreferences());
        }
    },

    setTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;

        const root = document.documentElement;
        Object.entries(theme).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        localStorage.setItem('dashboard-theme', themeName);
        // Run contrast audit and auto-fix low contrast text
        this.auditAndFixContrast();
    },

    _luminance(rgb) {
        // rgb = [r,g,b]
        const srgb = rgb.map(v => {
            v = v / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    },

    _contrastRatio(fg, bg) {
        const parse = (c) => {
            if (!c) return [255,255,255];
            const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
            if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
            // handle hex
            const hex = c.replace('#','');
            if (hex.length === 3) return hex.split('').map(h=>parseInt(h+h,16));
            if (hex.length === 6) return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
            return [255,255,255];
        };
        const fgRgb = parse(fg);
        const bgRgb = parse(bg);
        const L1 = this._luminance(fgRgb);
        const L2 = this._luminance(bgRgb);
        const lighter = Math.max(L1,L2);
        const darker = Math.min(L1,L2);
        return (lighter + 0.05) / (darker + 0.05);
    },

    _getEffectiveBackgroundColor(el) {
        let node = el;
        while (node && node !== document.documentElement) {
            const bg = getComputedStyle(node).backgroundColor;
            if (bg && bg !== 'transparent' && !bg.startsWith('rgba(0, 0, 0, 0)')) return bg;
            node = node.parentElement;
        }
        return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
    },

    runWCAGAudit() {
        try {
            const rootStyles = getComputedStyle(document.documentElement);
            const candidates = [
                rootStyles.getPropertyValue('--text')?.trim(),
                rootStyles.getPropertyValue('--on-background')?.trim(),
                rootStyles.getPropertyValue('--on-primary')?.trim(),
                '#000000',
                '#ffffff'
            ].filter(Boolean);

            const all = Array.from(document.querySelectorAll('body *'));
            let fixes = 0;
            all.forEach(el => {
                if (!el || !el.offsetParent) return; // not visible
                const text = (el.textContent || '').trim();
                if (!text) return;

                const style = getComputedStyle(el);
                const fg = style.color;
                const bg = this._getEffectiveBackgroundColor(el);
                let ratio = this._contrastRatio(fg, bg);
                if (ratio >= 4.5) return;

                // Try theme-level candidates first
                let fixed = false;
                for (const c of candidates) {
                    if (this._contrastRatio(c, bg) >= 4.5) {
                        el.style.color = c;
                        fixed = true;
                        break;
                    }
                }

                // If still not fixed, try adjusting element foreground lightness
                if (!fixed) {
                    const rgb = this._parseColorToRgb(fg);
                    if (rgb) {
                        const hsl = this._rgbToHsl(rgb[0], rgb[1], rgb[2]);
                        // try shifting lightness up and down in small steps
                        for (const dir of [1, -1]) {
                            for (let step = 5; step <= 50; step += 5) {
                                const newL = Math.min(100, Math.max(0, hsl[2] + dir * step));
                                const newRgb = this._hslToRgb(hsl[0], hsl[1], newL);
                                const css = `rgb(${newRgb[0]}, ${newRgb[1]}, ${newRgb[2]})`;
                                if (this._contrastRatio(css, bg) >= 4.5) {
                                    el.style.color = css;
                                    fixed = true;
                                    break;
                                }
                            }
                            if (fixed) break;
                        }
                    }
                }

                if (fixed) {
                    el.setAttribute('data-wcag-fixed', 'true');
                    fixes++;
                }
            });
            if (fixes > 0) console.warn(`WCAG audit: fixed ${fixes} elements`);
        } catch (e) {
            console.error('WCAG audit failed:', e);
        }
    },

    _parseColorToRgb(c) {
        if (!c) return null;
        const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
        if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
        const hex = c.replace('#','').trim();
        if (!/^[0-9a-fA-F]{3,6}$/.test(hex)) return null;
        if (hex.length === 3) return hex.split('').map(h => parseInt(h+h, 16));
        return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
    },

    _rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r,g,b), min = Math.min(r,g,b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h = Math.round(h * 60);
        }
        return [h, Math.round(s * 100), Math.round(l * 100)];
    },

    _hslToRgb(h, s, l) {
        s /= 100; l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c/2;
        let r1=0,g1=0,b1=0;
        if (0 <= h && h < 60) { r1 = c; g1 = x; b1 = 0; }
        else if (60 <= h && h < 120) { r1 = x; g1 = c; b1 = 0; }
        else if (120 <= h && h < 180) { r1 = 0; g1 = c; b1 = x; }
        else if (180 <= h && h < 240) { r1 = 0; g1 = x; b1 = c; }
        else if (240 <= h && h < 300) { r1 = x; g1 = 0; b1 = c; }
        else { r1 = c; g1 = 0; b1 = x; }
        const r = Math.round((r1 + m) * 255);
        const g = Math.round((g1 + m) * 255);
        const b = Math.round((b1 + m) * 255);
        return [r, g, b];
    },

    auditAndFixContrast() {
        // kept for backward compatibility
        this.runWCAGAudit();
    },

    savePreferences() {
        const theme = document.getElementById('theme')?.value.toLowerCase()
            .replace(/\s+/g, '-')
            .replace('default-blue', 'default-blue')
            .replace('dark-mode', 'dark-mode')
            .replace('light-mode', 'light-mode')
            .replace('green-theme', 'green-theme');
        
        const currency = document.getElementById('currency')?.value;
        const dateFormat = document.getElementById('date-format')?.value;
        const refreshRate = document.getElementById('refresh-rate')?.value;

        if (theme) this.setTheme(theme);
        if (currency) localStorage.setItem('dashboard-currency', currency);
        if (dateFormat) localStorage.setItem('dashboard-date-format', dateFormat);
        if (refreshRate) localStorage.setItem('dashboard-refresh-rate', refreshRate);

        alert('Preferences saved successfully!');
    }
};

// Expose a manual trigger for the audit
window.runWCAGAudit = function() { ThemeManager.runWCAGAudit && ThemeManager.runWCAGAudit(); };

// Initialize theme when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});

 // Initialize Charts
        document.addEventListener('DOMContentLoaded', function() {
            // Revenue vs Expenses Chart
            const revenueExpenseCtx = document.getElementById('revenueExpenseChart').getContext('2d');
            const revenueExpenseChart = new Chart(revenueExpenseCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
                    datasets: [
                        {
                            label: 'Revenue',
                            data: [320000, 350000, 380000, 420000, 450000, 480000, 520000, 550000, 580000, 620000],
                            borderColor: '#00c853',
                            backgroundColor: 'rgba(0, 200, 83, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Expenses',
                            data: [280000, 290000, 310000, 330000, 350000, 370000, 390000, 410000, 430000, 450000],
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

            // Profit Margin Chart
            const profitMarginCtx = document.getElementById('profitMarginChart').getContext('2d');
            const profitMarginChart = new Chart(profitMarginCtx, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
                    datasets: [{
                        label: 'Profit Margin %',
                        data: [12.5, 13.2, 14.1, 15.3, 16.2, 15.8, 16.5, 17.2, 17.8, 18.5],
                        backgroundColor: '#534bae',
                        borderColor: '#1a237e',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.raw + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });

            // Financial Reports Chart
            const financialReportsCtx = document.getElementById('financialReportsChart').getContext('2d');
            const financialReportsChart = new Chart(financialReportsCtx, {
                type: 'bar',
                data: {
                    labels: ['Q1 2022', 'Q2 2022', 'Q3 2022', 'Q4 2022', 'Q1 2023', 'Q2 2023', 'Q3 2023'],
                    datasets: [
                        {
                            label: 'Revenue',
                            data: [1850000, 2100000, 1950000, 2250000, 2400000, 2650000, 2850000],
                            backgroundColor: '#00c853',
                        },
                        {
                            label: 'Net Profit',
                            data: [320000, 380000, 350000, 420000, 450000, 480000, 520000],
                            backgroundColor: '#1a237e',
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

            // Revenue by Category Chart
            const revenueByCategoryCtx = document.getElementById('revenueByCategoryChart').getContext('2d');
            const revenueByCategoryChart = new Chart(revenueByCategoryCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Product Sales', 'Service Revenue', 'Recurring Revenue', 'Other'],
                    datasets: [{
                        data: [1542800, 892450, 412076, 0],
                        backgroundColor: [
                            '#1a237e',
                            '#00c853',
                            '#ff9800',
                            '#2196f3'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': $' + context.raw.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });

            // Expenses Chart
            const expensesCtx = document.getElementById('expensesChart').getContext('2d');
            const expensesChart = new Chart(expensesCtx, {
                type: 'pie',
                data: {
                    labels: ['Operational Costs', 'Marketing', 'Salaries & Benefits', 'Rent & Utilities', 'Other'],
                    datasets: [{
                        data: [642365, 285420, 356945, 0, 0],
                        backgroundColor: [
                            '#ff9800',
                            '#2196f3',
                            '#1a237e',
                            '#00c853',
                            '#f44336'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': $' + context.raw.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });

            // Assets vs Liabilities Chart
            const assetsLiabilitiesCtx = document.getElementById('assetsLiabilitiesChart').getContext('2d');
            const assetsLiabilitiesChart = new Chart(assetsLiabilitiesCtx, {
                type: 'bar',
                data: {
                    labels: ['Q1 2022', 'Q2 2022', 'Q3 2022', 'Q4 2022', 'Q1 2023', 'Q2 2023', 'Q3 2023'],
                    datasets: [
                        {
                            label: 'Assets',
                            data: [4200000, 4500000, 4700000, 4900000, 5200000, 5500000, 5842150],
                            backgroundColor: '#00c853',
                        },
                        {
                            label: 'Liabilities',
                            data: [2100000, 2200000, 2250000, 2300000, 2350000, 2400000, 2458760],
                            backgroundColor: '#ff9800',
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

            // Equity Chart
            const equityCtx = document.getElementById('equityChart').getContext('2d');
            const equityChart = new Chart(equityCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
                    datasets: [{
                        label: 'Equity',
                        data: [2800000, 2850000, 2920000, 2980000, 3050000, 3120000, 3200000, 3280000, 3350000, 3383390],
                        borderColor: '#1a237e',
                        backgroundColor: 'rgba(26, 35, 126, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': $' + context.raw.toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });

            // Menu Navigation
            const navLinks = document.querySelectorAll('.nav-links li');
            const contentSections = document.querySelectorAll('.content-section');
            
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    const target = this.getAttribute('data-target');
                    
                    // Update active nav link
                    navLinks.forEach(item => item.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Show target content section
                    contentSections.forEach(section => {
                        section.classList.remove('active');
                        if (section.id === target) {
                            section.classList.add('active');
                        }
                    });
                    
                    // Update header title
                    const headerTitle = document.querySelector('.header h2');
                    headerTitle.textContent = this.textContent.trim();
                    
                    // Close sidebar on mobile
                    if (window.innerWidth <= 768) {
                        document.querySelector('.sidebar').classList.remove('active');
                    }
                });
            });
            
            // Hamburger menu toggle (improved for accessibility and mobile)
            const hamburger = document.querySelector('.hamburger');
            const sidebar = document.querySelector('.sidebar');
            
            if (hamburger && sidebar) {
                // Toggle sidebar and update aria-expanded + body scroll
                hamburger.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const isActive = sidebar.classList.toggle('active');
                    hamburger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
                    document.body.classList.toggle('no-scroll', isActive);
                });

                // Keyboard support (Enter / Space)
                hamburger.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        hamburger.click();
                    }
                });

                // Close sidebar when clicking outside on mobile
                document.addEventListener('click', function(event) {
                    if (window.innerWidth <= 768) {
                        const isClickInsideSidebar = sidebar.contains(event.target);
                        const isClickInsideHamburger = event.target.closest('.hamburger');

                        if (!isClickInsideSidebar && !isClickInsideHamburger && sidebar.classList.contains('active')) {
                            sidebar.classList.remove('active');
                            hamburger.setAttribute('aria-expanded', 'false');

                            document.body.classList.remove('no-scroll');
                        }
                    }
                });



                // Close on Escape key
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && sidebar.classList.contains('active')) {
                        sidebar.classList.remove('active');
                        hamburger.setAttribute('aria-expanded', 'false');
                        document.body.classList.remove('no-scroll');
                    }
                });

                // Ensure overlay & sidebar state resets on resize to desktop
                window.addEventListener('resize', function() {
                    if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
                        sidebar.classList.remove('active');
                        hamburger.setAttribute('aria-expanded', 'false');
                        document.body.classList.remove('no-scroll');
                    }
                });
            }

            // Auth toggle (mobile) - compact dropdown to avoid covering header elements
            (function() {
                const authBar = document.getElementById('auth-bar');
                const authToggles = document.querySelectorAll('.auth-toggle');

                function setAllTogglesExpanded(value) {
                    authToggles.forEach(t => t.setAttribute('aria-expanded', value));
                }

                if (authBar && authToggles.length) {
                    authToggles.forEach(authToggle => {
                        authToggle.addEventListener('click', function(e) {
                            e.stopPropagation();
                            const isOpen = authBar.classList.toggle('open');
                            setAllTogglesExpanded(isOpen ? 'true' : 'false');
                        });
                    });

                    document.addEventListener('click', function(event) {
                        const isClickInsideAuth = authBar.contains(event.target);
                        if (!isClickInsideAuth && authBar.classList.contains('open')) {
                            authBar.classList.remove('open');
                            setAllTogglesExpanded('false');
                        }
                    });

                    document.addEventListener('keydown', function(e) {
                        if (e.key === 'Escape' && authBar.classList.contains('open')) {
                            authBar.classList.remove('open');
                            setAllTogglesExpanded('false');
                        }
                    });
                }
            })();

            // Form functionality
            // Add invoice items
            document.getElementById('addItem').addEventListener('click', function() {
                const itemsContainer = document.getElementById('invoiceItems');
                const newItem = document.createElement('div');
                newItem.className = 'invoice-item';
                newItem.innerHTML = `
                    <div class="form-row">
                        <div class="form-group">
                            <input type="text" placeholder="Description" class="item-description">
                        </div>
                        <div class="form-group">
                            <input type="number" placeholder="Quantity" class="item-quantity" min="1" value="1">
                        </div>
                        <div class="form-group">
                            <input type="number" placeholder="Unit Price" class="item-price" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <button type="button" class="btn btn-danger remove-item"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
                itemsContainer.appendChild(newItem);
                
                // Add event listener to remove button
                newItem.querySelector('.remove-item').addEventListener('click', function() {
                    itemsContainer.removeChild(newItem);
                });
            });
            
            // Add purchase items
            document.getElementById('addPurchaseItem').addEventListener('click', function() {
                const itemsContainer = document.getElementById('purchaseItems');
                const newItem = document.createElement('div');
                newItem.className = 'purchase-item';
                newItem.innerHTML = `
                    <div class="form-row">
                        <div class="form-group">
                            <input type="text" placeholder="Product/Service" class="purchase-item-name">
                        </div>
                        <div class="form-group">
                            <input type="number" placeholder="Quantity" class="purchase-item-quantity" min="1" value="1">
                        </div>
                        <div class="form-group">
                            <input type="number" placeholder="Unit Cost" class="purchase-item-cost" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <button type="button" class="btn btn-danger remove-purchase-item"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
                itemsContainer.appendChild(newItem);
                
                // Add event listener to remove button
                newItem.querySelector('.remove-purchase-item').addEventListener('click', function() {
                    itemsContainer.removeChild(newItem);
                });
            });
            
            // Form submissions
            document.getElementById('invoiceForm').addEventListener('submit', function(e) {
                e.preventDefault();
                alert('Invoice saved successfully!');
                // In a real application, you would send this data to your backend
                // and generate a unique invoice number
                this.reset();
            });
            
            document.getElementById('receiptForm').addEventListener('submit', function(e) {
                e.preventDefault();
                alert('Receipt recorded successfully!');
                // In a real application, you would send this data to your backend
                // and generate a unique receipt number
                this.reset();
            });
            
            document.getElementById('inventoryForm').addEventListener('submit', function(e) {
                e.preventDefault();
                alert('Product added to inventory successfully!');
                // In a real application, you would send this data to your backend
                this.reset();
            });
            
            document.getElementById('purchaseForm').addEventListener('submit', function(e) {
                e.preventDefault();
                alert('Purchase order created successfully!');
                // In a real application, you would send this data to your backend
                // and generate a unique purchase order number
                this.reset();
            });
            
            document.getElementById('payrollForm').addEventListener('submit', function(e) {
                e.preventDefault();
                alert('Payroll processed successfully!');
                // In a real application, you would send this data to your backend
                this.reset();
            });

            // Simulate real-time data updates
            setInterval(() => {
                // Update revenue and expense data
                const revenueData = revenueExpenseChart.data.datasets[0].data;
                const expenseData = revenueExpenseChart.data.datasets[1].data;
                
                // Remove first data point and add new one
                revenueData.shift();
                expenseData.shift();
                
                // Generate new random data points
                const lastRevenue = revenueData[revenueData.length - 1];
                const lastExpense = expenseData[expenseData.length - 1];
                
                revenueData.push(lastRevenue + Math.floor(Math.random() * 50000) - 10000);
                expenseData.push(lastExpense + Math.floor(Math.random() * 30000) - 5000);
                
                // Update chart
                revenueExpenseChart.update();
                
                // Update profit margin data
                const profitData = profitMarginChart.data.datasets[0].data;
                profitData.shift();
                
                const lastProfit = profitData[profitData.length - 1];
                profitData.push(lastProfit + (Math.random() * 2 - 1));
                
                // Update chart
                profitMarginChart.update();
                
                // Update KPI values
                updateKPIValues();
            }, 5000); // Update every 5 seconds
        });

        // Function to update KPI values with animation
        function updateKPIValues() {
            const kpiValues = document.querySelectorAll('.kpi-value');
            
            kpiValues.forEach(kpi => {
                if (kpi.textContent.includes('$')) {
                    const currentValue = parseFloat(kpi.textContent.replace(/[^0-9.-]+/g,""));
                    const change = Math.floor(Math.random() * 10000) - 2000;
                    const newValue = currentValue + change;
                    
                    // Animate the value change
                    animateValue(kpi, currentValue, newValue, 1000);
                }
            });
        }

        // Function to animate value changes
        function animateValue(element, start, end, duration) {
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const value = Math.floor(progress * (end - start) + start);
                element.textContent = '$' + value.toLocaleString();
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };
            window.requestAnimationFrame(step);
        }
   