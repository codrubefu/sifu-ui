import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './i18n';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { loadRuntimeConfig } from './config/runtimeConfig';

loadRuntimeConfig().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  );
});
