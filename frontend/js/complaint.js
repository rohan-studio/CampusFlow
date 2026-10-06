/**
 * CampusFlow — Complaint Form Handler (complaint.js)
 * Handles form submission, result display, and toast notifications.
 */

/* ── Toast Notifications ──────────────────────────────────── */
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
    <span class="toast-close" role="button" aria-label="Close">✕</span>
  `;

  container.appendChild(toast);

  const remove = () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 320);
  };

  toast.querySelector('.toast-close').addEventListener('click', remove);
  setTimeout(remove, duration);
}

/* ── Urgency & Status Helpers ────────────────────────────── */
function normalizeUrgency(urgency) {
  if (!urgency) return 'Low';
  const u = String(urgency).toLowerCase().trim();
  if (u.includes('high') || u.includes('urgent') || u.includes('critical')) return 'High';
  if (u.includes('med')) return 'Medium';
  if (u.includes('low')) return 'Low';
  return 'Low';
}

function getUrgencyBadge(urgency) {
  const norm = normalizeUrgency(urgency);
  const cfg = {
    High:   { class: 'badge-high',   icon: '🔴', label: 'High' },
    Medium: { class: 'badge-medium', icon: '🟡', label: 'Medium' },
    Low:    { class: 'badge-low',    icon: '🟢', label: 'Low' },
  }[norm] || { class: 'badge-low', icon: '🟢', label: 'Low' };

  return `<span class="badge ${cfg.class}">${cfg.icon} ${cfg.label}</span>`;
}

function getStatusBadge(status) {
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

/* ── Format Date ──────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return dateStr;
  }
}

/* ── Result Display ───────────────────────────────────────── */
function displayResult(ticket) {
  const resultArea = document.getElementById('result-area');
  if (!resultArea) return;

  const urgencyBadge = getUrgencyBadge(ticket.urgency);
  const statusBadge  = getStatusBadge(ticket.status);
  const date         = formatDate(ticket.created_at || new Date().toISOString());
  const displayId    = ticket.ticket_id || (ticket.id ? `#${ticket.id}` : 'N/A');

  resultArea.innerHTML = `
    <div class="result-card">
      <div class="result-success-header">
        <div class="result-icon">✅</div>
        <div>
          <div class="result-title">Complaint Submitted!</div>
          <div class="result-subtitle">Track your complaint using the ticket ID below.</div>
        </div>
      </div>

      <div class="result-grid">
        <div class="result-field" style="grid-column: 1 / -1;">
          <div class="result-field-label">Ticket ID</div>
          <div class="result-field-value">
            <span class="ticket-id-badge">${displayId}</span>
          </div>
        </div>

        <div class="result-field">
          <div class="result-field-label">Category</div>
          <div class="result-field-value">${ticket.category || '—'}</div>
        </div>

        <div class="result-field">
          <div class="result-field-label">Department</div>
          <div class="result-field-value">${ticket.department || '—'}</div>
        </div>

        <div class="result-field">
          <div class="result-field-label">Location</div>
          <div class="result-field-value">${ticket.location || '—'}</div>
        </div>

        <div class="result-field">
          <div class="result-field-label">Urgency Level</div>
          <div class="result-field-value">${urgencyBadge}</div>
        </div>

        <div class="result-field">
          <div class="result-field-label">Status</div>
          <div class="result-field-value">${statusBadge}</div>
        </div>

        <div class="result-field">
          <div class="result-field-label">Submitted On</div>
          <div class="result-field-value" style="font-weight: 500; color: var(--text-muted);">${date}</div>
        </div>

        ${ticket.problem || ticket.description ? `
        <div class="result-field" style="grid-column: 1 / -1;">
          <div class="result-field-label">Identified Problem</div>
          <div class="result-field-value">${ticket.problem || ticket.description}</div>
        </div>` : ''}
      </div>

      <p style="margin-top: 16px; font-size: .82rem; color: var(--text-muted); line-height: 1.6;">
        📧 Save your ticket ID for reference. Our team will review and address your complaint promptly.
      </p>
    </div>
  `;

  resultArea.classList.add('visible');
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ── Form Validation ──────────────────────────────────────── */
function validateForm(textarea) {
  const value = textarea.value.trim();
  const errorEl = document.getElementById('complaint-error');
  const charCount = document.getElementById('char-count');

  if (charCount) charCount.textContent = value.length;

  if (!value) {
    textarea.classList.add('error');
    if (errorEl) { errorEl.textContent = 'Please describe your complaint.'; errorEl.classList.add('visible'); }
    return false;
  }

  if (value.length < 20) {
    textarea.classList.add('error');
    if (errorEl) { errorEl.textContent = 'Please provide at least 20 characters for a meaningful complaint.'; errorEl.classList.add('visible'); }
    return false;
  }

  textarea.classList.remove('error');
  if (errorEl) errorEl.classList.remove('visible');
  return true;
}

