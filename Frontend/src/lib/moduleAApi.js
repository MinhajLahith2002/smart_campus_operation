import { toBackendRole } from './moduleCApi';

const API_BASE = import.meta.env.VITE_BACKEND_BASE_URL || 'http://127.0.0.1:8081';
export const MODULE_A_API_BASE = import.meta.env.VITE_MODULE_A_API_URL || `${API_BASE}/api/module-a/resources`;
export const RESOURCE_TYPES = ['LAB', 'HALL', 'MEETING_ROOM', 'EQUIPMENT'];
export const RESOURCE_STATUSES = ['ACTIVE', 'OUT_OF_SERVICE'];
export const RESOURCE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const RESOURCE_TYPE_LABELS = {
  LAB: 'Lab',
  HALL: 'Hall',
  MEETING_ROOM: 'Meeting Room',
  EQUIPMENT: 'Equipment',
};

const RESOURCE_STATUS_LABELS = {
  ACTIVE: 'Active',
  OUT_OF_SERVICE: 'Out of Service',
};

const ensureOk = async (response) => {
  if (response.ok) return response;

  let message = 'Request failed.';
  let details = null;
  try {
    const data = await response.json();
    message = data.message || data.error || message;
    details = data.details || data.errors || null;
  } catch (_) {
    // ignore JSON parsing errors for non-JSON responses
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

const normalizeResource = (resource) => ({
  ...resource,
  id: String(resource.id),
  description: resource.description || '',
  imageUrl: resource.imageUrl || '',
  isAvailable: resource.status === 'ACTIVE' && resource.isAvailable !== false,
  availabilityWindow: {
    daysOfWeek: resource.availabilityWindow?.daysOfWeek || [],
    openTime: resource.availabilityWindow?.openTime || '--:--',
    closeTime: resource.availabilityWindow?.closeTime || '--:--',
    notes: resource.availabilityWindow?.notes || '',
  },
});

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
      search.set(key, value);
    }
  });
  return search.toString();
};

const actorHeaders = (role) => role ? { 'X-Actor-Role': toBackendRole(role) } : {};

export const getResources = async (params = {}) => {
  const query = buildQuery(params);
  const data = await jsonRequest(`${MODULE_A_API_BASE}${query ? `?${query}` : ''}`);
  return Array.isArray(data) ? data.map(normalizeResource) : [];
};

export const getResource = async (resourceId) => normalizeResource(await jsonRequest(`${MODULE_A_API_BASE}/${resourceId}`));

export const createResource = async (payload, actorRole) => normalizeResource(await jsonRequest(MODULE_A_API_BASE, {
  method: 'POST',
  headers: actorHeaders(actorRole),
  body: JSON.stringify(payload),
}));

export const updateResource = async (resourceId, payload, actorRole) => normalizeResource(await jsonRequest(`${MODULE_A_API_BASE}/${resourceId}`, {
  method: 'PUT',
  headers: actorHeaders(actorRole),
  body: JSON.stringify(payload),
}));

export const updateResourceStatus = async (resourceId, status, actorRole) => normalizeResource(await jsonRequest(`${MODULE_A_API_BASE}/${resourceId}/status`, {
  method: 'PATCH',
  headers: actorHeaders(actorRole),
  body: JSON.stringify({ status }),
}));

export const deleteResource = async (resourceId, actorRole) => jsonRequest(`${MODULE_A_API_BASE}/${resourceId}`, {
  method: 'DELETE',
  headers: actorHeaders(actorRole),
});

export const formatResourceType = (type) => `${type || ''}`
  ? RESOURCE_TYPE_LABELS[type] || `${type || ''}`
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ')
  : 'Unknown';

export const formatResourceStatus = (status) => RESOURCE_STATUS_LABELS[status] || 'Unknown';

export const formatAvailabilityWindow = (availabilityWindow = {}) => {
  const days = Array.isArray(availabilityWindow.daysOfWeek) ? availabilityWindow.daysOfWeek : [];
  if (!days.length) {
    return 'Schedule not set';
  }
  const dayLabel = days.length === RESOURCE_DAYS.length ? 'Daily' : days.join(', ');
  return `${dayLabel} - ${availabilityWindow.openTime || '--:--'} to ${availabilityWindow.closeTime || '--:--'}`;
};
