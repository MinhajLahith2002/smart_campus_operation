export const FACULTY_OPTIONS = [
  { value: 'IT', label: 'Information Technology' },
  { value: 'CS', label: 'Computer Science' },
  { value: 'BM', label: 'Business Management' },
  { value: 'HM', label: 'Hospitality Management' },
];

export const CAMPUS_OPTIONS = [
  { value: 'malabe', label: 'Malabe' },
  { value: 'metro', label: 'Metro' },
  { value: 'kandy', label: 'Kandy' },
  { value: 'matara', label: 'Matara' },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const studentIdPattern = /^(IT|CS|BM|HM)\d{8}$/;
const phonePattern = /^\+94 7\d{8}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const validateLogin = (form) => {
  const errors = {};
  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!emailPattern.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.password) {
    errors.password = 'Password is required.';
  }

  return errors;
};

export const validateForgotPassword = (form) => {
  const errors = {};
  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!emailPattern.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  return errors;
};

export const validatePasswordReset = (form) => {
  const errors = {};
  if (!form.password) {
    errors.password = 'Password is required.';
  } else if (!passwordPattern.test(form.password)) {
    errors.password = 'Password must include uppercase, lowercase, number, and symbol.';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
};

export const getPasswordChecklist = (password) => [
  { label: 'At least 8 characters', valid: password.length >= 8 },
  { label: 'One uppercase letter', valid: /[A-Z]/.test(password) },
  { label: 'One lowercase letter', valid: /[a-z]/.test(password) },
  { label: 'One number', valid: /\d/.test(password) },
  { label: 'One symbol', valid: /[^A-Za-z0-9]/.test(password) },
];

export const validateRegistration = (form) => {
  const errors = {};
  const email = form.email.trim();
  const studentId = form.studentId.trim().toUpperCase();
  const batch = form.batch.trim();

  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }
  if (!email) {
    errors.email = 'Email is required.';
  } else if (!emailPattern.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!studentId) {
    errors.studentId = 'Student ID is required.';
  } else if (!studentIdPattern.test(studentId)) {
    errors.studentId = 'Student ID must match the required format.';
  } else if (form.faculty && studentId.slice(0, 2) !== form.faculty) {
    errors.studentId = 'Student ID prefix must match the selected faculty.';
  }
  if (!form.faculty) {
    errors.faculty = 'Select a faculty.';
  }
  if (!batch) {
    errors.batch = 'Batch is required.';
  } else if (!/^\d{4}$/.test(batch)) {
    errors.batch = 'Batch must be a 4 digit year.';
  } else if (studentId.length >= 6 && studentId.slice(2, 6) !== batch) {
    errors.batch = 'Batch must match the year encoded in the student ID.';
  }
  if (!form.campus) {
    errors.campus = 'Select a campus.';
  }
  if (!form.phone.trim()) {
    errors.phone = 'Phone is required.';
  } else if (!phonePattern.test(form.phone.trim())) {
    errors.phone = 'Phone must match +94 7XXXXXXXX.';
  }
  if (!form.password) {
    errors.password = 'Password is required.';
  } else if (!passwordPattern.test(form.password)) {
    errors.password = 'Password must include uppercase, lowercase, number, and symbol.';
  }
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  if (!form.acceptedTerms) {
    errors.acceptedTerms = 'You must accept the terms to continue.';
  }

  return errors;
};

export const validateGoogleOnboarding = (form) => {
  const errors = {};
  const email = form.email.trim();
  const studentId = form.studentId.trim().toUpperCase();
  const batch = form.batch.trim();

  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }
  if (!email) {
    errors.email = 'Email is required.';
  } else if (!emailPattern.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!studentId) {
    errors.studentId = 'Student ID is required.';
  } else if (!studentIdPattern.test(studentId)) {
    errors.studentId = 'Student ID must match the required format.';
  } else if (form.faculty && studentId.slice(0, 2) !== form.faculty) {
    errors.studentId = 'Student ID prefix must match the selected faculty.';
  }
  if (!form.faculty) {
    errors.faculty = 'Select a faculty.';
  }
  if (!batch) {
    errors.batch = 'Batch is required.';
  } else if (!/^\d{4}$/.test(batch)) {
    errors.batch = 'Batch must be a 4 digit year.';
  } else if (studentId.length >= 6 && studentId.slice(2, 6) !== batch) {
    errors.batch = 'Batch must match the year encoded in the student ID.';
  }
  if (!form.campus) {
    errors.campus = 'Select a campus.';
  }
  if (!form.phone.trim()) {
    errors.phone = 'Phone is required.';
  } else if (!phonePattern.test(form.phone.trim())) {
    errors.phone = 'Phone must match +94 7XXXXXXXX.';
  }
  if (!form.acceptedTerms) {
    errors.acceptedTerms = 'You must accept the terms to continue.';
  }

  return errors;
};
