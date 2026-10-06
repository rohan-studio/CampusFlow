/**
 * CampusFlow — API Module (api.js)
 * Handles all communication with the backend REST API.
 */

const API_BASE = (typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('http'))
  ? window.location.origin
  : 'http://localhost:8000';

/**
 * Submit a new complaint.
 * POST /complaint
 * @param {string} text - The complaint description text.
 * @returns {Promise<Object>} Ticket object
 */
async function submitComplaint(text) {
  const response = await fetch(`${API_BASE}/complaint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: text }),
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
