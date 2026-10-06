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

/* ── Urgency Helpers ──────────────────────────────────────── */
const URGENCY_CONFIG = {
  High:   { class: 'badge-high',   icon: '🔴', label: 'High' },
  Medium: { class: 'badge-medium', icon: '🟡', label: 'Medium' },
  Low:    { class: 'badge-low',    icon: '🟢', label: 'Low' },
};

function getUrgencyBadge(urgency) {
  const cfg = URGENCY_CONFIG[urgency] || { class: 'badge-accent', icon: '⚪', label: urgency };
  return `<span class="badge ${cfg.class}">${cfg.icon} ${cfg.label}</span>`;
}

function getStatusBadge(status) {
  const isResolved = status?.toLowerCase() === 'resolved';
  return `<span class="badge ${isResolved ? 'badge-resolved' : 'badge-pending'}">
    ${isResolved ? '✅' : '⏳'} ${status || 'Pending'}
  </span>`;
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
  const date         = formatDate(ticket.created_at);

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
            <span class="ticket-id-badge">#${ticket.id || 'N/A'}</span>
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
          <div class="result-field-label">Urgency Level</div>
          <div class="result-field-value">${urgencyBadge}</div>
        </div>

        <div class="result-field">
          <div class="result-field-label">Status</div>
          <div class="result-field-value">${statusBadge}</div>
        </div>

        <div class="result-field" style="grid-column: 1 / -1;">
          <div class="result-field-label">Submitted On</div>
          <div class="result-field-value" style="font-weight: 500; color: var(--text-muted);">${date}</div>
        </div>
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

      /* Insert new ticket into live feed */
      const feed = document.getElementById('public-tickets-grid');
      if (feed) {
        const emptyState = feed.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const card = document.createElement('div');
        const urgencyKey = (ticket.urgency || 'medium').toLowerCase().split(' ')[0];
        card.className = `ticket-card clickable urgency-${urgencyKey}`;
        card.style.cursor = 'pointer';
        card.onclick = () => {
          if (typeof openTicketDetails === 'function') openTicketDetails(ticket);
        };
        card.innerHTML = `
          <div>
            <div class="ticket-meta">
              <span class="ticket-id">#${ticket.ticket_id || ticket.id}</span>
              <span class="badge badge-pending">⏳ ${ticket.status || 'Pending'}</span>
              <span class="badge badge-accent">🏫 ${ticket.department || 'General'}</span>
            </div>
            <p class="ticket-description" style="font-weight: 500; margin: 8px 0 12px; font-size: .95rem;">
              ${ticket.problem || ticket.description || complaintText}
            </p>
            <div class="ticket-footer" style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size: .82rem; color: var(--text-muted);">
                📍 <strong>Location:</strong> ${ticket.location || 'Campus'} • 🏷️ <strong>Category:</strong> ${ticket.category || 'General'}
              </span>
              <span style="font-size: .82rem; color: var(--accent); font-weight: 600;">
                Click for details ➔
              </span>
            </div>
          </div>
        `;
        feed.prepend(card);
      }

      /* Reset form */
      form.reset();
      const charCount = document.getElementById('char-count');
      if (charCount) charCount.textContent = '0';

    } catch (err) {
      console.error('Complaint submission error:', err);
      showToast(err.message || 'Failed to submit complaint. Please try again.', 'error', 6000);
    } finally {
      submitBtn.disabled = false;
      if (btnText) btnText.textContent = 'Submit Complaint';
    }
  });
}

/* ── Boot ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initComplaintForm);
