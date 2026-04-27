import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';

export default function ExamView() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const storageKey = `exam-${id}-progress`;

  const [exam, setExam] = useState(null);
  const [phase, setPhase] = useState('intro'); // intro | active
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState({});
  const [flags, setFlags] = useState(new Set());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const startedAtRef = useRef(null);
  const submittedRef = useRef(false);
  const answersRef = useRef({});
  const examRef = useRef(null);
  const flagsRef = useRef(new Set());

  useEffect(() => {
    answersRef.current = answers;
    if (phase === 'active' && exam) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers,
          flags: [...flags],
          startedAt: startedAtRef.current,
        })
      );
    }
  }, [answers, flags, phase, exam, storageKey]);

  useEffect(() => {
    examRef.current = exam;
  }, [exam]);
  useEffect(() => {
    flagsRef.current = flags;
  }, [flags]);

  useEffect(() => {
    api.get(`/exams/${id}/`).then((r) => {
      setExam(r.data);
    });
  }, [id]);

  const start = () => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const started = new Date(parsed.startedAt);
        const elapsed = (Date.now() - started.getTime()) / 1000;
        const remaining = exam.timer_minutes * 60 - elapsed;
        if (remaining > 0) {
          setAnswers(parsed.answers || {});
          setFlags(new Set(parsed.flags || []));
          startedAtRef.current = parsed.startedAt;
          setSecondsLeft(Math.floor(remaining));
          setPhase('active');
          toast.info('Restored your saved progress.');
          return;
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch {
        /* ignore */
      }
    }
    startedAtRef.current = new Date().toISOString();
    setSecondsLeft(exam.timer_minutes * 60);
    setPhase('active');
  };

  useEffect(() => {
    if (phase !== 'active') return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          submitExam(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'active') return;
    const beforeUnload = (e) => {
      if (submittedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [phase]);

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'active' || !exam) return;
    const handler = (e) => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      )
        return;
      if (e.key === 'ArrowRight' && idx < exam.questions.length - 1) {
        setDirection(1);
        setIdx(idx + 1);
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        setDirection(-1);
        setIdx(idx - 1);
      } else if (e.key === 'f') {
        toggleFlag(exam.questions[idx].id);
      } else if (e.key === 's') {
        setShowSummary(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, exam, idx]);

  const toggleFlag = (qid) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  const submitExam = async (auto = false) => {
    const currentExam = examRef.current;
    if (submittedRef.current || !currentExam) return;
    submittedRef.current = true;
    setSubmitting(true);
    setShowSummary(false);
    const currentAnswers = answersRef.current;
    const payload = {
      exam: currentExam.id,
      started_at: startedAtRef.current,
      flagged_questions: [...flagsRef.current],
      answers: currentExam.questions.map((q) => ({
        question: q.id,
        selected_choice: currentAnswers[q.id]?.choice ?? null,
        text_answer: currentAnswers[q.id]?.text ?? '',
      })),
    };
    try {
      const { data } = await api.post(
        `/exams/${currentExam.id}/submit/`,
        payload
      );
      localStorage.removeItem(storageKey);
      if (auto) toast.warn('Time up — exam submitted automatically.');
      nav(`/results/${data.id}`);
    } catch (err) {
      submittedRef.current = false;
      toast.error(err.response?.data?.detail ?? 'Submission failed.');
      setSubmitting(false);
    }
  };

  if (!exam) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface">
        <p className="text-sm text-outline">Loading exam...</p>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 animate-fade-in">
        <div className="max-w-2xl w-full bg-surface-container-lowest rounded-2xl shadow-editorial p-10 space-y-8">
          <div className="text-center space-y-2">
            <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest rounded-full">
              Ready to begin
            </span>
            <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface">
              {exam.title}
            </h1>
            {exam.description && (
              <p className="text-secondary">{exam.description}</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-container-low p-4 rounded-xl text-center">
              <span className="material-symbols-outlined text-primary block mb-1">
                quiz
              </span>
              <p className="text-2xl font-headline font-extrabold">
                {exam.questions.length}
              </p>
              <p className="text-xs text-secondary uppercase tracking-wider">
                Questions
              </p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-xl text-center">
              <span className="material-symbols-outlined text-primary block mb-1">
                schedule
              </span>
              <p className="text-2xl font-headline font-extrabold">
                {exam.timer_minutes}
              </p>
              <p className="text-xs text-secondary uppercase tracking-wider">
                Minutes
              </p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-xl text-center">
              <span className="material-symbols-outlined text-primary block mb-1">
                replay
              </span>
              <p className="text-2xl font-headline font-extrabold">
                {exam.retake_limit}
              </p>
              <p className="text-xs text-secondary uppercase tracking-wider">
                Attempts
              </p>
            </div>
          </div>
          <ul className="bg-amber-50/60 border border-amber-100 rounded-xl p-5 text-sm text-amber-900 space-y-2">
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-base">timer</span>
              The timer starts the moment you press <b>Start</b> and cannot be
              paused.
            </li>
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-base">save</span>
              Your answers are auto-saved — you can refresh without losing
              progress.
            </li>
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-base">flag</span>
              Use <b>F</b> to flag a question, <b>← →</b> to navigate, <b>S</b>{' '}
              to open the summary.
            </li>
          </ul>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => nav('/student/exams')}
              className="px-6 py-3 text-secondary font-bold rounded-xl hover:bg-surface-container-high transition-colors"
            >
              Not yet
            </button>
            <button
              onClick={start}
              className="px-8 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-all"
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = exam.questions[idx];
  const total = exam.questions.length;
  const answeredIds = Object.keys(answers).filter((k) => {
    const a = answers[k];
    return a?.choice != null || (a?.text && a.text.trim());
  });
  const answeredCount = answeredIds.length;
  const unansweredCount = total - answeredCount;

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const lowTime = secondsLeft < 60;
  const flagged = flags.has(q.id);

  return (
    <div className="min-h-screen bg-surface relative">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-surface">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-primary/5 rounded-full blur-[120px]"></div>
      </div>

      <header className="glass-nav flex justify-between items-center w-full px-8 h-16 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <span className="text-xl font-bold tracking-tight text-blue-900 font-headline">
            The Academic Editorial
          </span>
          <div className="hidden md:block h-6 w-px bg-outline-variant/30" />
          <div className="flex items-center gap-2">
            <span
              className={`material-symbols-outlined ${lowTime ? 'text-rose-500' : 'text-secondary'}`}
            >
              timer
            </span>
            <span
              className={`font-headline font-bold text-lg tracking-tight ${
                lowTime ? 'text-rose-500 animate-pulse' : 'text-primary'
              }`}
            >
              {mins}:{secs}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-sm font-semibold text-on-surface">
            {exam.title}
          </span>
          <button
            onClick={() => setShowExit(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100/50 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-medium">Exit</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Progress
              </span>
              <h2 className="text-3xl font-headline font-extrabold text-on-surface mt-1">
                Question {idx + 1}{' '}
                <span className="text-outline-variant font-medium">
                  / {total}
                </span>
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Answered
              </span>
              <p className="text-lg font-headline font-bold text-on-surface mt-1">
                {answeredCount} / {total}
              </p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-700 ease-in-out"
              style={{ width: `${((idx + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div
            key={idx}
            className={`lg:col-span-8 space-y-10 ${direction > 0 ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
          >
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center w-12 h-12 bg-primary text-white rounded-xl font-headline text-xl font-extrabold">
                  {idx + 1}
                </span>
                <button
                  onClick={() => toggleFlag(q.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    flagged
                      ? 'bg-amber-500 text-white'
                      : 'bg-surface-container-low text-secondary hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    flag
                  </span>
                  {flagged ? 'Flagged' : 'Flag for review'}
                </button>
              </div>
              <h3 className="text-2xl font-headline font-bold leading-snug text-on-surface">
                {q.text}
              </h3>
            </section>

            {q.type === 'MCQ' ? (
              <div className="space-y-3">
                {q.choices.map((c) => {
                  const selected = answers[q.id]?.choice === c.id;
                  return (
                    <label
                      key={c.id}
                      className={`group relative flex items-center p-6 rounded-xl cursor-pointer transition-all duration-300 ${
                        selected
                          ? 'bg-primary/5 ring-2 ring-primary/30'
                          : 'bg-surface-container-lowest hover:bg-surface-container-low'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={selected}
                        onChange={() =>
                          setAnswers({
                            ...answers,
                            [q.id]: { choice: c.id },
                          })
                        }
                        className="hidden peer"
                      />
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mr-6 ${
                          selected
                            ? 'border-primary bg-primary'
                            : 'border-outline-variant'
                        }`}
                      >
                        {selected && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span
                        className={`text-lg leading-tight ${
                          selected
                            ? 'font-bold text-on-surface'
                            : 'font-medium text-on-surface'
                        }`}
                      >
                        {c.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <textarea
                className="w-full bg-surface-container-lowest border-none rounded-xl p-6 focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none min-h-[200px]"
                placeholder="Type your answer here..."
                value={answers[q.id]?.text ?? ''}
                onChange={(e) =>
                  setAnswers({
                    ...answers,
                    [q.id]: { text: e.target.value },
                  })
                }
              />
            )}
          </div>

          <div className="lg:col-span-4 sticky top-28 space-y-6">
            <div className="bg-surface-container-low p-6 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Question Map
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {exam.questions.map((qq, i) => {
                  const a = answers[qq.id];
                  const isAnswered =
                    a?.choice != null || (a?.text && a.text.trim());
                  const isCurrent = i === idx;
                  const isFlagged = flags.has(qq.id);
                  return (
                    <button
                      key={qq.id}
                      onClick={() => {
                        setDirection(i > idx ? 1 : -1);
                        setIdx(i);
                      }}
                      className={`relative w-full aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                        isCurrent
                          ? 'bg-primary text-white ring-4 ring-primary/20'
                          : isAnswered
                            ? 'bg-primary/10 text-primary'
                            : 'bg-white border border-outline-variant/30 text-slate-400'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-primary rounded-full" />
                  Current
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-primary/20 rounded-full" />
                  Answered
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                  Flagged
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-white border border-outline-variant rounded-full" />
                  Unread
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSummary(true)}
              className="w-full p-4 bg-on-surface text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">
                checklist
              </span>
              Review & Submit
            </button>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full glass-nav px-8 py-5 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-6">
          <button
            disabled={idx === 0}
            onClick={() => {
              setDirection(-1);
              setIdx(idx - 1);
            }}
            className="px-6 py-3 rounded-xl font-bold text-primary hover:bg-primary/5 transition-all flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Previous
          </button>
          {idx < total - 1 ? (
            <button
              onClick={() => {
                setDirection(1);
                setIdx(idx + 1);
              }}
              className="px-8 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:brightness-110 transition-all"
            >
              Next
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={() => setShowSummary(true)}
              className="px-8 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:brightness-110 transition-all"
            >
              Review & Submit
              <span className="material-symbols-outlined">check</span>
            </button>
          )}
        </div>
      </footer>

      <div className="h-24" />

      <Modal
        open={showSummary}
        onClose={() => setShowSummary(false)}
        title="Review your exam"
        width="max-w-xl"
        footer={
          <>
            <button
              onClick={() => setShowSummary(false)}
              className="px-5 py-2 text-sm font-bold text-secondary"
            >
              Keep editing
            </button>
            <button
              onClick={() => submitExam(false)}
              disabled={submitting}
              className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit final'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-headline font-extrabold text-emerald-700">
              {answeredCount}
            </p>
            <p className="text-xs uppercase tracking-wider text-emerald-700/70 font-bold">
              Answered
            </p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-headline font-extrabold text-amber-700">
              {flags.size}
            </p>
            <p className="text-xs uppercase tracking-wider text-amber-700/70 font-bold">
              Flagged
            </p>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-headline font-extrabold text-rose-700">
              {unansweredCount}
            </p>
            <p className="text-xs uppercase tracking-wider text-rose-700/70 font-bold">
              Skipped
            </p>
          </div>
        </div>
        {unansweredCount > 0 && (
          <p className="text-sm text-amber-800 bg-amber-50 px-4 py-3 rounded-xl mb-3">
            You have {unansweredCount} unanswered question
            {unansweredCount === 1 ? '' : 's'}. Submit anyway?
          </p>
        )}
        <p className="text-sm text-secondary">
          Once submitted, you cannot make further changes.
        </p>
      </Modal>

      <Modal
        open={showExit}
        onClose={() => setShowExit(false)}
        title="Exit exam?"
        footer={
          <>
            <button
              onClick={() => setShowExit(false)}
              className="px-5 py-2 text-sm font-bold text-secondary"
            >
              Stay
            </button>
            <button
              onClick={() => {
                submittedRef.current = true; // suppress beforeunload
                nav('/student/exams');
              }}
              className="px-5 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl"
            >
              Exit without submitting
            </button>
          </>
        }
      >
        <p className="text-sm text-secondary">
          Your progress is auto-saved — you can come back and resume where you
          left off, but the timer will keep running.
        </p>
      </Modal>
    </div>
  );
}
