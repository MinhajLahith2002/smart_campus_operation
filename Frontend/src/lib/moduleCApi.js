export const MODULE_C_API_BASE = import.meta.env.VITE_MODULE_C_API_URL || 'http://127.0.0.1:8081/api/module-c/tickets';

const roleMap = {
  USER: 'STUDENT',
  ADMIN: 'ADMIN',
  TECHNICIAN: 'TECHNICIAN',
  STAFF: 'STAFF',
};

export const toBackendRole = (role) => roleMap[role] || 'STUDENT';

const ensureOk = async (response) => {
  if (response.ok) {
    return response;
  }

  let message = 'Request failed.';
  try {
    const data = await response.json();
    message = data.message || data.error || message;
  } catch (_) {
    // Ignore JSON parsing errors and use fallback message.
  }

  throw new Error(message);
};

export const getTickets = async ({ role, userId, status, priority, category, assignedToMe } = {}) => {
  const search = new URLSearchParams({ requesterRole: toBackendRole(role) });

  if (userId) search.set('requesterId', userId);
  if (status && status !== 'ALL') search.set('status', status);
  if (priority) search.set('priority', priority);
  if (category) search.set('category', category);
  if (assignedToMe) search.set('assignedToMe', 'true');

  const response = await ensureOk(await fetch(`${MODULE_C_API_BASE}?${search.toString()}`));
  return response.json();
};

export const getTicket = async (ticketId) => {
  const response = await ensureOk(await fetch(`${MODULE_C_API_BASE}/${ticketId}`));
  return response.json();
};

export const getTicketSummary = async () => {
  const response = await ensureOk(await fetch(`${MODULE_C_API_BASE}/summary`));
  return response.json();
};

export const createTicket = async (payload) => {
  const response = await ensureOk(await fetch(MODULE_C_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }));

  return response.json();
};

export const assignTechnician = async (ticketId, payload) => {
  const response = await ensureOk(await fetch(`${MODULE_C_API_BASE}/${ticketId}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }));

  return response.json();
};

export const updateTicketStatus = async (ticketId, payload) => {
  const response = await ensureOk(await fetch(`${MODULE_C_API_BASE}/${ticketId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }));

  return response.json();
};
