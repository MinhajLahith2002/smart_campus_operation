import { toBackendRole } from './moduleCApi';
import { BACKEND_BASE_URL, normalizeBaseUrl } from './backendConfig';

export const MODULE_A_API_BASE = normalizeBaseUrl(import.meta.env.VITE_MODULE_A_API_URL) || `${BACKEND_BASE_URL}/api/module-a/resources`;
export const RESOURCE_TYPES = ['LAB', 'HALL', 'MEETING_ROOM', 'EQUIPMENT'];
export const RESOURCE_STATUSES = ['ACTIVE', 'OUT_OF_SERVICE'];
export const RESOURCE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ensureOk = async (response) => {
  if (response.ok) return response;

  let message = 'Request failed.';
  try {
    const data = await response.json();
    message = data.message || data.error || message;
  } catch (_) {
    // ignore JSON parsing errors for non-JSON responses
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

const normalizeResource = (resource) => ({
  ...resource,
  id: String(resource.id),
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
  .split('_')
  .filter(Boolean)
  .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
  .join(' ');

export const formatResourceStatus = (status) => status === 'OUT_OF_SERVICE' ? 'Out of Service' : 'Active';

export const formatAvailabilityWindow = (availabilityWindow = {}) => {
  const days = Array.isArray(availabilityWindow.daysOfWeek) ? availabilityWindow.daysOfWeek : [];
  const dayLabel = days.length === RESOURCE_DAYS.length ? 'Daily' : days.join(', ');
  return `${dayLabel} - ${availabilityWindow.openTime || '--:--'} to ${availabilityWindow.closeTime || '--:--'}`;
};
