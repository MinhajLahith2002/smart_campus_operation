import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

const AppShell = lazy(() => import('./components/AppShell').then((module) => ({ default: module.AppShell })));
const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Catalogue = lazy(() => import('./pages/Catalogue').then((module) => ({ default: module.Catalogue })));
const BookingRequest = lazy(() => import('./pages/BookingRequest').then((module) => ({ default: module.BookingRequest })));
const MyBookings = lazy(() => import('./pages/MyBookings').then((module) => ({ default: module.MyBookings })));
const MyTickets = lazy(() => import('./pages/MyTickets').then((module) => ({ default: module.MyTickets })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const AdminBookingsPage = lazy(() => import('./pages/AdminBookingsPage').then((module) => ({ default: module.AdminBookingsPage })));
const AdminTicketsPage = lazy(() => import('./pages/AdminTicketsPage').then((module) => ({ default: module.AdminTicketsPage })));
const AdminResourcesPage = lazy(() => import('./pages/AdminResourcesPage').then((module) => ({ default: module.AdminResourcesPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const ReportIssuePage = lazy(() => import('./pages/ReportIssuePage').then((module) => ({ default: module.ReportIssuePage })));
const ResourceDetailPage = lazy(() => import('./pages/ResourceDetailPage').then((module) => ({ default: module.ResourceDetailPage })));
const TicketDetailPage = lazy(() => import('./pages/TicketDetailPage').then((module) => ({ default: module.TicketDetailPage })));
const TechnicianTicketsPage = lazy(() => import('./pages/TechnicianTicketsPage').then((module) => ({ default: module.TechnicianTicketsPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));
const InviteSetupPage = lazy(() => import('./pages/InviteSetupPage').then((module) => ({ default: module.InviteSetupPage })));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage })));
const OAuthSuccessPage = lazy(() => import('./pages/OAuthSuccessPage').then((module) => ({ default: module.OAuthSuccessPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })));

const RouteLoadingScreen = ({ message = 'Loading workspace...' }) => (
  <div className="px-4 py-16 text-center text-sm text-muted-foreground">{message}</div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <RouteLoadingScreen message="Loading secure workspace..." />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <AppShell>{children}</AppShell>;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <RouteLoadingScreen message="Loading session..." />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

const RoleRoute = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const TicketsEntryRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin/tickets" replace />;
  if (user.role === 'TECHNICIAN') return <Navigate to="/tickets/assigned" replace />;
  return <Navigate to="/tickets/my" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<RouteLoadingScreen />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<PublicOnlyRoute><AuthPage /></PublicOnlyRoute>} />
              <Route path="/auth/oauth-success" element={<OAuthSuccessPage />} />
              <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
              <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
              <Route path="/reset-password" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />
              <Route path="/verify-email" element={<PublicOnlyRoute><VerifyEmailPage /></PublicOnlyRoute>} />
              <Route path="/invite/setup" element={<PublicOnlyRoute><InviteSetupPage /></PublicOnlyRoute>} />

              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/catalogue" element={<ProtectedRoute><Catalogue /></ProtectedRoute>} />
              <Route path="/catalogue/:resourceId" element={<ProtectedRoute><ResourceDetailPage /></ProtectedRoute>} />
              <Route path="/bookings/my" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
              <Route path="/bookings/new" element={<ProtectedRoute><BookingRequest /></ProtectedRoute>} />

              <Route path="/tickets" element={<ProtectedRoute><TicketsEntryRedirect /></ProtectedRoute>} />
              <Route path="/tickets/my" element={<ProtectedRoute><RoleRoute roles={['USER']}><MyTickets /></RoleRoute></ProtectedRoute>} />
              <Route path="/tickets/new" element={<ProtectedRoute><RoleRoute roles={['USER', 'ADMIN', 'TECHNICIAN']}><ReportIssuePage /></RoleRoute></ProtectedRoute>} />
              <Route path="/tickets/assigned" element={<ProtectedRoute><RoleRoute roles={['TECHNICIAN']}><TechnicianTicketsPage /></RoleRoute></ProtectedRoute>} />
              <Route path="/tickets/:ticketId" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />

              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/admin/bookings" element={<ProtectedRoute><RoleRoute roles={['ADMIN']}><AdminBookingsPage /></RoleRoute></ProtectedRoute>} />
              <Route path="/admin/resources" element={<ProtectedRoute><RoleRoute roles={['ADMIN']}><AdminResourcesPage /></RoleRoute></ProtectedRoute>} />
              <Route path="/admin/tickets" element={<ProtectedRoute><RoleRoute roles={['ADMIN']}><AdminTicketsPage /></RoleRoute></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><RoleRoute roles={['ADMIN']}><AdminUsersPage /></RoleRoute></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
