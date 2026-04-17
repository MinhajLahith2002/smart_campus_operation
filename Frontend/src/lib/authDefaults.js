export const readDemoEnv = (key, fallback = '') => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim().length ? value.trim() : fallback;
};

export const DEMO_ROLE_CREDENTIALS = {
  USER: {
    role: 'USER',
    title: 'Student / Staff',
    id: readDemoEnv('VITE_DEMO_USER_ID', 'student-01'),
    name: readDemoEnv('VITE_DEMO_USER_NAME', 'Sample Student'),
    email: readDemoEnv('VITE_DEMO_USER_EMAIL'),
    campusId: readDemoEnv('VITE_DEMO_USER_CAMPUS_ID', 'IT20240001'),
    password: readDemoEnv('VITE_DEMO_USER_PASSWORD'),
    phone: readDemoEnv('VITE_DEMO_USER_PHONE'),
  },
  ADMIN: {
    role: 'ADMIN',
    title: 'Operations Admin',
    id: readDemoEnv('VITE_DEMO_ADMIN_ID', 'admin-1'),
    name: readDemoEnv('VITE_DEMO_ADMIN_NAME', 'Campus Operations Admin'),
    email: readDemoEnv('VITE_DEMO_ADMIN_EMAIL'),
    campusId: readDemoEnv('VITE_DEMO_ADMIN_CAMPUS_ID', 'AD2026001'),
    password: readDemoEnv('VITE_DEMO_ADMIN_PASSWORD'),
    phone: readDemoEnv('VITE_DEMO_ADMIN_PHONE'),
  },
  TECHNICIAN: {
    role: 'TECHNICIAN',
    title: 'Technician',
    id: readDemoEnv('VITE_DEMO_TECHNICIAN_ID', 'tech-17'),
    name: readDemoEnv('VITE_DEMO_TECHNICIAN_NAME', 'Sample Technician'),
    email: readDemoEnv('VITE_DEMO_TECHNICIAN_EMAIL'),
    campusId: readDemoEnv('VITE_DEMO_TECHNICIAN_CAMPUS_ID', 'TE2026001'),
    password: readDemoEnv('VITE_DEMO_TECHNICIAN_PASSWORD'),
    phone: readDemoEnv('VITE_DEMO_TECHNICIAN_PHONE'),
  },
};

export const getRoleCredentials = (role) => DEMO_ROLE_CREDENTIALS[role] || DEMO_ROLE_CREDENTIALS.USER;
