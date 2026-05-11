import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, Mail, ArrowRight, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSuccess(true);
    } catch (err) {
      if (err.message.toLowerCase().includes('recovery mail')) {
        setError('Failed to send email. Ensure this account exists and your email is already verified. Unverified accounts cannot reset passwords.');
      } else {
        setError(err.message || 'Could not send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
      <div className="w-full max-w-md p-8 glass-panel rounded-3xl animate-slide-up relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-primary/20 rounded-2xl text-primary mb-4">
            <Scale size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Forgot Password</h1>
          <p className="text-slate-400 mt-2 text-sm text-center">
            Enter your email and we'll send you a password reset link.
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 bg-green-500/20 rounded-full text-green-400">
              <CheckCircle size={36} />
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              A password reset link has been sent to{' '}
              <span className="text-indigo-400 font-medium">{email}</span>.
              Please check your inbox and follow the instructions.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-flex items-center gap-2 text-primary hover:text-indigo-400 font-medium transition-colors text-sm"
            >
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleReset} className="space-y-6">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  required
                />
              </div>

              <button
                id="forgot-submit"
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-slate-400 text-sm">
              Remembered it?{' '}
              <Link to="/login" className="text-primary hover:text-indigo-400 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
