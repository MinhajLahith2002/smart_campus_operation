import { BACKEND_BASE_URL } from './backendConfig';

const AUTH_BASE = `${BACKEND_BASE_URL}/api/auth`;
const REQUEST_TIMEOUT_MS = 12000;

export const GOOGLE_LOGIN_URL = `${BACKEND_BASE_URL}/oauth2/authorization/google`;

const withJson = async (response) => {
  let data = null;
  try {
    const raw = await response.text();
    data = raw ? JSON.parse(raw) : null;
  } catch (_) {
    data = null;
  }

  if (response.ok) {
    return data;
  }

  const error = new Error(data?.message || 'Request failed.');
  error.status = response.status;
  error.details = data?.details || null;
  error.errors = data?.errors || null;
  throw error;
};

const request = async (path, options = {}) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${AUTH_BASE}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
      signal: options.signal || controller.signal,
    });

    return await withJson(response);
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('The server took too long to respond. Please try again.');
      timeoutError.code = 'REQUEST_TIMEOUT';
      throw timeoutError;
    }

    if (error instanceof TypeError) {
      const networkError = new Error('Unable to reach the server. Check that the backend is running and try again.');
      networkError.code = 'NETWORK_ERROR';
      throw networkError;
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const getAuthConfig = async () => request('/config');
export const getCurrentUser = async () => request('/me');
export const loginWithEmail = async (payload) => request('/login', { method: 'POST', body: JSON.stringify(payload) });
export const logoutSession = async () => request('/logout', { method: 'POST' });
export const registerStudent = async (payload) => request('/register', { method: 'POST', body: JSON.stringify(payload) });
export const getGoogleOnboarding = async () => request('/google/onboarding');
export const completeGoogleOnboarding = async (payload) => request('/google/onboarding', { method: 'POST', body: JSON.stringify(payload) });
export const requestPasswordReset = async (payload) => request('/forgot-password', { method: 'POST', body: JSON.stringify(payload) });
export const resetPassword = async (payload) => request('/reset-password', { method: 'POST', body: JSON.stringify(payload) });
export const verifyEmailToken = async (token) => request(`/verify-email?token=${encodeURIComponent(token)}`);
export const getInviteDetails = async (token) => request(`/invitations/${encodeURIComponent(token)}`);
export const acceptInvite = async (payload) => request('/invitations/accept', { method: 'POST', body: JSON.stringify(payload) });

export const getAdminUsers = async ({ query = '', role = '', status = '', provider = '' } = {}) => {
  const search = new URLSearchParams();
  if (query) search.set('query', query);
  if (role) search.set('role', role);
  if (status) search.set('status', status);
  if (provider) search.set('provider', provider);
  const suffix = search.toString() ? `?${search.toString()}` : '';
  return request(`/admin/users${suffix}`);
};

export const updateAdminUserStatus = async (userId, status) => request(`/admin/users/${userId}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ status }),
});

export const getAdminInvites = async () => request('/admin/invites');
export const createUserInvite = async (payload) => request('/admin/invites', { method: 'POST', body: JSON.stringify(payload) });
export const resendUserInvite = async (inviteId) => request(`/admin/invites/${inviteId}/resend`, { method: 'POST' });
export const revokeUserInvite = async (inviteId) => request(`/admin/invites/${inviteId}/revoke`, { method: 'POST' });

export const getTechnicianInvites = getAdminInvites;
export const createTechnicianInvite = async (payload) => createUserInvite({ ...payload, role: 'TECHNICIAN' });
export const resendTechnicianInvite = resendUserInvite;
export const revokeTechnicianInvite = revokeUserInvite;

export { BACKEND_BASE_URL as API_BASE };
