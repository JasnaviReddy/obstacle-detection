const Auth = {
    STORAGE_KEY: 'obstacleai_user',
    API_URL: window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin,

    init() {
        this.checkGoogleCallback();
        this.bindLoginForm();
        this.bindSignupForm();
        this.bindGoogleAuth();
        this.bindPasswordStrength();
        this.renderAvatar();
    },

    /* ── Google OAuth callback ── */
    checkGoogleCallback() {
        const p = new URLSearchParams(window.location.search);
        const token = p.get('token'), name = p.get('name'), email = p.get('email');
        if (token && email) {
            this.saveUser({ name: decodeURIComponent(name || ''), email: decodeURIComponent(email), token, isGoogle: true }, true);
            window.history.replaceState({}, document.title, window.location.pathname);
            this.renderAvatar();
            this.showToast('Welcome, ' + decodeURIComponent(name || '') + '! 🎉', 'success');
        }
    },

    /* ── Avatar rendering (Google-style initial bubble) ── */
    renderAvatar() {
        const user = this.getUser();
        if (!user) return;

        const initial = (user.name || user.email || '?')[0].toUpperCase();
        const hue = this._emailHue(user.email || '');
        const avatarHTML = `
      <div class="user-avatar-wrapper" id="userAvatarWrapper">
        <div class="user-avatar" id="userAvatar" title="${user.name || user.email}" style="--avatar-hue:${hue}deg">
          ${initial}
        </div>
        <div class="avatar-dropdown" id="avatarDropdown">
          <div class="avatar-dropdown-info">
            <div class="avatar-dropdown-name">${user.name || 'User'}</div>
            <div class="avatar-dropdown-email">${user.email || ''}</div>
            ${user.isGoogle ? '<div class="avatar-dropdown-badge"><svg width="12" height="12" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Signed in with Google</div>' : ''}
          </div>
          <div class="avatar-dropdown-divider"></div>
          <a href="profile.html" class="avatar-dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profile & Settings
          </a>
          <a href="detect.html" class="avatar-dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Start Detection
          </a>
          <div class="avatar-dropdown-divider"></div>
          <button class="avatar-dropdown-item avatar-dropdown-logout" id="logoutBtn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </div>`;

        /* Inject into navbar and mobile menu */
        const containers = [
            document.querySelector('.nav-links'),
            document.querySelector('#mobileMenu')
        ];

        containers.forEach(container => {
            if (container) {
                /* Hide login/get-started links for logged-in users */
                container.querySelectorAll('a').forEach(a => {
                    if (a.href && (a.href.includes('login.html') || a.href.includes('signup.html')))
                        a.style.display = 'none';
                });
                /* Remove existing avatar if re-rendering */
                const old = container.querySelector('.user-avatar-wrapper');
                if (old) old.remove();
                container.insertAdjacentHTML('beforeend', avatarHTML);
            }
        });

        /* Inject into detect header (detect.html) */
        const detectHeader = document.querySelector('.detect-header');
        if (detectHeader && !detectHeader.querySelector('.user-avatar-wrapper')) {
            detectHeader.insertAdjacentHTML('beforeend', avatarHTML);
        }

        /* Inject into profile page back nav area */
        const profileContainer = document.querySelector('.profile-container');
        if (profileContainer && !profileContainer.querySelector('.user-avatar-wrapper')) {
            const headerEl = document.createElement('div');
            headerEl.className = 'profile-user-header';
            headerEl.innerHTML = avatarHTML;
            profileContainer.insertBefore(headerEl, profileContainer.firstChild.nextSibling);
        }

        /* Bind dropdown toggle */
        setTimeout(() => {
            const wrapper = document.getElementById('userAvatarWrapper');
            const dropdown = document.getElementById('avatarDropdown');
            if (wrapper && dropdown) {
                wrapper.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open') });
                document.addEventListener('click', () => dropdown.classList.remove('open'), { once: false });
            }
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());
        }, 50);
    },

    _emailHue(email) {
        let h = 0; for (let i = 0; i < email.length; i++)h = (h * 31 + email.charCodeAt(i)) % 360; return h;
    },

    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
        sessionStorage.removeItem(this.STORAGE_KEY);
        this.showToast('Signed out successfully', 'success');
        setTimeout(() => window.location.href = 'index.html', 800);
    },

    /* ── Login form ── */
    bindLoginForm() {
        const f = document.getElementById('loginForm');
        if (!f) return;
        f.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value, pw = document.getElementById('password').value;
            const btn = f.querySelector('button[type="submit"]');
            btn.textContent = 'Signing in…'; btn.disabled = true;
            try {
                const r = await fetch(Auth.API_URL + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
                if (r.ok) {
                    const d = await r.json();
                    Auth.saveUser(d.user, true);
                    Auth.showToast('Login successful!', 'success');
                    setTimeout(() => window.location.href = 'index.html', 900);
                } else {
                    const err = await r.json(); Auth.showToast(err.message || 'Invalid credentials', 'error');
                }
            } catch (err) {
                const users = JSON.parse(localStorage.getItem('obstacleai_users') || '[]');
                const u = users.find(u => u.email === email && u.password === pw);
                if (u) { Auth.saveUser({ email: u.email, name: u.name }, true); Auth.showToast('Login OK (offline)', 'success'); setTimeout(() => window.location.href = 'index.html', 900) }
                else Auth.showToast('Invalid credentials', 'error');
            }
            btn.textContent = 'Sign In'; btn.disabled = false;
        });
    },

    /* ── Signup form ── */
    bindSignupForm() {
        const f = document.getElementById('signupForm');
        if (!f) return;
        f.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fn = document.getElementById('firstName').value, ln = document.getElementById('lastName').value,
                email = document.getElementById('signupEmail').value, phone = document.getElementById('phone').value,
                pw = document.getElementById('signupPassword').value;
            if (!document.getElementById('terms').checked) { Auth.showToast('Agree to Terms', 'error'); return }
            const btn = f.querySelector('button[type="submit"]'); btn.textContent = 'Creating…'; btn.disabled = true;
            try {
                const r = await fetch(Auth.API_URL + '/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName: fn, lastName: ln, email, phone, password: pw }) });
                if (r.ok) {
                    const d = await r.json(); Auth.saveUser(d.user, true); Auth.showToast('Account created!', 'success');
                    setTimeout(() => window.location.href = 'index.html', 900);
                } else {
                    const err = await r.json(); Auth.showToast(err.message, 'error');
                }
            } catch (err) {
                const users = JSON.parse(localStorage.getItem('obstacleai_users') || '[]');
                if (users.find(u => u.email === email)) { Auth.showToast('Email exists', 'error') }
                else {
                    users.push({ firstName: fn, lastName: ln, email, phone, password: pw, name: fn + ' ' + ln });
                    localStorage.setItem('obstacleai_users', JSON.stringify(users));
                    Auth.saveUser({ email, name: fn + ' ' + ln, phone }, true);
                    Auth.showToast('Account created (offline)', 'success');
                    setTimeout(() => window.location.href = 'index.html', 900);
                }
            }
            btn.textContent = 'Create Account'; btn.disabled = false;
        });
    },

    bindGoogleAuth() {
        document.querySelectorAll('#googleLoginBtn,#googleSignupBtn').forEach(b => {
            b.addEventListener('click', () => window.location.href = Auth.API_URL + '/api/auth/google');
        });
    },

    bindPasswordStrength() {
        const p = document.getElementById('signupPassword'), f = document.getElementById('strengthFill'), t = document.getElementById('strengthText');
        if (!p || !f) return;
        p.addEventListener('input', () => {
            let s = 0; const v = p.value;
            if (v.length >= 8) s++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^a-zA-Z0-9]/.test(v)) s++;
            const l = [{ w: '0%', c: '#64748b', t: 'Enter a password' }, { w: '25%', c: '#ef4444', t: 'Weak' }, { w: '50%', c: '#f59e0b', t: 'Fair' }, { w: '75%', c: '#06b6d4', t: 'Good' }, { w: '100%', c: '#10b981', t: 'Strong' }][s];
            f.style.width = l.w; f.style.background = l.c; t.textContent = l.t; t.style.color = l.c;
        });
    },

    saveUser(u, p = false) { (p ? localStorage : sessionStorage).setItem(Auth.STORAGE_KEY, JSON.stringify(u)) },
    getUser() { return JSON.parse(localStorage.getItem(Auth.STORAGE_KEY) || sessionStorage.getItem(Auth.STORAGE_KEY) || 'null') },

    showToast(msg, type = 'info') {
        let c = document.querySelector('.toast-container');
        if (!c) { c = document.createElement('div'); c.className = 'toast-container'; c.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px'; document.body.appendChild(c) }
        const t = document.createElement('div');
        const bc = type === 'success' ? 'rgba(16,185,129,0.4)' : type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(124,58,237,0.4)';
        t.style.cssText = 'padding:12px 20px;border-radius:12px;background:rgba(18,18,26,0.95);border:1px solid ' + bc + ';color:#f1f5f9;font-size:.85rem;font-weight:500;font-family:Inter,sans-serif;backdrop-filter:blur(10px)';
        t.textContent = msg; c.appendChild(t);
        setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300) }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());