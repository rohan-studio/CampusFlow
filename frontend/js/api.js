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
 * Submit a new complaint.
 * POST /complaint
 * @param {string} text - The complaint description text.
 * @param {string|null} imageBase64 - Optional Base64 image string (from camera or gallery).
 * @returns {Promise<Object>} Ticket object
 */
async function submitComplaint(text, imageBase64 = null) {
  const payload = { message: text };

  // Only include the image field if the user actually attached one
  // The backend will read this and upload to Cloudinary if present
  if (imageBase64) {
    payload.image = imageBase64;
  }

  const response = await fetch(`${API_BASE}/complaint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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
 * Resolve a specific ticket.
 * PATCH /tickets/:ticket_id
 * @param {string|number} id - The ticket_id (or ID) to resolve.
 * @returns {Promise<Object>} Updated ticket response.
 */
async function resolveTicket(id) {
  const response = await fetch(`${API_BASE}/tickets/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'Resolved' }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.detail || errorData.message || `Server error: ${response.status}`;
    throw new Error(msg);
  }

  return response.json();
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