/* ── Form Submit Handler ──────────────────────────────────── */
function initComplaintForm() {
  const form      = document.getElementById('complaint-form');
  const textarea  = document.getElementById('complaint-text');
  const submitBtn = document.getElementById('submit-btn');
  const btnText   = document.getElementById('btn-text');

  if (!form || !textarea || !submitBtn) return;

  /* Live character count */
  textarea.addEventListener('input', () => {
    const charCount = document.getElementById('char-count');
    if (charCount) charCount.textContent = textarea.value.length;
    if (textarea.value.trim().length >= 20) {
      textarea.classList.remove('error');
      const errEl = document.getElementById('complaint-error');
      if (errEl) errEl.classList.remove('visible');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm(textarea)) return;

    const complaintText = textarea.value.trim();

    /* Loading state */
    submitBtn.disabled = true;
    if (btnText) btnText.innerHTML = '<span class="btn-spinner"></span> Submitting…';

    /* Hide previous result */
    const resultArea = document.getElementById('result-area');
    if (resultArea) resultArea.classList.remove('visible');

    try {
      const ticket = await submitComplaint(complaintText);
      displayResult(ticket);
      showToast('Complaint submitted successfully!', 'success');

      /* Reset form */
      form.reset();
      const charCount = document.getElementById('char-count');
      if (charCount) charCount.textContent = '0';

      /* Refresh home stats & complaints table */
      loadHomeStats();
      fetchAndRenderHomeComplaints();

    } catch (err) {
      console.error('Complaint submission error:', err);
      showToast(err.message || 'Failed to submit complaint. Please try again.', 'error', 6000);
    } finally {
      submitBtn.disabled = false;
      if (btnText) btnText.textContent = 'Submit Complaint';
    }
  });
}

/* ── Home Page Live Stats ─────────────────────────────────── */
async function loadHomeStats() {
  const resolvedEl = document.getElementById('home-stat-resolved');
  const pendingEl  = document.getElementById('home-stat-pending');
  const deptsEl    = document.getElementById('home-stat-depts');
  const satEl      = document.getElementById('home-stat-satisfaction');

  if (!resolvedEl && !pendingEl) return;

  try {
    const tickets = await getAllTickets();
    const resolved = tickets.filter(t => t.status?.toLowerCase() === 'resolved').length;
    const pending  = tickets.filter(t => t.status?.toLowerCase() !== 'resolved').length;
    const depts    = new Set(tickets.map(t => t.department).filter(Boolean)).size;

    if (resolvedEl) resolvedEl.textContent = resolved;
    if (pendingEl)  pendingEl.textContent  = pending;
    if (deptsEl)    deptsEl.textContent    = depts || 0;
    if (satEl && tickets.length > 0) {
      const rate = Math.round((resolved / tickets.length) * 100);
      satEl.textContent = `${rate}%`;
    }
  } catch {
    // If backend is offline or starting up, keep default numbers
  }
}

/* ── Recent Complaints Feed (5 items, Show More, Show All) ── */
let allHomeTickets = [];
let homeDisplayLimit = 5;

