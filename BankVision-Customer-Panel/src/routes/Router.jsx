import { Routes, Route } from "react-router-dom";
import Home from '../pages/Home/Home';
import AppLayout from './../components/layout/AppLayout';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={
        <AppLayout>
          <Home />
        </AppLayout>
      } />
    </Routes>
  );
};

export default AppRouter;