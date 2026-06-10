import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isAuthenticated } from './utils/auth';

import Login          from './pages/Login';
import Register       from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Home         from './pages/Home';
import Dashboard    from './pages/Dashboard';
import SearchPapers from './pages/SearchPapers';
import Workspace    from './pages/Workspace';
import AIChat       from './pages/AIChat';
import AITools      from './pages/AITools';
import UploadPDF    from './pages/UploadPDF';
import DocSpace     from './pages/DocSpace';
import Profile      from './pages/Profile';
import ChatBot      from './components/ChatBot';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<Home />} />
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected */}
          <Route path="/dashboard"       element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/search"          element={<ProtectedRoute><SearchPapers /></ProtectedRoute>} />
          <Route path="/workspace/:id"   element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
          <Route path="/chat"            element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
          <Route path="/tools"           element={<ProtectedRoute><AITools /></ProtectedRoute>} />
          <Route path="/upload"          element={<ProtectedRoute><UploadPDF /></ProtectedRoute>} />
          <Route path="/docs"            element={<ProtectedRoute><DocSpace /></ProtectedRoute>} />
          <Route path="/profile"         element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ChatBot />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
