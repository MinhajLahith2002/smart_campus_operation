const API_BASE = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8082';
const AUTH_BASE = `${API_BASE}/api/auth`;

export const GOOGLE_LOGIN_URL = `${API_BASE}/oauth2/authorization/google`;

const withJson = async (response) => {
  let data = null;
  try {
    data = await response.json();
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
  try {
    const response = await fetch(`${AUTH_BASE}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
    return await withJson(response);
  } catch (error) {
    if (typeof error?.status === 'number') {
      throw error;
    }
    const networkError = new Error('Cannot reach the backend server. Make sure the backend is running and the API URL is correct.');
    networkError.status = 0;
    networkError.cause = error;
    throw networkError;
  }
};

const unwrapList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.value)) {
    return payload.value;
  }
  return [];
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
  return unwrapList(await request(`/admin/users${suffix}`));
};

export const updateAdminUserStatus = async (userId, status) => request(`/admin/users/${userId}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ status }),
});

export const getTechnicianInvites = async () => unwrapList(await request('/admin/invites'));
export const createTechnicianInvite = async (payload) => request('/admin/invites', { method: 'POST', body: JSON.stringify(payload) });
export const resendTechnicianInvite = async (inviteId) => request(`/admin/invites/${inviteId}/resend`, { method: 'POST' });
export const revokeTechnicianInvite = async (inviteId) => request(`/admin/invites/${inviteId}/revoke`, { method: 'POST' });

export { API_BASE };

