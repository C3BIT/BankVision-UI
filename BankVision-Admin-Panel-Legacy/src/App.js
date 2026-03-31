import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { store } from './redux/store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Managers from './pages/Managers';
import AgentMonitor from './pages/AgentMonitor';
import CallHistory from './pages/CallHistory';
import SupervisorDashboard from './pages/SupervisorDashboard';
import Reports from './pages/Reports';
import Recordings from './pages/Recordings';
import ServiceAuditLog from './pages/ServiceAuditLog';
import Layout from './components/Layout';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e',
      light: '#534bae',
      dark: '#000051',
    },
    secondary: {
      main: '#0d47a1',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="managers" element={<Managers />} />
              <Route path="agent-monitor" element={<AgentMonitor />} />
              <Route path="call-history" element={<CallHistory />} />
              <Route path="supervisor" element={<SupervisorDashboard />} />
              <Route path="reports" element={<Reports />} />
              <Route path="recordings" element={<Recordings />} />
              <Route path="service-audit" element={<ServiceAuditLog />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} />
      </ThemeProvider>
    </Provider>
  );
}

export default App;
