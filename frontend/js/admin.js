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

function normalizeUrgency(urgency) {
  if (!urgency) return 'Low';
  const u = String(urgency).toLowerCase().trim();
  if (u.includes('high') || u.includes('urgent') || u.includes('critical')) return 'High';
  if (u.includes('med')) return 'Medium';
  if (u.includes('low')) return 'Low';
  return 'Low';
}

const URGENCY_CONFIG = {
  High:   { badgeClass: 'badge-high',   icon: '🔴' },
  Medium: { badgeClass: 'badge-medium', icon: '🟡' },
  Low:    { badgeClass: 'badge-low',    icon: '🟢' },
};

function urgencyBadge(urgency) {
  const norm = normalizeUrgency(urgency);
  const cfg = URGENCY_CONFIG[norm] || { badgeClass: 'badge-low', icon: '🟢' };
  return `<span class="badge ${cfg.badgeClass}">${cfg.icon} ${norm}</span>`;
}

function statusBadge(status) {
  const s = String(status || 'Pending').trim();
  const isResolved = s.toLowerCase() === 'resolved';
  const isInProgress = s.toLowerCase().includes('progress');

  if (isResolved) {
    return `<span class="badge badge-resolved">✅ Resolved</span>`;
  }
  if (isInProgress) {
    return `<span class="badge badge-inprogress">⚙️ In Progress</span>`;
  }
  return `<span class="badge badge-pending">⏳ Pending</span>`;
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
let currentView = 'table'; // 'table' or 'cards'

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

  /* View switchers */
  const viewTableBtn = document.getElementById('view-table-btn');
  const viewCardsBtn = document.getElementById('view-cards-btn');

  if (viewTableBtn && viewCardsBtn) {
    viewTableBtn.addEventListener('click', () => {
      currentView = 'table';
      viewTableBtn.classList.add('active');
      viewCardsBtn.classList.remove('active');
      renderTickets();
    });

    viewCardsBtn.addEventListener('click', () => {
      currentView = 'cards';
      viewCardsBtn.classList.add('active');
      viewTableBtn.classList.remove('active');
      renderTickets();
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

  /* Modal Close Listeners */
  const modalOverlay = document.getElementById('ticket-modal-overlay');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeTicketModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeTicketModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTicketModal();
  });

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
  const high     = allTickets.filter(t => normalizeUrgency(t.urgency) === 'High').length;

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
      normalizeUrgency(ticket.urgency).toLowerCase() === activeUrgencyFilter.toLowerCase();

    return statusMatch && urgencyMatch;
  });
}

function renderTickets() {
  const container = document.getElementById('tickets-grid');
  if (!container) return;

  const filtered = getFilteredTickets();

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎉</span>
        <h3>No tickets found!</h3>
        <p>There are no tickets matching the current filter.</p>
      </div>`;
    return;
  }

  if (currentView === 'table') {
    container.innerHTML = buildTicketTable(filtered);

    /* Row click -> open modal */
    container.querySelectorAll('.ticket-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-resolve-id]')) return; // ignore resolve button click
        openTicketModal(row.dataset.ticketId);
      });
    });

    /* Attach direct resolve button listeners */
    container.querySelectorAll('[data-resolve-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleResolve(btn.dataset.resolveId, btn);
      });
    });

  } else {
    /* Cards View */
    container.innerHTML = `
      <div class="tickets-grid">
        ${filtered.map(ticket => buildTicketCard(ticket)).join('')}
      </div>
    `;

    container.querySelectorAll('.ticket-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-resolve-id]')) return;
        openTicketModal(card.dataset.ticketId);
      });
    });

    container.querySelectorAll('[data-resolve-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleResolve(btn.dataset.resolveId, btn);
      });
    });
  }
}

function buildTicketTable(tickets) {
  return `
    <div class="table-responsive">
      <table class="tickets-table">
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>Problem Summary</th>
            <th>Category</th>
            <th>Department</th>
            <th>Location</th>
            <th>Urgency</th>
            <th>Status</th>
            <th style="text-align: right; width: 100px;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.map(t => {
            const isResolved = t.status?.toLowerCase() === 'resolved';
            const urgencyKey = t.urgency || 'Low';
            const rawDesc    = t.problem || t.description || 'No description provided';
            const shortDesc  = rawDesc.length > 55 ? rawDesc.slice(0, 55) + '…' : rawDesc;
            const displayId  = t.ticket_id || `#${t.id}`;
            const targetId   = t.ticket_id || t.id;

            return `
              <tr class="ticket-row ${isResolved ? 'resolved' : ''}" data-ticket-id="${targetId}" title="Click row to view full details">
                <td><span class="ticket-id-badge">${displayId}</span></td>
                <td><div class="table-problem-text" title="${escapeHtml(rawDesc)}">${escapeHtml(shortDesc)}</div></td>
                <td><span class="badge badge-accent">${escapeHtml(t.category || 'General')}</span></td>
                <td><span>🏫 ${escapeHtml(t.department || '—')}</span></td>
                <td><span>📍 ${escapeHtml(t.location || '—')}</span></td>
                <td>${urgencyBadge(urgencyKey)}</td>
                <td>${statusBadge(t.status)}</td>
                <td style="text-align: right;">
                  ${!isResolved ? `
                    <button class="btn btn-success btn-sm" data-resolve-id="${targetId}" title="Mark as Resolved">
                      ✔ Resolve
                    </button>
                  ` : '<span class="badge badge-resolved" style="font-size: .7rem; padding: 2px 8px;">Resolved</span>'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function buildTicketCard(ticket) {
  const isResolved = ticket.status?.toLowerCase() === 'resolved';
  const urgencyKey = normalizeUrgency(ticket.urgency);
  const rawDesc    = ticket.problem || ticket.description || '';
  const shortDesc  = rawDesc
    ? rawDesc.slice(0, 160) + (rawDesc.length > 160 ? '…' : '')
    : 'No description provided.';
  const displayId  = ticket.ticket_id || `#${ticket.id}`;
  const resolveTargetId = ticket.ticket_id || ticket.id;

  return `
    <div class="ticket-card urgency-${urgencyKey.toLowerCase()} ${isResolved ? 'resolved' : ''}"
         data-ticket-id="${resolveTargetId}"
         id="ticket-${resolveTargetId}"
         style="cursor: pointer;"
         title="Click card to view details">
      <div>
        <div class="ticket-meta">
          <span class="ticket-id">${displayId}</span>
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
          ${ticket.location ? `
          <span class="badge" style="margin-left:4px; background: rgba(0,0,0,0.06); color: var(--text-muted);">
            📍 ${escapeHtml(ticket.location)}
          </span>` : ''}
        </div>
      </div>

      <div class="ticket-actions">
        ${!isResolved ? `
          <button
            class="btn btn-success btn-sm"
            data-resolve-id="${resolveTargetId}"
            title="Mark as Resolved"
          >✔ Resolve</button>
        ` : `
          <span class="badge badge-resolved">✅ Resolved</span>
        `}
      </div>
    </div>
  `;
}

