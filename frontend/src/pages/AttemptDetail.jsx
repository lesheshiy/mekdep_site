import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useToast } from '../components/Toast.jsx';
import CountUp from '../components/CountUp.jsx';

export default function AttemptDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [grading, setGrading] = useState({});

  const isTeacher = user?.role === 'TEACHER';

  const load = () =>
    api.get(`/attempts/${id}/`).then((r) => {
      setAttempt(r.data);
      const g = {};
      for (const a of r.data.answers) {
        g[a.id] = {
          awarded_points: a.awarded_points ?? 0,
          feedback: a.feedback ?? '',
        };
      }
      setGrading(g);
    });

  useEffect(() => {
    load();
  }, [id]);

  const grade = async (answerId) => {
    try {
      await api.post(`/attempts/${id}/grade-answer/${answerId}/`, grading[answerId]);
      toast.success('Grade saved.');
      load();
    } catch {
      toast.error('Could not save grade.');
    }
  };

  if (!attempt)
    return <div className="p-10 text-secondary">Loading attempt...</div>;

  const score = attempt.score;
  const grade_letter =
    score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F';
  const totalPoints = attempt.answers.reduce(
    (s, a) => s + (a.question_points || 0),
    0
  );
  const earned = attempt.answers.reduce(
    (s, a) => s + (a.awarded_points || 0),
    0
  );

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-10 animate-fade-in">
      <button
        onClick={() => nav(-1)}
        className="text-sm font-bold text-secondary hover:text-primary flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back
      </button>

      <section className="bg-surface-container-lowest rounded-2xl shadow-editorial p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-2">
          <span className="text-xs uppercase tracking-widest text-primary font-bold">
            Result
          </span>
          <h1 className="text-3xl font-headline font-extrabold text-on-surface">
            {attempt.exam_title}
          </h1>
          <p className="text-secondary">
            {isTeacher && (
              <>
                Student: <b>{attempt.student_username}</b> &middot;{' '}
              </>
            )}
            Submitted{' '}
            {attempt.completed_at
              ? new Date(attempt.completed_at).toLocaleString()
              : '—'}
            {attempt.flagged_late && (
              <span className="ml-2 text-rose-600 font-bold">(Late)</span>
            )}
          </p>
        </div>
        <div className="text-center">
          <div className="inline-grid place-items-center w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-primary/5">
            <div>
              <p className="text-4xl font-headline font-black text-primary">
                {score != null ? <CountUp value={score} suffix="%" /> : '—'}
              </p>
              <p className="text-xs uppercase tracking-widest font-bold text-primary/70">
                {score != null ? grade_letter : 'Pending'}
              </p>
            </div>
          </div>
          <p className="text-xs text-secondary mt-2">
            {earned} / {totalPoints} pts
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-headline font-bold text-on-surface">
          Question breakdown
        </h3>
        {attempt.answers.map((a, i) => {
          const correct =
            a.question_type === 'MCQ' &&
            a.selected_choice != null &&
            a.selected_choice === a.correct_choice_id;
          const isText = a.question_type === 'TEXT';
          return (
            <div
              key={a.id}
              className="bg-surface-container-lowest p-6 rounded-2xl shadow-editorial space-y-4 animate-fade-in"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-secondary font-bold mb-1">
                    Question {i + 1} &middot; {a.question_points} pt
                    {a.question_points === 1 ? '' : 's'}
                  </p>
                  <p className="font-bold text-on-surface">{a.question_text}</p>
                </div>
                {!isText && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                      correct
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {correct ? 'Correct' : 'Incorrect'}
                  </span>
                )}
              </div>

              {isText ? (
                <div className="bg-surface-container-low p-4 rounded-xl">
                  <p className="text-xs uppercase tracking-widest text-secondary font-bold mb-1">
                    Your answer
                  </p>
                  <p className="text-sm text-on-surface whitespace-pre-wrap">
                    {a.text_answer || (
                      <span className="text-outline italic">No answer</span>
                    )}
                  </p>
                  {isTeacher ? (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                        Manual grading
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max={a.question_points}
                          step="0.5"
                          value={grading[a.id]?.awarded_points ?? 0}
                          onChange={(e) =>
                            setGrading({
                              ...grading,
                              [a.id]: {
                                ...grading[a.id],
                                awarded_points: Number(e.target.value),
                              },
                            })
                          }
                          className="w-24 bg-white rounded-lg p-2 text-sm"
                          placeholder="Points"
                        />
                        <input
                          value={grading[a.id]?.feedback ?? ''}
                          onChange={(e) =>
                            setGrading({
                              ...grading,
                              [a.id]: {
                                ...grading[a.id],
                                feedback: e.target.value,
                              },
                            })
                          }
                          className="flex-1 bg-white rounded-lg p-2 text-sm"
                          placeholder="Feedback (optional)"
                        />
                        <button
                          onClick={() => grade(a.id)}
                          className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    a.feedback && (
                      <div className="mt-3 pt-3 border-t border-outline-variant/10">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                          Teacher feedback
                        </p>
                        <p className="text-sm text-on-surface italic">
                          {a.feedback}
                        </p>
                      </div>
                    )
                  )}
                  {!isTeacher && a.awarded_points != null && (
                    <p className="text-xs text-secondary mt-2">
                      Awarded: {a.awarded_points} / {a.question_points}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-secondary font-bold">
                    Your answer:{' '}
                    <span
                      className={`normal-case tracking-normal font-medium ${
                        correct ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {a.selected_choice_text || '(no answer)'}
                    </span>
                  </p>
                  {!correct && (
                    <p className="text-xs uppercase tracking-widest text-secondary font-bold">
                      Correct answer:{' '}
                      <span className="normal-case tracking-normal font-medium text-emerald-700">
                        {a.correct_choice_text}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="text-center">
        <Link
          to={isTeacher ? '/teacher/results' : '/student/results'}
          className="text-sm font-bold text-primary hover:underline"
        >
          Back to all results
        </Link>
      </div>
    </div>
  );
}
