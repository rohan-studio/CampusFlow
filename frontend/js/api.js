/**
 * CampusFlow — API Module (api.js)
 * Handles all communication with the backend REST API.
 */

// Automatic origin detection (works seamlessly on localhost and production hosting)
const API_BASE = (typeof window !== 'undefined' && window.location.origin && window.location.protocol.startsWith('http'))
  ? window.location.origin
  : 'http://127.0.0.1:8000';

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
 * Direct client-to-Cloudinary upload helper.
 * Uploads photo directly to Cloudinary using signed authorization from backend,
 * completely bypassing Vercel/serverless 4.5MB payload limits.
 * @param {Blob} photoBlob
 * @returns {Promise<string>} Secure Cloudinary image URL
 */
async function uploadDirectToCloudinary(photoBlob) {
  // 1. Fetch upload authorization signature from backend
  const signRes = await fetch(`${API_BASE}/cloudinary-sign`);
  if (!signRes.ok) {
    throw new Error('Failed to retrieve Cloudinary upload authorization');
  }
  const signData = await signRes.json();

  // 2. Post file directly to Cloudinary REST API
  const cldFormData = new FormData();
  cldFormData.append('file', photoBlob);
  cldFormData.append('api_key', signData.api_key);
  cldFormData.append('timestamp', signData.timestamp);
  cldFormData.append('signature', signData.signature);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloud_name}/image/upload`, {
    method: 'POST',
    body: cldFormData
  });

  if (!uploadRes.ok) {
    const errorJson = await uploadRes.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Direct Cloudinary upload failed');
  }

  const uploadData = await uploadRes.json();
  return uploadData.secure_url;
}

/**
 * Submit a new complaint.
 * 1. If photo is attached, uploads directly to Cloudinary
 * 2. Sends complaint details + Cloudinary image_url to backend
 * 3. Falls back gracefully to backend multipart upload if needed
 * @param {string} text - The complaint description text.
 * @param {Blob|File|string|null} photo - Optional photo (Blob, File, or Base64 Data URL).
 * @param {Function|null} onStatusUpdate - Status callback during upload
 * @returns {Promise<Object>} Ticket object
 */
async function submitComplaint(text, photo = null, onStatusUpdate = null) {
  let photoBlob = null;
  if (photo) {
    if (photo instanceof Blob || (typeof File !== 'undefined' && photo instanceof File)) {
      photoBlob = photo;
    } else if (typeof photo === 'string' && photo.startsWith('data:')) {
      photoBlob = await dataURItoBlob(photo);
    }
  }

  let imageUrl = null;
  if (photoBlob) {
    if (onStatusUpdate) onStatusUpdate('Uploading photo to Cloudinary…');
    try {
      imageUrl = await uploadDirectToCloudinary(photoBlob);
    } catch (cldErr) {
      console.warn('Direct Cloudinary upload failed, falling back to backend upload:', cldErr);
    }
  }

  if (onStatusUpdate) onStatusUpdate('Analyzing with AI & submitting…');

  const formData = new FormData();
  formData.append('message', text);
  formData.append('submission_id', generateSubmissionId());

  if (imageUrl) {
    formData.append('image_url', imageUrl);
  } else if (photoBlob) {
    formData.append('photo', photoBlob, 'complaint_photo.jpg');
  }

  // Attach logged-in user session token if present
  const userToken = (typeof localStorage !== 'undefined') ? localStorage.getItem('cf_user_token') : null;
  if (userToken) {
    formData.append('token', userToken);
  }

  const reqHeaders = {};
  if (userToken) {
    reqHeaders['Authorization'] = `Bearer ${userToken}`;
  }

  const response = await fetch(`${API_BASE}/complaint`, {
    method: 'POST',
    headers: reqHeaders,
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
      created_at: normalizeTicketDate(data.ticket.created_at) || new Date().toISOString(),
    };
  }
  return data;
}

/**
 * Normalize UTC ISO date strings from backend.
 * Ensures naive UTC timestamps (e.g. "2026-10-08T21:00:28.112339")
 * are correctly identified as UTC by appending 'Z', preventing
 * timezone conversion errors in browsers.
 * @param {string|null} dateStr
 * @returns {string|null}
 */
function normalizeTicketDate(dateStr) {
  if (!dateStr) return null;
  let s = String(dateStr).trim();
  if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T');
  }
  if (!s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
    s += 'Z';
  }
  return s;
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
    created_at: normalizeTicketDate(t.created_at),
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

  const ticket = await response.json();
  return {
    ...ticket,
    description: ticket.problem || ticket.description || 'No description provided.',
    created_at: normalizeTicketDate(ticket.created_at),
  };
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

/**
 * Register a genuine college student/faculty member.
 * POST /auth/register
 * @param {Object} userData - { college_id, name, email, user_type, password }
 * @returns {Promise<Object>} { message, user, token }
 */
async function registerCampusUser(userData) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.detail || errorData.message || `Registration error: ${response.status}`;
    throw new Error(msg);
  }

  return response.json();
}

/**
 * Authenticate student/faculty with College ID and password.
 * POST /auth/login
 * @param {string} collegeId - College ID or email
 * @param {string} password - User password
 * @returns {Promise<Object>} { message, user, token }
 */
async function loginCampusUser(collegeId, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ college_id: collegeId, password: password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.detail || errorData.message || `Login error: ${response.status}`;
    throw new Error(msg);
  }

  return response.json();
}

/**
 * Fetch currently logged in user profile using token.
 * GET /auth/me
 * @returns {Promise<Object>} { user }
 */
async function getCampusCurrentUser() {
  const token = localStorage.getItem('cf_user_token');
  if (!token) return null;

  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    localStorage.removeItem('cf_user_token');
    localStorage.removeItem('cf_user_data');
    return null;
  }

  return response.json();
}
