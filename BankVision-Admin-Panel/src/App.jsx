import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Managers from './pages/Managers';
import Recordings from './pages/Recordings';
import AgentMonitor from './pages/AgentMonitor';
import Reports from './pages/Reports';
import CallHistory from './pages/CallHistory';
import Supervisor from './pages/Supervisor';
import ServiceAuditLog from './pages/ServiceAuditLog';
import Feedback from './pages/Feedback';
import ManagerActivityReport from './pages/ManagerActivityReport';
import Settings from './pages/Settings';
import useSessionTimeout from './hooks/useSessionTimeout';
import SessionTimeoutDialog from './components/SessionTimeoutDialog';

const ProtectedRoute = () => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return null; // Wait for auth initialization
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <Outlet />;
};

// Mounted inside AuthProvider so useSessionTimeout can read/trigger logout via useAuth().
const AppContent = () => {
    const { showWarning, remainingTime, extendSession, handleLogout } = useSessionTimeout();

    return (
        <>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<MainLayout />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/supervisor" element={<Supervisor />} />
                            <Route path="/agent-monitor" element={<AgentMonitor />} />
                            <Route path="/managers" element={<Managers />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/call-history" element={<CallHistory />} />
                            <Route path="/recordings" element={<Recordings />} />
                            <Route path="/service-audit" element={<ServiceAuditLog />} />
                            <Route path="/feedback" element={<Feedback />} />
                            <Route path="/activity-report" element={<ManagerActivityReport />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        </Route>
                    </Route>
                </Routes>
            </Router>

            <SessionTimeoutDialog
                open={showWarning}
                remainingTime={remainingTime}
                onExtend={extendSession}
                onLogout={handleLogout}
            />
        </>
    );
};

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
                <SocketProvider>
                    <AppContent />
                </SocketProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
