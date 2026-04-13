export const DEMO_ROLE_CREDENTIALS = {
  USER: {
    role: 'USER',
    title: 'Student / Staff',
    id: 'student-01',
    name: 'Amaya Perera',
    email: 'student@campus.edu',
    campusId: 'ST2026001',
    password: 'Student@123',
  },
  ADMIN: {
    role: 'ADMIN',
    title: 'Operations Admin',
    id: 'admin-1',
    name: 'Operations Admin',
    email: 'admin@campus.edu',
    campusId: 'AD2026001',
    password: 'Admin@123',
  },
  TECHNICIAN: {
    role: 'TECHNICIAN',
    title: 'Technician',
    id: 'tech-17',
    name: 'Kasun Silva',
    email: 'tech@campus.edu',
    campusId: 'TE2026001',
    password: 'Tech@123',
  },
};

export const getRoleCredentials = (role) => DEMO_ROLE_CREDENTIALS[role] || DEMO_ROLE_CREDENTIALS.USER;
