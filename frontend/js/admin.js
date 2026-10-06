/**
 * CampusFlow — Admin Handler (admin.js)
 * Handles login, dashboard auth guard, ticket listing,
 * filtering, resolving, and logout.
 */

/* ─────────────────────────────────────────────────────────── */
/*  Shared Utilities                                           */
/* ─────────────────────────────────────────────────────────── */

function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <span class="toast-close" role="button">✕</span>
  `;

  container.appendChild(toast);
  const remove = () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 320);
  };
  toast.querySelector('.toast-close').addEventListener('click', remove);
  setTimeout(remove, duration);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'medium', timeStyle: 'short',
    });
  } catch { return dateStr; }
}

const URGENCY_CONFIG = {
  High:   { badgeClass: 'badge-high',   icon: '🔴' },
  Medium: { badgeClass: 'badge-medium', icon: '🟡' },
  Low:    { badgeClass: 'badge-low',    icon: '🟢' },
};

function urgencyBadge(urgency) {
  const cfg = URGENCY_CONFIG[urgency] || { badgeClass: 'badge-accent', icon: '⚪' };
  return `<span class="badge ${cfg.badgeClass}">${cfg.icon} ${urgency || 'Unknown'}</span>`;
}

function statusBadge(status) {
  const resolved = status?.toLowerCase() === 'resolved';
  return `<span class="badge ${resolved ? 'badge-resolved' : 'badge-pending'}">
    ${resolved ? '✅' : '⏳'} ${status || 'Pending'}
  </span>`;
}

/* ─────────────────────────────────────────────────────────── */
/*  LOGIN PAGE                                                 */
/* ─────────────────────────────────────────────────────────── */

function initLoginPage() {
  const form     = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');
  const btnText  = document.getElementById('login-btn-text');
  const loginBtn = document.getElementById('login-btn');

  if (!form) return;

  /* If already logged in, skip to dashboard */
  if (sessionStorage.getItem('cf_token')) {
    window.location.href = 'admin-dashboard.html';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showLoginError('Please enter both username and password.');
      return;
    }

    /* Loading */
    loginBtn.disabled = true;
    if (btnText) btnText.innerHTML = '<span class="btn-spinner"></span> Signing in…';
    if (errorBox) errorBox.classList.remove('visible');

    try {
      const data = await adminLogin(username, password);
      sessionStorage.setItem('cf_token', data.token || 'authenticated');
      sessionStorage.setItem('cf_username', data.username || username);
      window.location.href = 'admin-dashboard.html';
    } catch (err) {
      showLoginError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      loginBtn.disabled = false;
      if (btnText) btnText.textContent = 'Sign In';
    }
  });

  function showLoginError(msg) {
    if (!errorBox) return;
    errorBox.querySelector('.error-msg').textContent = msg;
    errorBox.classList.add('visible');
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  DASHBOARD PAGE                                             */
/* ─────────────────────────────────────────────────────────── */

let allTickets = [];
let activeStatusFilter  = 'all';
let activeUrgencyFilter = 'all';

function initDashboardPage() {
  /* Auth guard */
  const token = sessionStorage.getItem('cf_token');
  if (!token) {
    window.location.href = 'admin-login.html';
    return;
  }

  /* Show username */
  const adminNameEl = document.getElementById('admin-name');
  if (adminNameEl) adminNameEl.textContent = sessionStorage.getItem('cf_username') || 'Admin';

  /* Logout */
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('cf_token');
      sessionStorage.removeItem('cf_username');
      window.location.href = 'admin-login.html';
    });
  }

  /* Filter buttons — status */
  document.querySelectorAll('[data-status-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatusFilter = btn.dataset.statusFilter;
      document.querySelectorAll('[data-status-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTickets();
    });
  });

  /* Filter buttons — urgency */
  document.querySelectorAll('[data-urgency-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeUrgencyFilter = btn.dataset.urgencyFilter;
      document.querySelectorAll('[data-urgency-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTickets();
    });
  });

  /* Refresh button */
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', fetchTickets);

  fetchTickets();
}

async function fetchTickets() {
  const grid    = document.getElementById('tickets-grid');
  const spinner = document.getElementById('spinner');
  if (!grid) return;

  if (spinner) spinner.style.display = 'flex';
  grid.innerHTML = '';

  try {
    allTickets = await getAllTickets();
    updateDashStats();
    renderTickets();
  } catch (err) {
    console.error('Failed to fetch tickets:', err);
    grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h3>Could not load tickets</h3>
        <p>${err.message || 'Please check your connection and try again.'}</p>
      </div>`;
    showToast('Failed to load tickets. ' + (err.message || ''), 'error');
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}

