import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Mail, ArrowRight, CheckCircle, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function OtpLogin() {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (otpError) throw otpError;
      setEmailSent(true);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });
      if (verifyError) throw verifyError;
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
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
          <h1 className="text-2xl font-bold tracking-tight text-white">Login with OTP</h1>
          <p className="text-slate-400 mt-2 text-sm text-center">
            {step === 'email'
              ? 'Enter your email to receive a one-time password.'
              : `OTP sent to ${email}. Enter it below.`}
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                id="otp-email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                required
              />
            </div>

            <button
              id="otp-send"
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Send OTP
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            {/* Email sent indicator */}
            <div className="flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <CheckCircle size={18} className="text-green-400 shrink-0" />
              <p className="text-green-400 text-sm">OTP sent! Check your inbox.</p>
            </div>

            {/* OTP input boxes */}
            <div>
              <label className="block text-slate-400 text-sm mb-2">Enter 6-digit OTP</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  id="otp-code"
                  type="text"
                  placeholder="Enter OTP code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all tracking-[0.5em] font-mono text-lg text-center"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            <button
              id="otp-verify"
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-primary hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Verify & Sign In
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); setOtp(''); }}
              className="w-full text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              ← Use a different email
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-slate-400 text-sm">
          Prefer a password?{' '}
          <Link to="/login" className="text-primary hover:text-indigo-400 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
