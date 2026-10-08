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
        <span class="empty-icon">⚠️</span>
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
        <span class="empty-icon">🔍</span>
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

            return `
              <tr class="ticket-row ${isResolved ? 'resolved' : ''}" data-ticket-id="${targetId}" title="Click row to view full details">
                <td><span class="ticket-id-badge">${displayId}</span></td>
                <td><div class="table-problem-text" title="${escapeHtml(rawDesc)}">${escapeHtml(shortDesc)}</div></td>
                <td><span class="badge badge-accent">${escapeHtml(t.category || 'General')}</span></td>
                <td><span>🏫 ${escapeHtml(t.department || '—')}</span></td>
                <td><span>📍 ${escapeHtml(t.location || '—')}</span></td>
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
        <div class="modal-info-value">🏫 ${escapeHtml(ticket.department || 'Not Assigned')}</div>
      </div>

      <div class="modal-info-item">
        <div class="modal-info-label">Campus Location</div>
        <div class="modal-info-value">📍 ${escapeHtml(ticket.location || 'Not Specified')}</div>
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
      <div style="font-size:.78rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">📸 Attached Photo</div>
      <img
        src="${ticket.image_url}"
        alt="Complaint photo"
        style="width:100%;max-height:260px;object-fit:cover;border-radius:var(--radius);border:1px solid var(--border);display:block;"
        loading="lazy"
      />
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

function formatDate(dateStr) {
  if (!dateStr) return 'Registered in system';
  try {
    const d = new Date(dateStr);
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
