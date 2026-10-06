/**
 * CampusFlow — API Module (api.js)
 * Handles all communication with the backend REST API.
 */

const API_BASE = 'http://localhost:8000';

/**
 * Submit a new complaint.
 * POST /complaint
 * @param {string} text - The complaint description text.
 * @returns {Promise<Object>} Ticket object: { id, category, department, urgency, status, description, created_at }
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
    throw new Error(errorData.detail || errorData.message || `Server error: ${response.status}`);
  }

  const data = await response.json();
  const ticket = data.ticket || data;
  return {
    ...ticket,
    id: ticket.ticket_id || ticket.id || 'N/A',
    description: text,
    created_at: new Date().toISOString(),
  };
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
    throw new Error(errorData.detail || errorData.message || `Server error: ${response.status}`);
  }

  const tickets = await response.json();
  return tickets.map((t) => ({
    ...t,
    id: t.ticket_id || t.id,
    description: t.problem || t.description || 'No description provided.',
    created_at: t.created_at || new Date().toISOString(),
  }));
}

/**
 * Resolve a specific ticket.
 * PATCH /tickets/:id
 * @param {string|number} id - The ticket ID to resolve.
 * @returns {Promise<Object>} Updated ticket object.
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
    throw new Error(errorData.detail || errorData.message || `Server error: ${response.status}`);
  }

  return response.json();
}

/**
 * Authenticate an admin user.
 * For local development: username 'admin', password 'admin123' (or 'admin')
 * @param {string} username - Admin username.
 * @param {string} password - Admin password.
 * @returns {Promise<Object>} Auth response: { token, username }
 */
async function adminLogin(username, password) {
  if (username === 'admin' && (password === 'admin123' || password === 'admin')) {
    return { token: 'campusflow-local-token', username: 'admin' };
  }
  throw new Error('Invalid credentials. (Hint: username "admin", password "admin123")');
}
