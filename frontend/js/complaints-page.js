/**
 * CampusFlow — All Complaints Page Handler (complaints-page.js)
 * Handles full complaints list, multi-criteria filtering, search, and details modal popup.
 */

let allTickets = [];
let activeStatusFilter  = 'all';
let activeUrgencyFilter = 'all';
let searchQuery = '';

function initComplaintsPage() {
  /* Search input */
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderComplaints();
    });
  }

  /* Filter buttons — status */
  document.querySelectorAll('[data-status-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatusFilter = btn.dataset.statusFilter;
      document.querySelectorAll('[data-status-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderComplaints();
    });
  });

  /* Filter buttons — urgency */
  document.querySelectorAll('[data-urgency-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeUrgencyFilter = btn.dataset.urgencyFilter;
      document.querySelectorAll('[data-urgency-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderComplaints();
    });
  });

  /* Refresh button */
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', fetchComplaints);

  /* Modal Close Listeners */
  const modalOverlay = document.getElementById('complaint-modal-overlay');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCloseAction = document.getElementById('modal-close-action');

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalCloseAction) modalCloseAction.addEventListener('click', closeModal);

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  fetchComplaints();
}

async function fetchComplaints() {
  const container = document.getElementById('complaints-list-container');
  const spinner   = document.getElementById('spinner');
  if (!container) return;

  if (spinner) spinner.style.display = 'flex';

  try {
    allTickets = await getAllTickets();
    allTickets.sort((a, b) => {
      if (a.created_at && b.created_at) {
        const timeDiff = new Date(b.created_at) - new Date(a.created_at);
        if (timeDiff !== 0) return timeDiff;
      }
      return (b.id || 0) - (a.id || 0);
    });
    updateStats();
    renderComplaints();
  } catch (err) {
    console.error('Failed to fetch complaints:', err);
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon"><svg class="ui-icon" width="40" height="40" viewBox="0 0 24 24" style="stroke:var(--warning);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>
        <h3>Could not load complaints</h3>
        <p>${err.message || 'Please check your connection and try again.'}</p>
      </div>`;
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}

function updateStats() {
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

function getFilteredComplaints() {
  return allTickets.filter(t => {
    /* Status Match */
    const isResolved = t.status?.toLowerCase() === 'resolved';
    const statusMatch =
      activeStatusFilter === 'all' ||
      (activeStatusFilter === 'pending'  && !isResolved) ||
      (activeStatusFilter === 'resolved' && isResolved);

    /* Urgency Match */
    const urgencyMatch =
      activeUrgencyFilter === 'all' ||
      normalizeUrgency(t.urgency).toLowerCase() === activeUrgencyFilter.toLowerCase();

    /* Search Match */
    const searchMatch = !searchQuery || [
      t.ticket_id,
      t.problem,
      t.description,
      t.location,
      t.department,
      t.category,
      t.status
    ].some(field => String(field || '').toLowerCase().includes(searchQuery));

    return statusMatch && urgencyMatch && searchMatch;
  });
}

function renderComplaints() {
  const container = document.getElementById('complaints-list-container');
  if (!container) return;

  const filtered = getFilteredComplaints();

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon"><svg class="ui-icon" width="40" height="40" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
        <h3>No matching complaints found</h3>
        <p>Try adjusting your search keywords or filter settings.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
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
          </tr>
        </thead>
        <tbody>
          ${filtered.map(t => {
            const isResolved = t.status?.toLowerCase() === 'resolved';
            const urgencyKey = t.urgency || 'Low';
            const rawDesc    = t.problem || t.description || 'No description provided';
            const shortDesc  = rawDesc.length > 55 ? rawDesc.slice(0, 55) + '…' : rawDesc;
            const displayId  = t.ticket_id || `#${t.id}`;
            const targetId   = t.ticket_id || t.id;

            const hasPhoto   = Boolean(t.image_url);
            return `
              <tr class="ticket-row ${isResolved ? 'resolved' : ''}" data-ticket-id="${targetId}" title="Click row to view full details">
                <td><span class="ticket-id-badge">${displayId}</span></td>
                <td>
                  <div class="table-problem-text" title="${escapeHtml(rawDesc)}">
                    ${hasPhoto ? '<span title="Photo attached" style="margin-right:4px;display:inline-flex;align-items:center;vertical-align:middle;"><svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg></span>' : ''}
                    ${escapeHtml(shortDesc)}
                  </div>
                </td>
                <td><span class="badge badge-accent">${escapeHtml(t.category || 'General')}</span></td>
                <td><span style="display:inline-flex;align-items:center;gap:4px;"><svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg> ${escapeHtml(t.department || '—')}</span></td>
                <td><span style="display:inline-flex;align-items:center;gap:4px;"><svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> ${escapeHtml(t.location || '—')}</span></td>
                <td>${urgencyBadge(urgencyKey)}</td>
                <td>${statusBadge(t.status)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  /* Attach listeners */
  container.querySelectorAll('.ticket-row').forEach(row => {
    row.addEventListener('click', () => openModal(row.dataset.ticketId));
  });
}

/* ── Modal Details Popup ──────────────────────────────────── */
function openModal(ticketId) {
  const ticket = allTickets.find(t =>
    String(t.ticket_id) === String(ticketId) || String(t.id) === String(ticketId)
  );

  if (!ticket) return;

  const overlay  = document.getElementById('complaint-modal-overlay');
  const titleEl  = document.getElementById('modal-ticket-id');
  const statusEl = document.getElementById('modal-ticket-status');
  const bodyEl   = document.getElementById('modal-body');

  if (!overlay || !bodyEl) return;

  const displayId = ticket.ticket_id || `#${ticket.id}`;

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
        <div class="modal-info-value" style="display:inline-flex;align-items:center;gap:5px;"><svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg> ${escapeHtml(ticket.department || 'Not Assigned')}</div>
      </div>

      <div class="modal-info-item">
        <div class="modal-info-label">Campus Location</div>
        <div class="modal-info-value" style="display:inline-flex;align-items:center;gap:5px;"><svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> ${escapeHtml(ticket.location || 'Not Specified')}</div>
      </div>

      <div class="modal-info-item" style="grid-column: 1 / -1;">
        <div class="modal-info-label">Date Submitted</div>
        <div class="modal-info-value" style="font-weight: 500; color: var(--text-muted);">${formatDate(ticket.created_at)}</div>
      </div>
    </div>

    <div class="modal-problem-box">
      <h4>Full Complaint Description</h4>
      <p>${escapeHtml(ticket.problem || ticket.description || 'No detailed description available.')}</p>
    </div>

    ${ticket.image_url ? `
    <div style="margin-top:16px;">
      <div style="font-size:.78rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;display:flex;align-items:center;gap:5px;"><svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg> Attached Photo (Cloudinary)</div>
      <a href="${ticket.image_url}" target="_blank" rel="noopener noreferrer" title="Click to view full photo in new tab">
        <img
          src="${ticket.image_url}"
          alt="Complaint photo"
          style="width:100%;max-height:260px;object-fit:cover;border-radius:var(--radius);border:1px solid var(--border);display:block;cursor:pointer;"
          loading="lazy"
        />
      </a>
      <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;display:flex;align-items:center;gap:5px;"><svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg> Click image to open high-resolution photo in new tab</div>
    </div>` : ''}
  `;

  overlay.classList.add('visible');
}

function closeModal() {
  const overlay = document.getElementById('complaint-modal-overlay');
  if (overlay) overlay.classList.remove('visible');
}

/* ── Badges & Formatting ──────────────────────────────────── */
function normalizeUrgency(urgency) {
  if (!urgency) return 'Low';
  const u = String(urgency).toLowerCase().trim();
  if (u.includes('high') || u.includes('urgent') || u.includes('critical')) return 'High';
  if (u.includes('med')) return 'Medium';
  if (u.includes('low')) return 'Low';
  return 'Low';
}

const URGENCY_CONFIG = {
  High:   { badgeClass: 'badge-high',   dotClass: 'dot-high' },
  Medium: { badgeClass: 'badge-medium', dotClass: 'dot-medium' },
  Low:    { badgeClass: 'badge-low',    dotClass: 'dot-low' },
};

function urgencyBadge(urgency) {
  const norm = normalizeUrgency(urgency);
  const cfg = URGENCY_CONFIG[norm] || { badgeClass: 'badge-low', dotClass: 'dot-low' };
  return `<span class="badge ${cfg.badgeClass}"><span class="dot ${cfg.dotClass}"></span>${norm}</span>`;
}

function statusBadge(status) {
  const s = String(status || 'Pending').trim();
  const isResolved = s.toLowerCase() === 'resolved';
  const isInProgress = s.toLowerCase().includes('progress');

  if (isResolved) {
    return `<span class="badge badge-resolved"><svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" style="stroke:var(--success);"><polyline points="20 6 9 17 4 12"/></svg> Resolved</span>`;
  }
  if (isInProgress) {
    return `<span class="badge badge-inprogress"><svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" style="stroke:var(--info);"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> In Progress</span>`;
  }
  return `<span class="badge badge-pending"><svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" style="stroke:var(--warning);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Pending</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Registered in system';
  try {
    let s = String(dateStr).trim();
    if (s.includes(' ') && !s.includes('T')) {
      s = s.replace(' ', 'T');
    }
    if (!s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
      s += 'Z';
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-IN', {
      dateStyle: 'medium', timeStyle: 'short',
    });
  } catch { return dateStr; }
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

/* ── Boot ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initComplaintsPage);
