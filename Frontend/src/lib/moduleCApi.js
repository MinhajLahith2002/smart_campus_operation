const API_BASE = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8082';
export const MODULE_C_API_BASE = import.meta.env.VITE_MODULE_C_API_URL || `${API_BASE}/api/module-c/tickets`;

const roleMap = {
  USER: 'STUDENT',
  ADMIN: 'ADMIN',
  TECHNICIAN: 'TECHNICIAN',
  STAFF: 'STAFF',
};

export const toBackendRole = (role) => roleMap[role] || 'STUDENT';

const ensureOk = async (response) => {
  if (response.ok) return response;

  let message = 'Request failed.';
  let details = null;
  try {
    const data = await response.json();
    message = data.message || data.error || message;
    details = data.details || null;
  } catch (_) {
    // ignore
  }
  const error = new Error(message);
  error.status = response.status;
  error.details = details;
  throw error;
};

const jsonRequest = async (url, options = {}) => {
  const response = await ensureOk(await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  }));

  if (response.status === 204) return null;
  return response.json();
};

export const getTickets = async ({ role, userId, status, priority, category, assignedToMe } = {}) => {
  const search = new URLSearchParams({ requesterRole: toBackendRole(role) });
  if (userId) search.set('requesterId', userId);
  if (status && status !== 'ALL') search.set('status', status);
  if (priority && priority !== 'ALL') search.set('priority', priority);
  if (category && category !== 'ALL') search.set('category', category);
  if (assignedToMe) search.set('assignedToMe', 'true');
  return jsonRequest(`${MODULE_C_API_BASE}?${search.toString()}`);
};

export const getTicket = async (ticketId, { role, userId } = {}) => {
  const search = new URLSearchParams();
  if (role) search.set('requesterRole', toBackendRole(role));
  if (userId) search.set('requesterId', userId);
  const suffix = search.toString() ? `?${search.toString()}` : '';
  return jsonRequest(`${MODULE_C_API_BASE}/${ticketId}${suffix}`);
};
export const getTicketSummary = async () => jsonRequest(`${MODULE_C_API_BASE}/summary`);
export const createTicket = async (payload) => jsonRequest(MODULE_C_API_BASE, { method: 'POST', body: JSON.stringify(payload) });
export const checkDuplicateTickets = async (payload) => jsonRequest(`${MODULE_C_API_BASE}/duplicate-check`, { method: 'POST', body: JSON.stringify(payload) });
export const updateTicket = async (ticketId, payload) => jsonRequest(`${MODULE_C_API_BASE}/${ticketId}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteTicket = async (ticketId, payload) => jsonRequest(`${MODULE_C_API_BASE}/${ticketId}`, { method: 'DELETE', body: JSON.stringify(payload) });
export const assignTechnician = async (ticketId, payload) => jsonRequest(`${MODULE_C_API_BASE}/${ticketId}/assign`, { method: 'PATCH', body: JSON.stringify(payload) });
export const updateTicketStatus = async (ticketId, payload) => jsonRequest(`${MODULE_C_API_BASE}/${ticketId}/status`, { method: 'PATCH', body: JSON.stringify(payload) });
export const closeTicket = async (ticketId, payload) => jsonRequest(`${MODULE_C_API_BASE}/${ticketId}/close`, { method: 'PATCH', body: JSON.stringify(payload) });
export const reopenTicket = async (ticketId, payload) => jsonRequest(`${MODULE_C_API_BASE}/${ticketId}/reopen`, { method: 'PATCH', body: JSON.stringify(payload) });
export const addComment = async (ticketId, payload) => jsonRequest(`${MODULE_C_API_BASE}/${ticketId}/comments`, { method: 'POST', body: JSON.stringify(payload) });
export const updateComment = async (commentId, payload) => jsonRequest(`${MODULE_C_API_BASE}/comments/${commentId}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteComment = async (commentId, payload) => jsonRequest(`${MODULE_C_API_BASE}/comments/${commentId}`, { method: 'DELETE', body: JSON.stringify(payload) });

