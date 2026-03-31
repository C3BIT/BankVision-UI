import { Navigate, Outlet } from 'react-router-dom';

const AuthRoute = ({ isAuthenticated }) => {
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

export default AuthRoute;