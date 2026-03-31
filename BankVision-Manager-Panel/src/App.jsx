import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AuthRoute from "./routes/AuthRoute";
import ProtectedRoute from "./routes/ProtectedRoute";
import Dashboard from "./pages/dashboard/Dashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import AppLayout from "./components/layout/AppLayout";
import useSessionTimeout from "./hooks/useSessionTimeout";
import SessionTimeoutDialog from "./components/SessionTimeoutDialog/SessionTimeoutDialog";

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { showWarning, remainingTime, extendSession, handleLogout } = useSessionTimeout();

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route element={<AuthRoute isAuthenticated={isAuthenticated} />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>
        <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
          <Route
            path="/dashboard"
            element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>

      <SessionTimeoutDialog
        open={showWarning}
        remainingTime={remainingTime}
        onExtend={extendSession}
        onLogout={handleLogout}
      />
    </>
  );
}

export default App;
