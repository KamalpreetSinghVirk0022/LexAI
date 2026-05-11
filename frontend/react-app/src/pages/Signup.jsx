import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Mail, Lock, User, ArrowRight, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PasswordStrength from '../components/PasswordStrength';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isPasswordValid) {
      setError('Password does not meet the strong password requirements.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (signupError) {
        // Pass the raw error message directly to the UI so we can see EXACTLY what Supabase/Brevo is rejecting
        throw signupError;
      }

      // If no session is returned, it means email confirmation is required and the email was sent successfully.
      if (!data?.session) {
        setSuccess(true);
      } else {
        // Fallback: If confirmation is disabled, log them in instantly
        navigate('/');
      }
    } catch (err) {
      console.error("Signup Error:", err);
      // Display the exact error message from the server
      setError(err.message || 'An unexpected error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary transition-colors duration-300">
        <div className="w-full max-w-md p-8 bg-bg-panel border border-border-color rounded-3xl animate-slide-up relative z-10 text-center shadow-xl">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="p-4 bg-green-500/20 rounded-full text-green-500">
              <CheckCircle size={40} />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Check Your Inbox</h1>
            <p className="text-text-secondary text-sm leading-relaxed">
              We've successfully sent a confirmation email to <span className="text-primary font-medium">{email}</span>.
              Please click the link in the email to activate your account.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-primary hover:text-indigo-500 font-medium transition-colors text-sm"
          >
            Back to Sign In <ArrowRight size={16} />
          </Link>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary transition-colors duration-300">
      <div className="w-full max-w-md p-8 bg-bg-panel border border-border-color rounded-3xl animate-slide-up relative z-10 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary mb-4">
            <Scale size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Create Account</h1>
          <p className="text-text-secondary mt-2 text-sm">Join LexAI — Your Legal AI Companion</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 animate-fade-in">
            <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
            <p className="text-red-500 text-sm leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
            <input
              id="signup-name"
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-primary border border-border-color rounded-xl py-3 pl-10 pr-4 text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              required
            />
          </div>
          
          <div className="relative pt-2">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary mt-1" size={20} />
            <input
              id="signup-email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-primary border border-border-color rounded-xl py-3 pl-10 pr-4 text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              required
            />
          </div>
          
          <div className="relative pt-2">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary mt-1" size={20} />
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-primary border border-border-color rounded-xl py-3 pl-10 pr-10 text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[60%] -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <PasswordStrength password={password} setPasswordValid={setIsPasswordValid} />

          <button
            id="signup-submit"
            type="submit"
            disabled={loading || !isPasswordValid || !password || !email || !name}
            className="w-full bg-primary hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 group mt-6 shadow-md"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-text-secondary text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-indigo-500 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
