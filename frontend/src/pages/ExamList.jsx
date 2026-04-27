import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useToast } from '../components/Toast.jsx';
import { useSearch } from '../components/SearchContext.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { ListSkeleton } from '../components/Skeleton.jsx';

export default function ExamList() {
  const { user } = useAuth();
  const toast = useToast();
  const { query } = useSearch();
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const isTeacher = user?.role === 'TEACHER';

  const load = async () => {
    setLoading(true);
    try {
      const [e, c] = await Promise.all([
        api.get('/exams/'),
        api.get('/classes/').catch(() => ({ data: [] })),
      ]);
      setExams(e.data);
      setClasses(c.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (exam) => {
    try {
      await api.delete(`/exams/${exam.id}/`);
      toast.success('Exam deleted.');
      load();
    } catch {
      toast.error('Could not delete.');
    }
  };

  const duplicate = async (exam) => {
    try {
      await api.post(`/exams/${exam.id}/duplicate/`);
      toast.success('Exam duplicated as draft.');
      load();
    } catch {
      toast.error('Could not duplicate.');
    }
  };

  const togglePublish = async (exam) => {
    try {
      await api.post(`/exams/${exam.id}/toggle_publish/`);
      toast.success(
        exam.is_published ? 'Unpublished — now a draft.' : 'Published.'
      );
      load();
    } catch {
      toast.error('Failed.');
    }
  };

  const filtered = exams.filter((e) => {
    if (query && !e.title.toLowerCase().includes(query.toLowerCase()))
      return false;
    if (classFilter && String(e.assigned_to) !== classFilter) return false;
    if (statusFilter !== 'all') {
      const wantPublished = statusFilter === 'published';
      if (Boolean(e.is_published ?? true) !== wantPublished) return false;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-10 space-y-10 animate-fade-in">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-2">
          <span className="text-xs font-bold tracking-widest uppercase text-primary/70">
            {isTeacher ? 'Manage Assessments' : 'My Exams'}
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold font-headline text-on-surface tracking-tight">
            Examinations
          </h1>
          <p className="text-secondary text-lg">
            {isTeacher
              ? 'View and manage all your created examinations.'
              : 'Browse all available examinations.'}
          </p>
        </div>
        {isTeacher && (
          <Link
            to="/teacher/exams/new"
            className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create New Exam
          </Link>
        )}
      </section>

      {isTeacher && (
        <div className="flex flex-wrap gap-3">
          <select
            className="bg-surface-container-low rounded-xl px-4 py-2 text-sm font-medium border-none focus:ring-2 focus:ring-primary/20"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex bg-surface-container-low rounded-xl p-1">
            {['all', 'published', 'draft'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  statusFilter === s
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-secondary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="description"
          title={query || classFilter ? 'No matches' : 'No exams yet'}
          description={
            isTeacher
              ? 'Create your first exam to get started.'
              : 'No exams have been assigned to your class yet.'
          }
          action={
            isTeacher && (
              <Link
                to="/teacher/exams/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Create Exam
              </Link>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((exam) => {
            const published = exam.is_published ?? true;
            return (
              <div
                key={exam.id}
                className="bg-surface-container-lowest rounded-2xl p-6 shadow-editorial border border-transparent hover:border-outline-variant/15 transition-all group hover-lift"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-primary/5 p-3 rounded-xl">
                    <span className="material-symbols-outlined text-primary">
                      description
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {isTeacher && (
                      <span
                        className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${
                          published
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {published ? 'Published' : 'Draft'}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full">
                      {exam.questions?.length ?? 0} Q
                    </span>
                  </div>
                </div>
                <h4 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors mb-1">
                  {exam.title}
                </h4>
                {exam.description && (
                  <p className="text-sm text-secondary line-clamp-2 mb-4">
                    {exam.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-secondary mt-4 pt-4 border-t border-outline-variant/10">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      schedule
                    </span>
                    {exam.timer_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      replay
                    </span>
                    {exam.retake_limit} attempt
                    {exam.retake_limit > 1 ? 's' : ''}
                  </span>
                </div>

                {isTeacher ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      to={`/teacher/exams/${exam.id}/edit`}
                      className="px-3 py-2 text-xs font-bold text-primary bg-primary/10 rounded-lg text-center hover:bg-primary/20 transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => togglePublish(exam)}
                      className="px-3 py-2 text-xs font-bold text-secondary bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors"
                    >
                      {published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => duplicate(exam)}
                      className="px-3 py-2 text-xs font-bold text-secondary bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => setConfirmDelete(exam)}
                      className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <Link
                    to={`/exam/${exam.id}`}
                    className="mt-4 block w-full py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm text-center shadow-md hover:brightness-110 transition-all"
                  >
                    Start Exam
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => remove(confirmDelete)}
        title="Delete exam?"
        message={`"${confirmDelete?.title}" will be removed. Past attempts will keep their record. This cannot be undone.`}
        confirmText="Delete"
        destructive
      />
    </div>
  );
}
