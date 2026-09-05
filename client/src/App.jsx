import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage      from './pages/LandingPage';
import LoginPage        from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardPage    from './pages/admin/DashboardPage';
import LeadsPage        from './pages/admin/LeadsPage';
import CallsPage        from './pages/admin/CallsPage';
import CampaignsPage    from './pages/admin/CampaignsPage';
import CampaignDetailPage from './pages/admin/CampaignDetailPage';
import QuestionnairesPage from './pages/admin/QuestionnairesPage';
import SchedulePage     from './pages/admin/SchedulePage';
import AuditLogsPage    from './pages/admin/AuditLogsPage';
import IntegrationsPage from './pages/admin/IntegrationsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#2B2321',
              border: '1px solid #EDE0D4',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              boxShadow: '0 4px 12px rgba(43,35,33,0.07)',
            },
            success: { iconTheme: { primary: '#5B8A72', secondary: '#FFFFFF' } },
            error:   { iconTheme: { primary: '#C4544A', secondary: '#FFFFFF' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/"                      element={<LandingPage />} />
          <Route path="/admin/login"           element={<LoginPage />} />
          <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected admin routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/admin/leads"     element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
          <Route path="/admin/calls"     element={<ProtectedRoute><CallsPage /></ProtectedRoute>} />
          <Route path="/admin/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
          <Route path="/admin/campaigns/:id" element={<ProtectedRoute><CampaignDetailPage /></ProtectedRoute>} />
          <Route path="/admin/questionnaires" element={<ProtectedRoute><QuestionnairesPage /></ProtectedRoute>} />
          <Route path="/admin/schedule"  element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute roles={['admin']}><AuditLogsPage /></ProtectedRoute>} />
          <Route path="/admin/settings/integrations" element={<ProtectedRoute roles={['admin']}><IntegrationsPage /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
