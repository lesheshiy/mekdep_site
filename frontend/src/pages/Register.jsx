import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirm: '',
    role: 'STUDENT',
    student_class: '',
  });
  const [classes, setClasses] = useState([]);
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/public/classes/').then((r) => setClasses(r.data)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (form.password !== form.confirm) {
      setErr("Passwords don't match.");
      return;
    }
    if (form.password.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
      };
      if (form.role === 'STUDENT' && form.student_class) {
        payload.student_class = Number(form.student_class);
      }
      await register(payload);
      toast.success('Account created!');
      nav('/');
    } catch (e2) {
      const data = e2.response?.data;
      const msg =
        data?.username?.[0] ||
        data?.password?.[0] ||
        data?.email?.[0] ||
        data?.detail ||
        'Registration failed.';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-surface">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-primary/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-blue-900 font-headline tracking-tight">
            The Academic Editorial
          </h1>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mt-1">
            Create your account
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-surface-container-lowest rounded-2xl p-8 editorial-shadow space-y-6"
        >
          {err && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update('role', 'STUDENT')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                form.role === 'STUDENT'
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant/20 hover:border-primary/30'
              }`}
            >
              <span className="material-symbols-outlined text-primary block mb-2">
                school
              </span>
              <p className="font-bold text-sm text-on-surface">Student</p>
              <p className="text-xs text-secondary mt-0.5">Take exams</p>
            </button>
            <button
              type="button"
              onClick={() => update('role', 'TEACHER')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                form.role === 'TEACHER'
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant/20 hover:border-primary/30'
              }`}
            >
              <span className="material-symbols-outlined text-primary block mb-2">
                history_edu
              </span>
              <p className="font-bold text-sm text-on-surface">Teacher</p>
              <p className="text-xs text-secondary mt-0.5">Create exams</p>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
              Username
            </label>
            <input
              className="w-full bg-surface-container-low border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
              Email
            </label>
            <input
              type="email"
              className="w-full bg-surface-container-low border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />
          </div>

          {form.role === 'STUDENT' && (
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                Class (optional)
              </label>
              <select
                className="w-full bg-surface-container-low border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
                value={form.student_class}
                onChange={(e) => update('student_class', e.target.value)}
              >
                <option value="">No class yet — assign later</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="w-full bg-surface-container-low border-none rounded-xl p-3 pr-10 focus:ring-2 focus:ring-primary/20"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <span className="material-symbols-outlined text-base">
                    {showPw ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                Confirm Password
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                className="w-full bg-surface-container-low border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
                value={form.confirm}
                onChange={(e) => update('confirm', e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="text-center text-sm text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
