const stripWrappingQuotes = (value) => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

export const normalizeBaseUrl = (value) => stripWrappingQuotes(value).replace(/\/+$/, '');

const getDefaultBackendBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:8082`;
    }
  }

  return 'http://localhost:8082';
};

export const BACKEND_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_BACKEND_BASE_URL) || getDefaultBackendBaseUrl();
