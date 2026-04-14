import { toBackendRole } from './moduleCApi';

const API_BASE = import.meta.env.VITE_OPERATIONS_API_URL || 'http://127.0.0.1:8081/api';

const ensureOk = async (response) => {
  if (response.ok) return response;

  let message = 'Request failed.';
  try {
    const data = await response.json();
    message = data.message || data.error || message;
  } catch (_) {
    // ignore
  }
  throw new Error(message);
};

const jsonRequest = async (url, options = {}) => {
  const response = await ensureOk(await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  }));

  if (response.status === 204) return null;
  return response.json();
};

export const getDemoUsers = async () => jsonRequest(`${API_BASE}/auth/demo-users`);
export const demoLogin = async (payload) => jsonRequest(`${API_BASE}/auth/demo-login`, { method: 'POST', body: JSON.stringify(payload) });

export const getResources = async (type = 'ALL') => {
  const search = new URLSearchParams();
  if (type && type !== 'ALL') search.set('type', type);
  return jsonRequest(`${API_BASE}/resources${search.toString() ? `?${search.toString()}` : ''}`);
};

export const getResourceSummary = async () => jsonRequest(`${API_BASE}/resources/summary`);
export const getResource = async (resourceId) => jsonRequest(`${API_BASE}/resources/${resourceId}`);

export const getBookings = async ({ role, userId, status } = {}) => {
  const search = new URLSearchParams({ requesterRole: toBackendRole(role) });
  if (userId) search.set('requesterId', userId);
  if (status && status !== 'ALL') search.set('status', status);
  return jsonRequest(`${API_BASE}/bookings?${search.toString()}`);
};

export const getBookingSummary = async () => jsonRequest(`${API_BASE}/bookings/summary`);
export const createBooking = async (payload) => jsonRequest(`${API_BASE}/bookings`, { method: 'POST', body: JSON.stringify(payload) });
export const approveBooking = async (bookingId, payload) => jsonRequest(`${API_BASE}/bookings/${bookingId}/approve`, { method: 'PATCH', body: JSON.stringify(payload) });
export const rejectBooking = async (bookingId, payload) => jsonRequest(`${API_BASE}/bookings/${bookingId}/reject`, { method: 'PATCH', body: JSON.stringify(payload) });
export const cancelBooking = async (bookingId, payload) => jsonRequest(`${API_BASE}/bookings/${bookingId}/cancel`, { method: 'PATCH', body: JSON.stringify(payload) });

export const getNotifications = async ({ role, userId } = {}) => {
  const search = new URLSearchParams({ role: role || 'USER' });
  if (userId) search.set('userId', userId);
  return jsonRequest(`${API_BASE}/notifications?${search.toString()}`);
};

export const getNotificationSummary = async ({ role, userId } = {}) => {
  const search = new URLSearchParams({ role: role || 'USER' });
  if (userId) search.set('userId', userId);
  return jsonRequest(`${API_BASE}/notifications/summary?${search.toString()}`);
};

export const markNotificationRead = async (notificationId) => jsonRequest(`${API_BASE}/notifications/${notificationId}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = async ({ role, userId } = {}) => {
  const search = new URLSearchParams({ role: role || 'USER' });
  if (userId) search.set('userId', userId);
  return jsonRequest(`${API_BASE}/notifications/read-all?${search.toString()}`, { method: 'PATCH' });
};
