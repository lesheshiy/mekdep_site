import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/AuthProvider.jsx';
import CountUp from '../components/CountUp.jsx';
import { ListSkeleton } from '../components/Skeleton.jsx';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/exams/'), api.get('/attempts/')])
      .then(([e, a]) => {
        setExams(e.data);
        setAttempts(a.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const attemptStats = new Map();
  for (const a of attempts) {
    if (!a.completed_at) continue;
    const cur = attemptStats.get(a.exam) ?? {
      count: 0,
      bestScore: null,
      latest: null,
      flagged: false,
    };
    cur.count += 1;
    if (a.score != null) {
      cur.bestScore =
        cur.bestScore == null ? a.score : Math.max(cur.bestScore, a.score);
    }
    if (
      !cur.latest ||
      new Date(a.completed_at) > new Date(cur.latest.completed_at)
    ) {
      cur.latest = a;
    }
    if (a.flagged_late) cur.flagged = true;
    attemptStats.set(a.exam, cur);
  }

  const enriched = exams.map((e) => {
    const stats = attemptStats.get(e.id) ?? {
      count: 0,
      bestScore: null,
      latest: null,
      flagged: false,
    };
    const remaining = Math.max(0, e.retake_limit - stats.count);
    return { exam: e, stats, remaining };
  });

  const available = enriched.filter((x) => x.remaining > 0);
  const finished = enriched.filter(
    (x) => x.remaining === 0 && x.stats.count > 0
  );

  const completedCount = finished.length;
  const totalExams = exams.length;
  const progressPct =
    totalExams > 0 ? Math.round((completedCount / totalExams) * 100) : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-12 animate-fade-in">
      {/* Hero Greeting */}
      <section className="space-y-2">
        <span className="text-xs font-bold tracking-[0.1em] uppercase text-primary/70 font-label">
          Student Portal
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold font-headline text-on-surface tracking-tight">
          Welcome back, {user?.username}.
        </h1>
        <p className="text-secondary text-lg max-w-2xl">
          {available.length > 0
            ? `You have ${available.length} exam${available.length > 1 ? 's' : ''} available to take.`
            : "You're all caught up. No exams waiting for you."}
          {user?.student_class?.name && (
            <span>
              {' '}
              Class:{' '}
              <span className="font-semibold text-primary">
                {user.student_class.name}
              </span>
            </span>
          )}
        </p>
      </section>

      {/* Bento Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Upcoming Exams */}
        <div className="md:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-headline">
              Upcoming Examinations
            </h3>
            <span className="text-sm text-secondary">
              {available.length} available
            </span>
          </div>

          {loading ? (
            <ListSkeleton rows={3} />
          ) : available.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-10 text-center editorial-shadow">
              <p className="text-sm text-secondary">
                No exams currently available.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {available.map(({ exam, stats, remaining }) => (
                <Link
                  key={exam.id}
                  to={`/exam/${exam.id}`}
                  className="block bg-surface-container-lowest editorial-shadow p-6 rounded-2xl border border-transparent hover:border-outline-variant/15 transition-all group"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full">
                          {stats.count > 0 ? 'Retake' : 'New'}
                        </span>
                        <span className="text-xs text-secondary font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">
                            schedule
                          </span>
                          {exam.timer_minutes} minutes
                        </span>
                        {exam.retake_limit > 1 && (
                          <span className="text-xs text-secondary">
                            {remaining} of {exam.retake_limit} attempts left
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
                          {exam.title}
                        </h4>
                        {exam.description && (
                          <p className="text-secondary text-sm mt-1 line-clamp-2">
                            {exam.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {stats.bestScore != null && (
                        <div className="text-right hidden sm:block">
                          <div className="text-xs font-bold text-secondary uppercase tracking-tighter">
                            Best Score
                          </div>
                          <div className="text-sm font-semibold text-on-surface">
                            {Math.round(stats.bestScore)}%
                          </div>
                        </div>
                      )}
                      <span className="bg-gradient-to-br from-primary to-primary-container text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:brightness-110 transition-all">
                        {stats.count > 0 ? 'Retake' : 'Start Exam'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Stats */}
        <div className="md:col-span-4 space-y-6">
          {/* Course Progress */}
          <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10">
            <div className="text-xs font-bold text-secondary uppercase tracking-[0.1em] mb-4">
              Course Progress
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-extrabold font-headline">
                <CountUp value={progressPct} suffix="%" />
              </span>
              <span className="text-xs font-medium text-primary">
                {completedCount} of {totalExams} done
              </span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-lowest p-5 rounded-2xl editorial-shadow">
              <div className="text-[10px] font-label font-black text-secondary uppercase mb-2">
                Available
              </div>
              <div className="text-xl font-headline font-extrabold text-on-surface">
                <CountUp value={available.length} />
              </div>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-2xl editorial-shadow">
              <div className="text-[10px] font-label font-black text-secondary uppercase mb-2">
                Completed
              </div>
              <div className="text-xl font-headline font-extrabold text-on-surface">
                <CountUp value={completedCount} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Academic History */}
      {finished.length > 0 && (
        <section className="space-y-8 pt-6">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-bold font-headline">
                Academic History
              </h3>
              <p className="text-secondary text-sm">
                Review your curated performance metrics.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finished.map(({ exam, stats }) => {
              const score = stats.bestScore;
              const grade =
                score >= 90
                  ? 'A+'
                  : score >= 80
                    ? 'A'
                    : score >= 70
                      ? 'B'
                      : score >= 60
                        ? 'C'
                        : 'D';
              const gradeColor =
                score >= 80 ? 'text-primary' : 'text-secondary';
              const gradeLabel =
                score >= 90
                  ? 'Exceptional'
                  : score >= 80
                    ? 'Exceeds Expectations'
                    : score >= 70
                      ? 'Standard Pass'
                      : 'Needs Improvement';

              return (
                <div
                  key={exam.id}
                  className="bg-surface-container-lowest editorial-shadow rounded-2xl overflow-hidden"
                >
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="bg-primary/5 p-3 rounded-xl">
                        <span className="material-symbols-outlined text-primary material-symbols-filled">
                          analytics
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-4xl font-black font-headline ${gradeColor} italic`}
                        >
                          {grade}
                        </span>
                        <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">
                          {gradeLabel}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-lg font-bold">{exam.title}</h5>
                      <p className="text-xs text-secondary mt-1">
                        {stats.count} attempt{stats.count > 1 ? 's' : ''}{' '}
                        &middot; Best: {Math.round(score)}%
                      </p>
                    </div>
                    <div className="bg-surface-container-low p-4 rounded-xl">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-secondary">Score</span>
                        <span className="font-bold text-on-surface">
                          {Math.round(score)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                      {stats.flagged && (
                        <p className="text-xs text-tertiary font-medium mt-2 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">
                            flag
                          </span>
                          Flagged: Late submission
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-12 py-12 px-8 border-t border-outline-variant/10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <p className="text-lg font-bold text-primary font-headline">
              The Academic Editorial
            </p>
            <p className="text-xs text-secondary mt-1 uppercase tracking-widest">
              Global Educational Standard
            </p>
          </div>
          <div className="flex gap-8 text-xs font-bold text-secondary uppercase tracking-widest">
            <span className="hover:text-primary transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-primary transition-colors cursor-pointer">
              Academic Integrity
            </span>
            <span className="hover:text-primary transition-colors cursor-pointer">
              Support Desk
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