/* ── Modal Details Popup ──────────────────────────────────── */
function openTicketModal(ticketId) {
  const ticket = allTickets.find(t =>
    String(t.ticket_id) === String(ticketId) || String(t.id) === String(ticketId)
  );

  if (!ticket) return;

  const overlay    = document.getElementById('ticket-modal-overlay');
  const titleEl    = document.getElementById('modal-ticket-id');
  const statusEl   = document.getElementById('modal-ticket-status');
  const bodyEl     = document.getElementById('modal-body');
  const footerEl   = document.getElementById('modal-footer');

  if (!overlay || !bodyEl) return;

  const displayId  = ticket.ticket_id || `#${ticket.id}`;
  const isResolved = ticket.status?.toLowerCase() === 'resolved';
  const targetId   = ticket.ticket_id || ticket.id;

  if (titleEl) titleEl.textContent = `Ticket Details — ${displayId}`;
  if (statusEl) statusEl.innerHTML = statusBadge(ticket.status);

  bodyEl.innerHTML = `
    <div class="modal-info-grid">
      <div class="modal-info-item">
        <div class="modal-info-label">Category</div>
        <div class="modal-info-value"><span class="badge badge-accent">${escapeHtml(ticket.category || 'General')}</span></div>
      </div>

      <div class="modal-info-item">
        <div class="modal-info-label">Urgency Level</div>
        <div class="modal-info-value">${urgencyBadge(ticket.urgency || 'Low')}</div>
      </div>

      <div class="modal-info-item">
        <div class="modal-info-label">Assigned Department</div>
        <div class="modal-info-value">🏫 ${escapeHtml(ticket.department || 'Not Assigned')}</div>
      </div>

      <div class="modal-info-item">
        <div class="modal-info-label">Campus Location</div>
        <div class="modal-info-value">📍 ${escapeHtml(ticket.location || 'Not Specified')}</div>
      </div>

      <div class="modal-info-item" style="grid-column: 1 / -1;">
        <div class="modal-info-label">Date Ticket Raised</div>
        <div class="modal-info-value" style="font-weight: 500; color: var(--text-muted);">${formatDate(ticket.created_at)}</div>
      </div>
    </div>

    <div class="modal-problem-box">
      <h4>Complaint Description</h4>
      <p>${escapeHtml(ticket.problem || ticket.description || 'No detailed description available.')}</p>
    </div>
  `;

  footerEl.innerHTML = `
    ${!isResolved ? `
      <button class="btn btn-success" id="modal-resolve-btn" data-modal-resolve="${targetId}">
        ✔ Mark as Resolved
      </button>
    ` : `
      <span class="badge badge-resolved" style="padding: 8px 16px; font-size: .85rem;">✅ Resolved</span>
    `}
    <button class="btn btn-secondary" id="modal-close-action">Close</button>
  `;

  /* Attach modal buttons */
  const modalResolveBtn = document.getElementById('modal-resolve-btn');
  if (modalResolveBtn) {
    modalResolveBtn.addEventListener('click', async () => {
      await handleResolve(targetId, modalResolveBtn);
      openTicketModal(targetId); // refresh modal state to show resolved
    });
  }

  const modalCloseAction = document.getElementById('modal-close-action');
  if (modalCloseAction) {
    modalCloseAction.addEventListener('click', closeTicketModal);
  }

  overlay.classList.add('visible');
}

function closeTicketModal() {
  const overlay = document.getElementById('ticket-modal-overlay');
  if (overlay) overlay.classList.remove('visible');
}

async function handleResolve(ticketId, btn) {
  const originalHTML = btn.innerHTML;
  btn.disabled  = true;
  btn.innerHTML = '<span class="btn-spinner"></span>';

  try {
    await resolveTicket(ticketId);

    /* Update local state */
    const idx = allTickets.findIndex(t =>
      String(t.ticket_id) === String(ticketId) || String(t.id) === String(ticketId)
    );
    if (idx !== -1) allTickets[idx].status = 'Resolved';

    updateDashStats();
    renderTickets();
    showToast(`Ticket ${ticketId} resolved successfully!`, 'success');
  } catch (err) {
    console.error('Resolve error:', err);
    btn.disabled  = false;
    btn.innerHTML = originalHTML;
    showToast(err.message || 'Failed to resolve ticket.', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
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