async function fetchAndRenderHomeComplaints() {
  const container = document.getElementById('home-complaints-container');
  if (!container) return;

  try {
    allHomeTickets = await getAllTickets();
    renderHomeComplaints();
  } catch (err) {
    console.error('Failed to load recent complaints:', err);
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h3>Could not load recent complaints</h3>
        <p>Make sure the backend is running. We will keep checking.</p>
      </div>`;
  }
}

function renderHomeComplaints() {
  const container = document.getElementById('home-complaints-container');
  const showMoreBtn = document.getElementById('show-more-btn');
  const showingCountEl = document.getElementById('showing-count');
  const totalCountEl = document.getElementById('total-count');

  if (!container) return;

  if (allHomeTickets.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎉</span>
        <h3>No complaints reported yet!</h3>
        <p>All campus facilities are currently in great condition.</p>
      </div>`;
    if (showMoreBtn) showMoreBtn.style.display = 'none';
    return;
  }

  const visibleTickets = allHomeTickets.slice(0, homeDisplayLimit);

  if (showingCountEl) showingCountEl.textContent = visibleTickets.length;
  if (totalCountEl)   totalCountEl.textContent   = allHomeTickets.length;

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
          ${visibleTickets.map(t => {
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
                <td>${getUrgencyBadge(urgencyKey)}</td>
                <td>${getStatusBadge(t.status)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  /* Attach click listeners */
  container.querySelectorAll('.ticket-row').forEach(row => {
    row.addEventListener('click', () => openHomeModal(row.dataset.ticketId));
  });

  /* Show More Button Visibility */
  if (showMoreBtn) {
    if (allHomeTickets.length > homeDisplayLimit) {
      showMoreBtn.style.display = 'inline-flex';
    } else {
      showMoreBtn.style.display = 'none';
    }
  }
}

/* ── Student Details Modal Popup ──────────────────────────── */
function openHomeModal(ticketId) {
  const ticket = allHomeTickets.find(t =>
    String(t.ticket_id) === String(ticketId) || String(t.id) === String(ticketId)
  );

  if (!ticket) return;

  const overlay  = document.getElementById('home-modal-overlay');
  const titleEl  = document.getElementById('home-modal-ticket-id');
  const statusEl = document.getElementById('home-modal-ticket-status');
  const bodyEl   = document.getElementById('home-modal-body');

  if (!overlay || !bodyEl) return;

  const displayId = ticket.ticket_id || `#${ticket.id}`;

  if (titleEl) titleEl.textContent = `Ticket Details — ${displayId}`;
  if (statusEl) statusEl.innerHTML = getStatusBadge(ticket.status);

  bodyEl.innerHTML = `
    <div class="modal-info-grid">
      <div class="modal-info-item">
        <div class="modal-info-label">Category</div>
        <div class="modal-info-value"><span class="badge badge-accent">${escapeHtml(ticket.category || 'General')}</span></div>
      </div>

      <div class="modal-info-item">
        <div class="modal-info-label">Urgency Level</div>
        <div class="modal-info-value">${getUrgencyBadge(ticket.urgency || 'Low')}</div>
      </div>

      <div class="modal-info-item">
        <div class="modal-info-label">Department</div>
        <div class="modal-info-value">🏫 ${escapeHtml(ticket.department || 'Not Assigned')}</div>
      </div>

      <div class="modal-info-item">
        <div class="modal-info-label">Location</div>
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
  `;

  overlay.classList.add('visible');
}

function closeHomeModal() {
  const overlay = document.getElementById('home-modal-overlay');
  if (overlay) overlay.classList.remove('visible');
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
document.addEventListener('DOMContentLoaded', () => {
  initComplaintForm();
  loadHomeStats();
  fetchAndRenderHomeComplaints();

  /* Show More Button */
  const showMoreBtn = document.getElementById('show-more-btn');
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', () => {
      homeDisplayLimit += 5;
      renderHomeComplaints();
    });
  }

  /* Modal Close Listeners */
  const closeBtn = document.getElementById('home-modal-close-btn');
  const closeActionBtn = document.getElementById('home-modal-close-action');
  const overlay = document.getElementById('home-modal-overlay');

  if (closeBtn) closeBtn.addEventListener('click', closeHomeModal);
  if (closeActionBtn) closeActionBtn.addEventListener('click', closeHomeModal);
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeHomeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeHomeModal();
  });
});
