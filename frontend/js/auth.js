/**
 * CampusFlow — Authentication Controller (auth.js)
 * Manages client session, navbar auth state, and form gating.
 */

// Key names in localStorage
const AUTH_TOKEN_KEY = 'cf_user_token';
const AUTH_USER_KEY  = 'cf_user_data';

/**
 * Get stored session token
 * @returns {string|null}
 */
function getUserToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Get stored user profile
 * @returns {Object|null}
 */
function getCurrentUser() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Check if a student/faculty is currently logged in
 * @returns {boolean}
 */
function isUserLoggedIn() {
  return !!getUserToken();
}

/**
 * Store user session upon successful login/registration
 * @param {string} token
 * @param {Object} user
 */
function saveUserSession(token, user) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

/**
 * Clear session and log out
 */
function logoutUser() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }
  window.location.reload();
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Update the navbar to show user badge or login/register buttons
 */
function updateNavbarAuthUI() {
  const navContainer = document.querySelector('.navbar-nav');
  if (!navContainer) return;

  // Find or create the auth widget container in navbar
  let authWidget = document.getElementById('nav-user-widget');
  if (!authWidget) {
    authWidget = document.createElement('div');
    authWidget.id = 'nav-user-widget';
    authWidget.style.display = 'inline-flex';
    authWidget.style.alignItems = 'center';
    authWidget.style.gap = '8px';
    
    // Insert before admin button if present
    const adminBtn = navContainer.querySelector('.btn-nav-admin');
    if (adminBtn) {
      navContainer.insertBefore(authWidget, adminBtn);
    } else {
      navContainer.appendChild(authWidget);
    }
  }

  const user = getCurrentUser();

  if (user && isUserLoggedIn()) {
    authWidget.innerHTML = `
      <div class="user-nav-badge" style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(99, 102, 241, 0.12);
        border: 1px solid rgba(99, 102, 241, 0.25);
        color: var(--text-main, #fff);
        padding: 5px 12px;
        border-radius: 999px;
        font-size: 0.82rem;
        font-weight: 500;
      ">
        <svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span style="font-weight:600;">${escapeHtml(user.name || user.college_id)}</span>
        <span style="color:var(--text-muted, #94a3b8); font-size:0.75rem;">(${escapeHtml(user.college_id)})</span>
      </div>
      <button onclick="logoutUser()" class="btn-nav-logout" style="
        background: transparent;
        border: 1px solid rgba(239, 68, 68, 0.35);
        color: #ef4444;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.78rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 500;
      " title="Sign out">
        <svg class="ui-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign Out
      </button>
    `;
  } else {
    authWidget.innerHTML = `
      <a href="login.html" class="nav-link" style="color:var(--primary, #6366f1); font-weight:600; display:inline-flex; align-items:center; gap:5px;">
        <svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        Sign In
      </a>
      <a href="register.html" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.82rem; border-radius: 6px; display:inline-flex; align-items:center; gap:5px;">
        <svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <line x1="19" y1="8" x2="19" y2="14"/>
          <line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
        Register
      </a>
    `;
  }
}

/**
 * Gate the complaint submission form on index.html:
 * - If user is logged in: show form with their name and College ID
 * - If not logged in: show friendly prompt to sign in or register with College ID
 */
function initAuthGate() {
  const formCardBody = document.querySelector('.complaint-card-body');
  const complaintForm = document.getElementById('complaint-form');
  if (!formCardBody || !complaintForm) return;

  const user = getCurrentUser();

  // Remove existing gate banner if any
  const existingGate = document.getElementById('auth-gate-banner');
  if (existingGate) existingGate.remove();

  if (!isUserLoggedIn() || !user) {
    // Disable inputs inside form
    const inputs = complaintForm.querySelectorAll('input, textarea, button');
    inputs.forEach(el => el.disabled = true);

    const gateBanner = document.createElement('div');
    gateBanner.id = 'auth-gate-banner';
    gateBanner.style.cssText = `
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95));
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      text-align: center;
    `;
    gateBanner.innerHTML = `
      <div style="margin-bottom: 12px; display:flex; justify-content:center;">
        <div style="
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
      </div>
      <h3 style="font-size: 1.15rem; margin-bottom: 6px; color: #fff;">Campus Member Verification Required</h3>
      <p style="font-size: 0.88rem; color: #94a3b8; max-width: 480px; margin: 0 auto 18px; line-height: 1.5;">
        Only registered college students and faculty members can submit grievances. Please sign in with your <strong>College ID</strong> (username) or create a new account.
      </p>
      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <a href="login.html" class="btn btn-primary" style="padding: 9px 22px; font-size: 0.88rem; display:inline-flex; align-items:center; gap:6px;">
          <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Sign In with College ID
        </a>
        <a href="register.html" class="btn btn-secondary" style="padding: 9px 22px; font-size: 0.88rem; display:inline-flex; align-items:center; gap:6px;">
          <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
          Register First
        </a>
      </div>
    `;
    formCardBody.insertBefore(gateBanner, complaintForm);
  } else {
    // Enable all inputs
    const inputs = complaintForm.querySelectorAll('input, textarea, button');
    inputs.forEach(el => el.disabled = false);

    // Show verified user badge above form
    const gateBanner = document.createElement('div');
    gateBanner.id = 'auth-gate-banner';
    gateBanner.style.cssText = `
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 10px;
      padding: 10px 16px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    `;
    gateBanner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem;">
        <svg class="ui-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Submitting as: <strong style="color:#fff;">${escapeHtml(user.name)}</strong> (${escapeHtml(user.college_id)})</span>
        <span style="font-size: 0.72rem; text-transform: uppercase; background: rgba(99,102,241,0.2); color:#818cf8; padding: 2px 6px; border-radius: 4px; font-weight:600;">${escapeHtml(user.user_type)}</span>
      </div>
      <button type="button" onclick="logoutUser()" style="background:none; border:none; color: #94a3b8; font-size: 0.78rem; text-decoration: underline; cursor: pointer;">Not you? Switch account</button>
    `;
    formCardBody.insertBefore(gateBanner, complaintForm);
  }
}

// Run navbar update when document loads
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    updateNavbarAuthUI();
    initAuthGate();
  });
}
