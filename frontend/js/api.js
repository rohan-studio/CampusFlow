/**
 * CampusFlow — API Module (api.js)
 * Handles all communication with the backend REST API.
 */

// Live Render backend URL (used when hosted on Cloudflare Pages or outside localhost)
const PRODUCTION_BACKEND_URL = 'https://campusflow-imnt.onrender.com';

const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.protocol === 'file:' ||
  !window.location.hostname
);

const API_BASE = isLocal
  ? (window.location.port === '8000' ? window.location.origin : 'http://127.0.0.1:8000')
  : (window.CAMPUSFLOW_API_URL || PRODUCTION_BACKEND_URL);

/**
 * Helper to convert Base64 Data URL to a native Blob
 * @param {string} dataURI - Base64 Data URL
 * @returns {Promise<Blob>}
 */
async function dataURItoBlob(dataURI) {
  const res = await fetch(dataURI);
  return await res.blob();
}

/**
 * Generate a unique submission ID for complaint idempotency
 * @returns {string}
 */
function generateSubmissionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Submit a new complaint.
 * POST /complaint (multipart/form-data)
 * @param {string} text - The complaint description text.
 * @param {Blob|File|string|null} photo - Optional photo (Blob, File, or Base64 Data URL).
 * @returns {Promise<Object>} Ticket object
 */
async function submitComplaint(text, photo = null) {
  const formData = new FormData();
  formData.append('message', text);
  formData.append('submission_id', generateSubmissionId());

  // Attach photo if provided
  if (photo) {
    if (photo instanceof Blob || (typeof File !== 'undefined' && photo instanceof File)) {
      formData.append('photo', photo, photo.name || 'complaint_photo.jpg');
    } else if (typeof photo === 'string' && photo.startsWith('data:')) {
      const blob = await dataURItoBlob(photo);
      formData.append('photo', blob, 'complaint_photo.jpg');
    }
  }

  // NOTE: Do not set Content-Type header manually when sending FormData.
  // The browser automatically sets multipart/form-data with the correct boundary.
  const response = await fetch(`${API_BASE}/complaint`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.detail || errorData.message || `Server error: ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  // Backend returns { message, complaint, analysis, department, ticket }
  if (data.ticket) {
    return {
      ...data.ticket,
      description: data.ticket.problem || text,
      created_at: data.ticket.created_at || new Date().toISOString(),
    };
  }
  return data;
}

/**
 * Retrieve all tickets.
 * GET /tickets
 * @returns {Promise<Array>} Array of ticket objects.
 */
async function getAllTickets() {
  const response = await fetch(`${API_BASE}/tickets`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.detail || errorData.message || `Server error: ${response.status}`;
    throw new Error(msg);
  }

  const tickets = await response.json();
  return tickets.map(t => ({
    ...t,
    description: t.problem || t.description || 'No description provided.',
    created_at: t.created_at || null,
  }));
}

/**
 * Retrieve a single ticket by ID.
 * GET /tickets/:ticket_id
 * @param {string|number} ticketId
 * @returns {Promise<Object>} Ticket object
 */
async function getTicket(ticketId) {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.detail || errorData.message || `Server error: ${response.status}`;
    throw new Error(msg);
  }

  return response.json();
}

/**
 * Update the status of a specific ticket.
 * PATCH /tickets/:ticket_id
 * @param {string|number} id - The ticket_id (or ID) to update.
 * @param {string} status - New status: "Pending", "In Progress", or "Resolved"
 * @returns {Promise<Object>} Updated ticket response.
 */
async function updateTicketStatus(id, status) {
  const response = await fetch(`${API_BASE}/tickets/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: status }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.detail || errorData.message || `Server error: ${response.status}`;
    throw new Error(msg);
  }

  return response.json();
}

/**
 * Resolve a specific ticket (shortcut for updateTicketStatus).
 * PATCH /tickets/:ticket_id
 * @param {string|number} id - The ticket_id (or ID) to resolve.
 * @returns {Promise<Object>} Updated ticket response.
 */
async function resolveTicket(id) {
  return updateTicketStatus(id, 'Resolved');
}

/**
 * Check backend health
 * @returns {Promise<boolean>}
 */
async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Authenticate an admin user.
 * Since backend does not expose an admin login endpoint,
 * validates credentials client-side for dashboard access.
 * @param {string} username - Admin username.
 * @param {string} password - Admin password.
 * @returns {Promise<Object>} Auth response: { token, username }
 */
async function adminLogin(username, password) {
  if (!username || !password) {
    throw new Error('Please enter both username and password.');
  }

  // Simulated admin session token
  return {
    token: 'cf_session_' + Date.now(),
    username: username,
  };
}
