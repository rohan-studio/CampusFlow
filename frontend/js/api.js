/**
 * CampusFlow — API Module (api.js)
 * Handles all communication with the backend REST API.
 */

const API_BASE = 'http://localhost:8000';

/**
 * Submit a new complaint.
 * POST /api/complaints
 * @param {string} text - The complaint description text.
 * @returns {Promise<Object>} Ticket object: { id, category, department, urgency, status, description, created_at }
 */
async function submitComplaint(text) {
  const response = await fetch(`${API_BASE}/api/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description: text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server error: ${response.status}`);
  }

  return response.json();
}

/**
 * Retrieve all tickets.
 * GET /api/tickets
 * Requires auth token from sessionStorage.
 * @returns {Promise<Array>} Array of ticket objects.
 */
async function getAllTickets() {
  const token = sessionStorage.getItem('cf_token');

  const response = await fetch(`${API_BASE}/api/tickets`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server error: ${response.status}`);
  }

  return response.json();
}

/**
 * Resolve a specific ticket.
 * PATCH /api/tickets/:id/resolve
 * Requires auth token from sessionStorage.
 * @param {string|number} id - The ticket ID to resolve.
 * @returns {Promise<Object>} Updated ticket object.
 */
async function resolveTicket(id) {
  const token = sessionStorage.getItem('cf_token');

  const response = await fetch(`${API_BASE}/api/tickets/${id}/resolve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server error: ${response.status}`);
  }

  return response.json();
}

/**
 * Authenticate an admin user.
 * POST /api/admin/login
 * @param {string} username - Admin username.
 * @param {string} password - Admin password.
 * @returns {Promise<Object>} Auth response: { token, username }
 */
async function adminLogin(username, password) {
  const response = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Invalid credentials. Please try again.');
  }

  return response.json();
}
