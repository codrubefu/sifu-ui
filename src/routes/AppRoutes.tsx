import { Navigate, Route, Routes } from 'react-router-dom';
import App from '../App';
import AboutPage from '../pages/AboutPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import NotFoundPage from '../pages/NotFoundPage';
import SetPasswordPage from '../pages/SetPasswordPage';
import Unauthorized from '../pages/Unauthorized';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/erp/dashboard" replace />} />
      <Route path="/login" element={<App />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/erp/*" element={<App />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}


