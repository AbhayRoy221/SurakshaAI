import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AlertsListPage from './pages/AlertsListPage';
import AlertDetailPage from './pages/AlertDetailPage';
import CollusionGraphPage from './pages/CollusionGraphPage';
import ChatAssistantPage from './pages/ChatAssistantPage';
import BehavioralAnalyticsPage from './pages/BehavioralAnalyticsPage';
import CompliancePage from './pages/CompliancePage';
import PipelineMonitorPage from './pages/PipelineMonitorPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-navy-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-mint border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/alerts" element={<AlertsListPage />} />
        <Route path="/alerts/:id" element={<AlertDetailPage />} />
        <Route path="/collusion" element={<CollusionGraphPage />} />
        <Route path="/assistant" element={<ChatAssistantPage />} />
        <Route path="/behavioral" element={<BehavioralAnalyticsPage />} />
        <Route path="/compliance" element={<ProtectedRoute roles={['compliance', 'ciso']}><CompliancePage /></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute roles={['ciso']}><PipelineMonitorPage /></ProtectedRoute>} />
        <Route path="/settings" element={<div className="animate-fade-in space-y-6"><h1 className="text-2xl font-bold text-white">System Settings</h1><p className="text-sm text-gray-400">Configuration and preferences</p><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-navy-800 rounded-xl border border-navy-700 p-6"><h3 className="text-sm font-semibold text-white mb-4">Alert Thresholds</h3><div className="space-y-3"><div className="flex items-center justify-between"><span className="text-xs text-gray-400">Critical Risk Threshold</span><span className="text-xs text-mint font-mono">80</span></div><div className="flex items-center justify-between"><span className="text-xs text-gray-400">High Risk Threshold</span><span className="text-xs text-warning font-mono">60</span></div><div className="flex items-center justify-between"><span className="text-xs text-gray-400">Auto-Escalation</span><span className="text-xs text-success font-mono">Enabled</span></div></div></div><div className="bg-navy-800 rounded-xl border border-navy-700 p-6"><h3 className="text-sm font-semibold text-white mb-4">API Configuration</h3><div className="space-y-3"><div className="flex items-center justify-between"><span className="text-xs text-gray-400">Gemini API</span><span className="text-xs text-success font-mono">Connected</span></div><div className="flex items-center justify-between"><span className="text-xs text-gray-400">Socket.IO</span><span className="text-xs text-success font-mono">Active</span></div><div className="flex items-center justify-between"><span className="text-xs text-gray-400">Database</span><span className="text-xs text-success font-mono">SQLite (Local)</span></div></div></div></div></div>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
