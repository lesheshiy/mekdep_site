import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(username, password, remember);
      toast.success('Welcome back!');
      nav('/');
    } catch {
      setErr('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-surface">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[50%] bg-secondary/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-black text-blue-900 font-headline tracking-tight">
            The Academic Editorial
          </h1>
          <p className="text-[0.75rem] font-medium tracking-[0.05em] uppercase text-slate-500 mt-1">
            Premium Educational Workspace
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-8 editorial-shadow">
          <div className="mb-8">
            <h2 className="text-2xl font-headline font-extrabold text-on-surface">
              Welcome back
            </h2>
            <p className="text-sm text-secondary mt-1">
              Sign in to continue your academic journey.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            {err && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 animate-fade-in">
                {err}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-label tracking-[0.05em] text-on-surface-variant uppercase font-semibold">
                Username
              </label>
              <input
                className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g., alexandra.reid"
                value={username}
                onChange={(e) => setU(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-label tracking-[0.05em] text-on-surface-variant uppercase font-semibold">
                Password
              </label>
              <div className="relative">
                <input
                  className="w-full bg-surface-container-low border-none rounded-xl p-4 pr-12 focus:ring-2 focus:ring-primary/20 transition-all"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setP(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-base">
                    {showPw ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded text-primary focus:ring-primary/40"
              />
              Remember me on this device
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center text-sm text-secondary">
              No account yet?{' '}
              <Link
                to="/register"
                className="font-bold text-primary hover:underline"
              >
                Create one
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mt-8">
          Protected Exam Environment
        </p>
      </div>
    </div>
  );
}
