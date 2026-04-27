import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/AuthProvider.jsx';
import CountUp from '../components/CountUp.jsx';
import { CardSkeleton } from '../components/Skeleton.jsx';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/exams/')
      .then((r) => setExams(r.data))
      .finally(() => setLoading(false));
  }, []);

  const totalQuestions = exams.reduce(
    (sum, e) => sum + (e.questions?.length ?? 0),
    0
  );
  const avgDuration = exams.length
    ? Math.round(exams.reduce((s, e) => s + e.timer_minutes, 0) / exams.length)
    : 0;

  return (
    <div className="p-6 md:p-10 space-y-12 animate-fade-in">
      {/* Hero Header */}
      <section className="space-y-2">
        <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-on-surface">
          Curator Dashboard
        </h2>
        <p className="text-secondary font-medium">
          Welcome back, {user?.username}. Here is your overview.
        </p>
      </section>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Performance Card */}
        <div className="md:col-span-8 bg-surface-container-lowest p-8 rounded-2xl relative overflow-hidden shadow-editorial">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">
                Performance Trends
              </h3>
              <p className="text-sm text-secondary">
                {exams.length} exams created
              </p>
            </div>
            <div className="bg-surface-container-low px-4 py-1.5 rounded-full text-xs font-bold text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Live Metrics
            </div>
          </div>

          {/* Simulated Chart */}
          <div className="flex items-end gap-2 h-48 mb-6">
            {[40, 65, 55, 85, 60, 75, 90].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-lg transition-colors ${
                  h === 85
                    ? 'bg-primary'
                    : 'bg-primary/10 hover:bg-primary/20'
                }`}
                style={{ height: `${h}%` }}
              ></div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-outline-variant/10">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-secondary mb-1">
                Total Exams
              </p>
              <p className="text-2xl font-headline font-extrabold text-on-surface">
                <CountUp value={exams.length} />
              </p>
            </div>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-secondary mb-1">
                Total Questions
              </p>
              <p className="text-2xl font-headline font-extrabold text-on-surface">
                <CountUp value={totalQuestions} />
              </p>
            </div>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-secondary mb-1">
                Avg Duration
              </p>
              <p className="text-2xl font-headline font-extrabold text-on-surface">
                <CountUp value={avgDuration} suffix="m" />
              </p>
            </div>
          </div>
        </div>

        {/* Active Exam Highlight */}
        <div className="md:col-span-4 bg-primary text-white p-8 rounded-2xl flex flex-col justify-between shadow-editorial-primary">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-blue-300">
                timer
              </span>
              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-blue-100">
                {exams.length > 0 ? 'Latest Exam' : 'No Exams Yet'}
              </span>
            </div>
            <h3 className="text-2xl font-headline font-bold leading-tight mb-2">
              {exams.length > 0 ? exams[0].title : 'Create Your First Exam'}
            </h3>
            <p className="text-blue-100/70 text-sm mb-6">
              {exams.length > 0
                ? `${exams[0].questions?.length ?? 0} questions, ${exams[0].timer_minutes} minutes`
                : 'Get started by creating a new examination.'}
            </p>
          </div>
          <div className="space-y-4">
            {exams.length > 0 && (
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>Questions</span>
                  <span>{exams[0].questions?.length ?? 0}</span>
                </div>
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full"
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>
            )}
            <Link
              to="/teacher/exams/new"
              className="block w-full py-3 bg-white text-primary rounded-xl font-bold text-sm text-center hover:bg-blue-50 transition-colors"
            >
              {exams.length > 0 ? 'Create Another Exam' : 'Create New Exam'}
            </Link>
          </div>
        </div>
      </div>

      {/* Exam List & Activity */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Exam List */}
        <div className="md:col-span-7 space-y-6">
          <div className="flex justify-between items-end">
            <h3 className="text-xl font-headline font-bold text-on-surface">
              All Examinations
            </h3>
            <Link
              to="/teacher/exams/new"
              className="text-[0.7rem] font-bold uppercase tracking-widest text-primary hover:translate-x-1 transition-transform inline-flex items-center gap-1"
            >
              Create New{' '}
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </Link>
          </div>

          {loading ? (
            <CardSkeleton />
          ) : exams.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-surface-container-low grid place-items-center">
                <span className="material-symbols-outlined text-2xl text-outline">
                  description
                </span>
              </div>
              <div>
                <p className="font-bold text-on-surface">No exams yet</p>
                <p className="text-sm text-secondary mt-1">
                  Create your first exam to get started.
                </p>
              </div>
              <Link
                to="/teacher/exams/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/10"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Create Exam
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {exams.map((e) => (
                <div
                  key={e.id}
                  className="group flex items-center justify-between p-4 bg-white hover:bg-surface-container-low transition-all rounded-xl border border-transparent hover:border-outline-variant/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/5 grid place-items-center">
                      <span className="material-symbols-outlined text-primary">
                        description
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">
                        {e.title}
                      </h4>
                      <p className="text-xs text-secondary">
                        {e.questions?.length ?? 0} questions &middot;{' '}
                        {e.timer_minutes} min
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full">
                    Published
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Curation Tools */}
        <div className="md:col-span-5 bg-surface-container-low/50 rounded-2xl p-8 space-y-6">
          <h3 className="text-xl font-headline font-bold text-on-surface">
            Curation Tools
          </h3>
          <div className="space-y-4">
            <Link
              to="/teacher/exams/new"
              className="group cursor-pointer bg-white p-5 rounded-xl hover:shadow-editorial-lg transition-all flex items-center gap-5 border border-transparent hover:border-primary/10"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface">Exam Creator</h4>
                <p className="text-xs text-secondary">
                  Build new assessments from scratch.
                </p>
              </div>
            </Link>

            <Link
              to="/teacher/classes"
              className="group cursor-pointer bg-white p-5 rounded-xl hover:shadow-editorial-lg transition-all flex items-center gap-5 border border-transparent hover:border-primary/10 hover-lift"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface">Manage Classes</h4>
                <p className="text-xs text-secondary">
                  Create classes and enroll students.
                </p>
              </div>
            </Link>

            <Link
              to="/teacher/exams"
              className="group cursor-pointer bg-white p-5 rounded-xl hover:shadow-editorial-lg transition-all flex items-center gap-5 border border-transparent hover:border-primary/10 hover-lift"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined">library_books</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface">Question Bank</h4>
                <p className="text-xs text-secondary">
                  Browse {totalQuestions} curated question{totalQuestions === 1 ? '' : 's'}.
                </p>
              </div>
            </Link>

            <Link
              to="/teacher/approvals"
              className="group cursor-pointer bg-white p-5 rounded-xl hover:shadow-editorial-lg transition-all flex items-center gap-5 border border-transparent hover:border-primary/10"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined">group</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface">Student Requests</h4>
                <p className="text-xs text-secondary">
                  Review retake requests and accommodations.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-8 pb-4 text-center text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
        The Academic Editorial System
      </footer>
    </div>
  );
}