function updateDashStats() {
  const total    = allTickets.length;
  const pending  = allTickets.filter(t => t.status?.toLowerCase() !== 'resolved').length;
  const resolved = allTickets.filter(t => t.status?.toLowerCase() === 'resolved').length;
  const high     = allTickets.filter(t => t.urgency?.toLowerCase() === 'high').length;

  setEl('stat-total',    total);
  setEl('stat-pending',  pending);
  setEl('stat-resolved', resolved);
  setEl('stat-high',     high);
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getFilteredTickets() {
  return allTickets.filter(ticket => {
    const statusMatch =
      activeStatusFilter === 'all' ||
      (activeStatusFilter === 'pending'  && ticket.status?.toLowerCase() !== 'resolved') ||
      (activeStatusFilter === 'resolved' && ticket.status?.toLowerCase() === 'resolved');

    const urgencyMatch =
      activeUrgencyFilter === 'all' ||
      ticket.urgency?.toLowerCase() === activeUrgencyFilter.toLowerCase();

    return statusMatch && urgencyMatch;
  });
}

function renderTickets() {
  const grid = document.getElementById('tickets-grid');
  if (!grid) return;

  const filtered = getFilteredTickets();

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎉</span>
        <h3>No tickets found!</h3>
        <p>There are no tickets matching the current filter.</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(ticket => buildTicketCard(ticket)).join('');

  /* Attach resolve button listeners */
  grid.querySelectorAll('[data-resolve-id]').forEach(btn => {
    btn.addEventListener('click', () => handleResolve(btn.dataset.resolveId, btn));
  });
}

function buildTicketCard(ticket) {
  const isResolved = ticket.status?.toLowerCase() === 'resolved';
  const urgencyKey = ticket.urgency || 'Low';
  const shortDesc  = ticket.description
    ? ticket.description.slice(0, 160) + (ticket.description.length > 160 ? '…' : '')
    : 'No description provided.';

  return `
    <div class="ticket-card urgency-${urgencyKey.toLowerCase()} ${isResolved ? 'resolved' : ''}"
         id="ticket-${ticket.id}">
      <div>
        <div class="ticket-meta">
          <span class="ticket-id">#${ticket.id}</span>
          ${urgencyBadge(urgencyKey)}
          ${statusBadge(ticket.status)}
          <span class="ticket-date">${formatDate(ticket.created_at)}</span>
        </div>

        <p class="ticket-description">${escapeHtml(shortDesc)}</p>

        <div class="ticket-footer">
          <span class="ticket-dept">🏫 ${ticket.department || 'Unknown Dept.'}</span>
          <span class="badge badge-accent" style="margin-left:4px;">
            ${ticket.category || 'General'}
          </span>
        </div>
      </div>

      <div class="ticket-actions">
        ${!isResolved ? `
          <button
            class="btn btn-success btn-sm"
            data-resolve-id="${ticket.id}"
            title="Mark as Resolved"
          >✔ Resolve</button>
        ` : `
          <span class="badge badge-resolved">✅ Resolved</span>
        `}
      </div>
    </div>
  `;
}

async function handleResolve(ticketId, btn) {
  const originalHTML = btn.innerHTML;
  btn.disabled  = true;
  btn.innerHTML = '<span class="btn-spinner"></span>';

  try {
    await resolveTicket(ticketId);

    /* Update local state */
    const idx = allTickets.findIndex(t => String(t.id) === String(ticketId));
    if (idx !== -1) allTickets[idx].status = 'Resolved';

    updateDashStats();
    renderTickets();
    showToast(`Ticket #${ticketId} resolved successfully!`, 'success');
  } catch (err) {
    console.error('Resolve error:', err);
    btn.disabled  = false;
    btn.innerHTML = originalHTML;
    showToast(err.message || 'Failed to resolve ticket.', 'error');
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─────────────────────────────────────────────────────────── */
/*  Boot — detect which page we're on                         */
/* ─────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('login-form')) {
    initLoginPage();
  } else if (document.getElementById('tickets-grid')) {
    initDashboardPage();
  }
});
