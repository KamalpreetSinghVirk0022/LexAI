import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ChatApp from './pages/ChatApp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import OtpLogin from './pages/OtpLogin';

// Protected route: redirects to /login if user is not authenticated
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <span className="inline-block w-8 h-8 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

// Public route: redirects to / if user IS already authenticated
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <span className="inline-block w-8 h-8 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  return !user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/otp-login" element={<PublicRoute><OtpLogin /></PublicRoute>} />

      {/* Reset password: must stay accessible even after Supabase redirects back */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected route */}
      <Route path="/" element={<ProtectedRoute><ChatApp /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
