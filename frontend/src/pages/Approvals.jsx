import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useToast } from '../components/Toast.jsx';
import { useSearch } from '../components/SearchContext.jsx';
import Modal, { ConfirmModal } from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { ListSkeleton } from '../components/Skeleton.jsx';

export default function Approvals() {
  const { user } = useAuth();
  const toast = useToast();
  const { query } = useSearch();
  const [requests, setRequests] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [declineFor, setDeclineFor] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [cancelFor, setCancelFor] = useState(null);

  const isTeacher = user?.role === 'TEACHER';

  const load = () => {
    const fetches = [api.get('/retake-requests/')];
    if (!isTeacher) fetches.push(api.get('/exams/'));
    Promise.all(fetches)
      .then(([r, e]) => {
        setRequests(r.data);
        if (e) setExams(e.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id) => {
    try {
      await api.post(`/retake-requests/${id}/approve/`);
      toast.success('Request approved.');
      load();
    } catch {
      toast.error('Could not approve.');
    }
  };

  const decline = async () => {
    try {
      await api.post(`/retake-requests/${declineFor.id}/decline/`, {
        decline_reason: declineReason,
      });
      toast.success('Request declined.');
      setDeclineFor(null);
      setDeclineReason('');
      load();
    } catch {
      toast.error('Could not decline.');
    }
  };

  const cancel = async () => {
    try {
      await api.delete(`/retake-requests/${cancelFor.id}/`);
      toast.success('Request cancelled.');
      setCancelFor(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not cancel.');
    }
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/retake-requests/', {
        exam: Number(selectedExam),
        reason,
      });
      setShowForm(false);
      setSelectedExam('');
      setReason('');
      toast.success('Request submitted.');
      load();
    } catch (e2) {
      toast.error(e2.response?.data?.detail || 'Could not submit.');
    } finally {
      setSubmitting(false);
    }
  };

  const filterFn = (r) =>
    !query ||
    r.exam_title.toLowerCase().includes(query.toLowerCase()) ||
    (r.student_username || '').toLowerCase().includes(query.toLowerCase()) ||
    (r.reason || '').toLowerCase().includes(query.toLowerCase());

  const pending = requests.filter((r) => r.status === 'PENDING').filter(filterFn);
  const reviewed = requests.filter((r) => r.status !== 'PENDING').filter(filterFn);

  return (
    <div className="p-6 md:p-10 space-y-10 animate-fade-in">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest text-primary/70 font-bold">
            {isTeacher ? 'Manage Requests' : 'My Requests'}
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold font-headline text-on-surface tracking-tight">
            Retake Approvals
          </h1>
          <p className="text-secondary text-lg">
            {isTeacher
              ? 'Review and manage student retake requests.'
              : 'Request additional attempts for your examinations.'}
          </p>
        </div>
        {!isTeacher && (
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Request Retake
          </button>
        )}
      </section>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New retake request"
        footer={
          <>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2 text-sm font-bold text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={submitRequest}
              disabled={submitting || !selectedExam || !reason.trim()}
              className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Submit'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-secondary">
              Exam
            </label>
            <select
              className="mt-1 w-full bg-surface-container-low rounded-xl p-3"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option value="">Choose an exam...</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-secondary">
              Reason
            </label>
            <textarea
              rows="3"
              className="mt-1 w-full bg-surface-container-low rounded-xl p-3 resize-none"
              placeholder="Please explain why you need a retake..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!declineFor}
        onClose={() => setDeclineFor(null)}
        title={`Decline ${declineFor?.student_username}'s request?`}
        footer={
          <>
            <button
              onClick={() => setDeclineFor(null)}
              className="px-5 py-2 text-sm font-bold text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={decline}
              className="px-5 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl"
            >
              Decline
            </button>
          </>
        }
      >
        <textarea
          rows="3"
          className="w-full bg-surface-container-low rounded-xl p-3 resize-none"
          placeholder="Reason shown to the student (optional)"
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
        />
      </Modal>

      <ConfirmModal
        open={!!cancelFor}
        onClose={() => setCancelFor(null)}
        onConfirm={cancel}
        title="Cancel request?"
        message="This will remove your pending retake request."
        confirmText="Cancel request"
        destructive
      />

      {loading ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <h3 className="text-xl font-headline font-bold text-on-surface">
                Pending
              </h3>
              <span className="text-xs font-bold text-secondary">
                {pending.length} pending
              </span>
            </div>

            {pending.length === 0 ? (
              <EmptyState
                icon="verified_user"
                title="No pending requests"
                description={
                  isTeacher
                    ? 'All retake requests have been reviewed.'
                    : 'You have no pending retake requests.'
                }
              />
            ) : (
              <div className="space-y-2">
                {pending.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white rounded-xl border border-transparent hover:border-outline-variant/10 transition-all gap-4 hover-lift"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 grid place-items-center">
                        <span className="material-symbols-outlined text-primary text-lg">
                          person
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-on-surface">
                          {isTeacher ? r.student_username : r.exam_title}
                        </h4>
                        <p className="text-xs text-secondary">
                          {isTeacher
                            ? `Exam: ${r.exam_title}`
                            : `Submitted ${new Date(r.created_at).toLocaleDateString()}`}
                          {r.reason && ` · ${r.reason}`}
                        </p>
                      </div>
                    </div>
                    {isTeacher ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setDeclineFor(r);
                            setDeclineReason('');
                          }}
                          className="px-4 py-1.5 rounded-full text-xs font-bold text-secondary border border-outline-variant/30 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => approve(r.id)}
                          className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-primary shadow-sm hover:shadow-md transition-all"
                        >
                          Approve
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-widest rounded-full">
                          Pending
                        </span>
                        <button
                          onClick={() => setCancelFor(r)}
                          className="text-xs font-bold text-rose-600 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {reviewed.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-headline font-bold text-on-surface">
                Reviewed
              </h3>
              <div className="space-y-2">
                {reviewed.map((r) => {
                  const isApproved = r.status === 'APPROVED';
                  return (
                    <div
                      key={r.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white rounded-xl border border-outline-variant/5 gap-4"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={`w-10 h-10 rounded-full grid place-items-center ${
                            isApproved ? 'bg-emerald-50' : 'bg-rose-50'
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-lg ${
                              isApproved ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isApproved ? 'check_circle' : 'cancel'}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-on-surface">
                            {isTeacher ? r.student_username : r.exam_title}
                          </h4>
                          <p className="text-xs text-secondary">
                            {isTeacher && `Exam: ${r.exam_title}`}
                            {r.reason && ` · ${r.reason}`}
                          </p>
                          {!isApproved && r.decline_reason && (
                            <p className="text-xs text-rose-600 mt-1">
                              <b>Decline reason:</b> {r.decline_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-secondary">
                          {r.reviewed_at
                            ? new Date(r.reviewed_at).toLocaleDateString()
                            : ''}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
