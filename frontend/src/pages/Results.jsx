import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useSearch } from '../components/SearchContext.jsx';
import { ListSkeleton } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import CountUp from '../components/CountUp.jsx';

export default function Results() {
  const { user } = useAuth();
  const { query } = useSearch();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examFilter, setExamFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [stats, setStats] = useState(null);
  const [activeExam, setActiveExam] = useState(null);

  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    api
      .get('/attempts/')
      .then((r) => setAttempts(r.data))
      .finally(() => setLoading(false));
  }, []);

  const completed = useMemo(
    () => attempts.filter((a) => a.completed_at),
    [attempts]
  );

  const exams = useMemo(() => {
    const m = new Map();
    completed.forEach((a) => m.set(a.exam, a.exam_title));
    return [...m.entries()];
  }, [completed]);

  const students = useMemo(() => {
    if (!isTeacher) return [];
    const set = new Set(completed.map((a) => a.student_username));
    return [...set];
  }, [completed, isTeacher]);

  const filtered = completed.filter((a) => {
    if (examFilter && String(a.exam) !== examFilter) return false;
    if (studentFilter && a.student_username !== studentFilter) return false;
    if (
      query &&
      !a.exam_title.toLowerCase().includes(query.toLowerCase()) &&
      !(a.student_username || '').toLowerCase().includes(query.toLowerCase())
    )
      return false;
    return true;
  });

  const avgScore = useMemo(() => {
    const valid = filtered.filter((a) => a.score != null);
    return valid.length
      ? Math.round(valid.reduce((s, a) => s + a.score, 0) / valid.length)
      : null;
  }, [filtered]);

  const loadStats = async (examId) => {
    setActiveExam(examId);
    try {
      const { data } = await api.get(`/attempts/exam-stats/${examId}/`);
      setStats(data);
    } catch {
      setStats(null);
    }
  };

  const exportCsv = async () => {
    const res = await api.get('/attempts/export_csv/', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-10 space-y-10 animate-fade-in">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest text-primary/70 font-bold">
            {isTeacher ? 'Student Performance' : 'My Performance'}
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold font-headline text-on-surface tracking-tight">
            Results & Analytics
          </h1>
          <p className="text-secondary text-lg">
            {isTeacher
              ? 'Review submissions and dive into per-exam analytics.'
              : 'Track your progress and click any row to see your detailed answers.'}
          </p>
        </div>
        {isTeacher && filtered.length > 0 && (
          <button
            onClick={exportCsv}
            className="px-5 py-2.5 bg-on-surface text-white text-sm font-bold rounded-xl hover:opacity-90 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
          </button>
        )}
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-editorial">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-secondary mb-1">
            Total Submissions
          </p>
          <p className="text-3xl font-headline font-extrabold text-on-surface">
            <CountUp value={filtered.length} />
          </p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-editorial">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-secondary mb-1">
            Average Score
          </p>
          <p className="text-3xl font-headline font-extrabold text-on-surface">
            {avgScore != null ? <CountUp value={avgScore} suffix="%" /> : '--'}
          </p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-editorial">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-secondary mb-1">
            Late Submissions
          </p>
          <p className="text-3xl font-headline font-extrabold text-rose-600">
            <CountUp value={filtered.filter((a) => a.flagged_late).length} />
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="bg-surface-container-low rounded-xl px-4 py-2 text-sm font-medium border-none focus:ring-2 focus:ring-primary/20"
          value={examFilter}
          onChange={(e) => setExamFilter(e.target.value)}
        >
          <option value="">All exams</option>
          {exams.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
        {isTeacher && (
          <>
            <select
              className="bg-surface-container-low rounded-xl px-4 py-2 text-sm font-medium border-none focus:ring-2 focus:ring-primary/20"
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
            >
              <option value="">All students</option>
              {students.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {examFilter && (
              <button
                onClick={() => loadStats(examFilter)}
                className="px-4 py-2 bg-primary/10 text-primary text-sm font-bold rounded-xl flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">
                  insights
                </span>
                Show analytics
              </button>
            )}
          </>
        )}
      </div>

      {isTeacher && stats && activeExam === examFilter && (
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-editorial space-y-6 animate-fade-in">
          <h3 className="text-lg font-headline font-bold text-on-surface">
            Exam Analytics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-secondary font-bold mb-3">
                Score Distribution
              </p>
              <div className="flex items-end gap-2 h-32">
                {stats.buckets.map((c, i) => {
                  const max = Math.max(...stats.buckets, 1);
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-full bg-primary rounded-t-md transition-all"
                        style={{ height: `${(c / max) * 100}%` }}
                      />
                      <span className="text-[10px] font-bold text-secondary">
                        {i * 20}-{i * 20 + 20}
                      </span>
                      <span className="text-[10px] text-outline">{c}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-sm text-secondary">
                Average:{' '}
                <span className="font-bold text-on-surface">
                  {stats.average != null ? Math.round(stats.average) : '—'}%
                </span>{' '}
                across {stats.submissions} submission
                {stats.submissions === 1 ? '' : 's'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-secondary font-bold mb-3">
                Hardest Questions
              </p>
              <div className="space-y-2">
                {stats.questions.slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between bg-surface-container-low rounded-lg px-3 py-2"
                  >
                    <p className="text-sm truncate flex-1 mr-3">{q.text}</p>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        q.correct_rate >= 0.7
                          ? 'bg-emerald-50 text-emerald-700'
                          : q.correct_rate >= 0.4
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {Math.round(q.correct_rate * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h3 className="text-xl font-headline font-bold text-on-surface">
          All Submissions
        </h3>
        {loading ? (
          <ListSkeleton rows={3} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="analytics"
            title="No results yet"
            description={
              isTeacher
                ? 'Submissions will appear here once students complete exams.'
                : 'Complete an exam to see your results here.'
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => {
              const score = a.score != null ? Math.round(a.score) : null;
              const scoreColor =
                score >= 80
                  ? 'text-emerald-700 bg-emerald-50'
                  : score >= 50
                    ? 'text-amber-700 bg-amber-50'
                    : score != null
                      ? 'text-rose-700 bg-rose-50'
                      : 'text-secondary bg-surface-container-low';
              return (
                <Link
                  to={`/results/${a.id}`}
                  key={a.id}
                  className="block bg-white hover:bg-surface-container-low transition-all rounded-xl p-4 md:p-6 md:grid md:grid-cols-12 gap-4 items-center border border-transparent hover:border-outline-variant/10 hover-lift"
                >
                  <div className="col-span-4">
                    <p className="font-bold text-on-surface text-sm">
                      {a.exam_title}
                    </p>
                  </div>
                  {isTeacher && (
                    <div className="col-span-2 text-sm text-secondary">
                      {a.student_username}
                    </div>
                  )}
                  <div
                    className={`${isTeacher ? 'col-span-2' : 'col-span-3'} text-sm text-secondary`}
                  >
                    {a.completed_at
                      ? new Date(a.completed_at).toLocaleString()
                      : '--'}
                  </div>
                  <div className={isTeacher ? 'col-span-2' : 'col-span-3'}>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${scoreColor}`}
                    >
                      {score != null ? `${score}%` : 'Pending'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    {a.flagged_late && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-rose-700 bg-rose-50">
                        <span className="material-symbols-outlined text-[14px]">
                          flag
                        </span>
                        Late
                      </span>
                    )}
                    <span className="ml-auto text-primary">
                      <span className="material-symbols-outlined text-base">
                        chevron_right
                      </span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
