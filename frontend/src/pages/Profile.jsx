import { useState } from 'react';
import api from '../api';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Profile() {
  const { user, refreshMe, logout } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  const [pw, setPw] = useState({ old_password: '', new_password: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.patch('/auth/me/', profile);
      await refreshMe();
      toast.success('Profile updated.');
    } catch (e2) {
      toast.error(
        e2.response?.data?.username?.[0] ||
          e2.response?.data?.email?.[0] ||
          'Could not update.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const savePw = async (e) => {
    e.preventDefault();
    if (pw.new_password !== pw.confirm) {
      toast.error("New passwords don't match.");
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/auth/change-password/', {
        old_password: pw.old_password,
        new_password: pw.new_password,
      });
      setPw({ old_password: '', new_password: '', confirm: '' });
      toast.success('Password changed.');
    } catch (e2) {
      toast.error(
        e2.response?.data?.detail ||
          e2.response?.data?.new_password?.[0] ||
          'Could not change password.'
      );
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-10 animate-fade-in">
      <section>
        <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
          Account
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold font-headline text-on-surface tracking-tight mt-1">
          Profile Settings
        </h1>
      </section>

      <form
        onSubmit={saveProfile}
        className="bg-surface-container-lowest p-8 rounded-2xl shadow-editorial space-y-6"
      >
        <h3 className="font-headline font-bold text-lg text-on-surface">
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold tracking-wider text-secondary">
              Username
            </label>
            <input
              className="w-full bg-surface-container-low border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
              value={profile.username}
              onChange={(e) =>
                setProfile({ ...profile, username: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold tracking-wider text-secondary">
              Email
            </label>
            <input
              type="email"
              className="w-full bg-surface-container-low border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            disabled={savingProfile}
            className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
          >
            {savingProfile ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>

      <form
        onSubmit={savePw}
        className="bg-surface-container-lowest p-8 rounded-2xl shadow-editorial space-y-6"
      >
        <h3 className="font-headline font-bold text-lg text-on-surface">
          Change Password
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold tracking-wider text-secondary">
              Current Password
            </label>
            <input
              type="password"
              className="w-full bg-surface-container-low border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
              value={pw.old_password}
              onChange={(e) => setPw({ ...pw, old_password: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-secondary">
                New Password
              </label>
              <input
                type="password"
                className="w-full bg-surface-container-low border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
                value={pw.new_password}
                onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-secondary">
                Confirm
              </label>
              <input
                type="password"
                className="w-full bg-surface-container-low border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                required
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            disabled={savingPw}
            className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
          >
            {savingPw ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </form>

      <section className="bg-rose-50/40 border border-rose-100 p-6 rounded-2xl">
        <h3 className="font-bold text-rose-800 mb-2">Danger zone</h3>
        <p className="text-sm text-rose-700/70 mb-4">
          Sign out from this device. Tokens will be cleared from local storage.
        </p>
        <button
          onClick={logout}
          className="px-5 py-2 text-sm font-bold text-rose-700 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
