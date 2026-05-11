import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Scale, Lock, ArrowRight, CheckCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PasswordStrength from '../components/PasswordStrength';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const navigate = useNavigate();
  
  // We use the global auth context to ensure the session from the reset link was successfully captured
  const { user, loading } = useAuth();

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password does not meet the strong password requirements.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (!user) {
      setError('Auth session missing. The reset link may have expired.');
      return;
    }

    setLoadingUpdate(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Could not update password. Please try again.');
    } finally {
      setLoadingUpdate(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <span className="inline-block w-8 h-8 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // If the component loaded but there is no user session, the token is missing or expired.
  if (!user && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
        <div className="w-full max-w-md p-8 glass-panel rounded-3xl animate-slide-up relative z-10 text-center">
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-red-500/20 rounded-2xl text-red-400 mb-4">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Invalid or Expired Link</h1>
            <p className="text-slate-400 text-sm">
              We couldn't detect a valid session. Your password reset link may have expired or was already used.
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="w-full bg-primary hover:bg-indigo-500 text-white rounded-xl py-3 px-4 font-medium transition-colors inline-block"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
      <div className="w-full max-w-md p-8 glass-panel rounded-3xl animate-slide-up relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-primary/20 rounded-2xl text-primary mb-4">
            <Scale size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reset Password</h1>
          <p className="text-slate-400 mt-2 text-sm text-center">Choose a strong new password.</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 bg-green-500/20 rounded-full text-green-400">
              <CheckCircle size={36} />
            </div>
            <p className="text-slate-300 text-sm">
              Your password has been updated! Redirecting to Sign In...
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleReset} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* Real-time Password Strength Indicator */}
              <PasswordStrength password={password} setPasswordValid={setIsPasswordValid} />

              <div className="relative pt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 mt-1" size={20} />
                <input
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  required
                />
              </div>

              <button
                id="reset-submit"
                type="submit"
                disabled={loadingUpdate || !isPasswordValid || !password || !confirm}
                className="w-full bg-primary hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 group mt-4"
              >
                {loadingUpdate ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Update Password
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
