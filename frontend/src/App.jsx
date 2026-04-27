import { useState } from 'react';
import {
  Navigate,
  Route,
  Routes,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from './auth/AuthProvider.jsx';
import { useTheme } from './components/ThemeProvider.jsx';
import { useSearch } from './components/SearchContext.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import SearchBar from './components/SearchBar.jsx';
import { ConfirmModal } from './components/Modal.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import CreateExam from './pages/CreateExam.jsx';
import ExamView from './pages/ExamView.jsx';
import ExamList from './pages/ExamList.jsx';
import Results from './pages/Results.jsx';
import Approvals from './pages/Approvals.jsx';
import Classes from './pages/Classes.jsx';
import AttemptDetail from './pages/AttemptDetail.jsx';

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-sm text-outline">Loading...</p>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Navigate
      to={user.role === 'TEACHER' ? '/teacher' : '/student'}
      replace
    />
  );
}

function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user } = useAuth();
  const location = useLocation();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { logout } = useAuth();
  const nav = useNavigate();
  if (!user) return null;

  const isTeacher = user.role === 'TEACHER';
  const links = isTeacher
    ? [
        { to: '/teacher', icon: 'dashboard', label: 'Dashboard' },
        { to: '/teacher/exams', icon: 'description', label: 'Exams' },
        { to: '/teacher/classes', icon: 'groups', label: 'Classes' },
        { to: '/teacher/results', icon: 'analytics', label: 'Results' },
        { to: '/teacher/approvals', icon: 'verified_user', label: 'Approvals' },
        { to: '/profile', icon: 'person', label: 'Profile' },
      ]
    : [
        { to: '/student', icon: 'dashboard', label: 'Dashboard' },
        { to: '/student/exams', icon: 'description', label: 'Exams' },
        { to: '/student/results', icon: 'analytics', label: 'Results' },
        { to: '/student/approvals', icon: 'verified_user', label: 'Approvals' },
        { to: '/profile', icon: 'person', label: 'Profile' },
      ];

  const onLogout = () => {
    logout();
    nav('/login');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen p-6 overflow-y-auto bg-slate-50 z-40 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-base font-black text-blue-900 font-headline">
                The Editorial
              </h1>
              <p className="text-[0.6rem] font-medium tracking-[0.05em] uppercase text-slate-500 mt-0.5">
                Premium Workspace
              </p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-slate-400 hover:text-primary rounded-lg"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <span className="material-symbols-outlined">
              {collapsed ? 'menu' : 'menu_open'}
            </span>
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.label}
                to={l.to}
                title={collapsed ? l.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  active
                    ? 'text-blue-800 font-semibold bg-white shadow-sm'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/50'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <span className="material-symbols-outlined">{l.icon}</span>
                {!collapsed && <span className="text-sm">{l.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 space-y-3">
          {isTeacher && !collapsed && (
            <Link
              to="/teacher/exams/new"
              className="w-full py-3 px-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New Exam
            </Link>
          )}
          <button
            onClick={() => setConfirmLogout(true)}
            className={`w-full py-2 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-sm transition-colors flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}
          >
            <span className="material-symbols-outlined text-base">logout</span>
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[80]">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-slate-50 p-6 flex flex-col animate-slide-in-left">
            <div className="mb-8">
              <h1 className="text-base font-black text-blue-900 font-headline">
                The Editorial
              </h1>
            </div>
            <nav className="flex-1 space-y-1">
              {links.map((l) => {
                const active = location.pathname === l.to;
                return (
                  <Link
                    key={l.label}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                      active
                        ? 'text-blue-800 font-semibold bg-white shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    <span className="material-symbols-outlined">{l.icon}</span>
                    <span className="text-sm">{l.label}</span>
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={() => setConfirmLogout(true)}
              className="mt-auto py-2 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              Sign out
            </button>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-nav flex justify-around items-center h-16 px-4 z-50 border-t border-outline-variant/10">
        {links.slice(0, 5).map((l) => {
          const active = location.pathname === l.to;
          return (
            <Link
              key={l.label}
              to={l.to}
              className={`flex flex-col items-center gap-1 ${
                active ? 'text-primary' : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{l.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-tight">
                {l.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <ConfirmModal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={onLogout}
        title="Sign out?"
        message="You'll need to sign in again to access your workspace."
        confirmText="Sign out"
        destructive
      />
    </>
  );
}

function TopAppBar({ setMobileOpen }) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const { query, setQuery } = useSearch();
  if (!user) return null;
  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <header className="flex justify-between items-center w-full px-4 md:px-8 h-16 glass-nav sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-grow">
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-2 text-slate-500"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Filter this view..."
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="p-2 text-slate-500 hover:bg-slate-100/50 transition-colors rounded-full"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          <span className="material-symbols-outlined">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        <NotificationBell />
        <Link to="/profile" className="flex items-center gap-3 ml-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-on-surface">{user.username}</p>
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-primary">
              {user.role === 'TEACHER' ? 'Senior Curator' : 'Scholar'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container text-white grid place-items-center text-sm font-bold shadow-sm">
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}

function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <main
        className={`min-h-screen pb-20 md:pb-0 transition-all duration-300 ${
          collapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <TopAppBar setMobileOpen={setMobileOpen} />
        <div key={window.location.pathname} className="animate-fade-in">
          {children}
        </div>
      </main>
    </>
  );
}

const Wrap = ({ role, children }) => (
  <RequireAuth role={role}>
    <DashboardLayout>{children}</DashboardLayout>
  </RequireAuth>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Home />} />

      <Route
        path="/profile"
        element={
          <RequireAuth>
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/results/:id"
        element={
          <RequireAuth>
            <DashboardLayout>
              <AttemptDetail />
            </DashboardLayout>
          </RequireAuth>
        }
      />

      {/* Teacher routes */}
      <Route path="/teacher" element={<Wrap role="TEACHER"><TeacherDashboard /></Wrap>} />
      <Route path="/teacher/exams" element={<Wrap role="TEACHER"><ExamList /></Wrap>} />
      <Route path="/teacher/exams/new" element={<Wrap role="TEACHER"><CreateExam /></Wrap>} />
      <Route path="/teacher/exams/:id/edit" element={<Wrap role="TEACHER"><CreateExam /></Wrap>} />
      <Route path="/teacher/classes" element={<Wrap role="TEACHER"><Classes /></Wrap>} />
      <Route path="/teacher/results" element={<Wrap role="TEACHER"><Results /></Wrap>} />
      <Route path="/teacher/approvals" element={<Wrap role="TEACHER"><Approvals /></Wrap>} />

      {/* Student routes */}
      <Route path="/student" element={<Wrap role="STUDENT"><StudentDashboard /></Wrap>} />
      <Route path="/student/exams" element={<Wrap role="STUDENT"><ExamList /></Wrap>} />
      <Route path="/student/results" element={<Wrap role="STUDENT"><Results /></Wrap>} />
      <Route path="/student/approvals" element={<Wrap role="STUDENT"><Approvals /></Wrap>} />

      <Route
        path="/exam/:id"
        element={
          <RequireAuth role="STUDENT">
            <ExamView />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
