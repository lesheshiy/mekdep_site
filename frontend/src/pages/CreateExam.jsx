import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';

const blankMcq = () => ({
  text: '',
  type: 'MCQ',
  points: 1,
  choices: [
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ],
});

export default function CreateExam() {
  const nav = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const editing = Boolean(id);

  const [classes, setClasses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    timer_minutes: 60,
    retake_limit: 1,
    is_published: true,
    assigned_to: '',
    questions: [blankMcq()],
  });

  useEffect(() => {
    api.get('/classes/').then((r) => setClasses(r.data));
    if (editing) {
      api.get(`/exams/${id}/`).then((r) => {
        const e = r.data;
        setForm({
          title: e.title,
          description: e.description || '',
          timer_minutes: e.timer_minutes,
          retake_limit: e.retake_limit,
          is_published: e.is_published ?? true,
          assigned_to: e.assigned_to,
          questions: (e.questions || []).map((q) => ({
            text: q.text,
            type: q.type,
            points: q.points || 1,
            choices: q.choices || [],
          })),
        });
      });
    }
  }, [id, editing]);

  const updateQ = (i, patch) => {
    const qs = [...form.questions];
    qs[i] = { ...qs[i], ...patch };
    setForm({ ...form, questions: qs });
  };
  const removeQ = (i) =>
    setForm({
      ...form,
      questions: form.questions.filter((_, idx) => idx !== i),
    });
  const moveQ = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= form.questions.length) return;
    const qs = [...form.questions];
    [qs[i], qs[j]] = [qs[j], qs[i]];
    setForm({ ...form, questions: qs });
  };
  const updateChoice = (qi, ci, patch) => {
    const qs = [...form.questions];
    const cs = [...qs[qi].choices];
    cs[ci] = { ...cs[ci], ...patch };
    qs[qi] = { ...qs[qi], choices: cs };
    setForm({ ...form, questions: qs });
  };
  const removeChoice = (qi, ci) => {
    const qs = [...form.questions];
    qs[qi] = {
      ...qs[qi],
      choices: qs[qi].choices.filter((_, idx) => idx !== ci),
    };
    setForm({ ...form, questions: qs });
  };
  const addQuestion = () =>
    setForm({ ...form, questions: [...form.questions, blankMcq()] });
  const addChoice = (qi) => {
    const qs = [...form.questions];
    qs[qi] = {
      ...qs[qi],
      choices: [...qs[qi].choices, { text: '', is_correct: false }],
    };
    setForm({ ...form, questions: qs });
  };

  const validateForm = () => {
    if (!form.title.trim()) return 'Please give your exam a title.';
    if (!form.assigned_to) return 'Please select a class for this exam.';
    if (form.questions.length === 0) return 'Add at least one question.';
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i];
      if (!q.text.trim()) return `Question ${i + 1} is missing its prompt.`;
      if (q.type === 'MCQ') {
        if (q.choices.length < 2)
          return `Question ${i + 1} needs at least two options.`;
        if (q.choices.some((c) => !c.text.trim()))
          return `Question ${i + 1} has an empty option.`;
        if (!q.choices.some((c) => c.is_correct))
          return `Question ${i + 1} needs at least one correct option.`;
      }
    }
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        questions: form.questions.map((q, i) => ({ ...q, order: i })),
      };
      if (editing) {
        await api.put(`/exams/${id}/`, payload);
        toast.success('Exam saved.');
      } else {
        await api.post('/exams/', payload);
        toast.success('Exam published.');
      }
      nav('/teacher/exams');
    } catch (e2) {
      const detail =
        e2.response?.data?.detail ||
        JSON.stringify(e2.response?.data || {}) ||
        'Failed to publish exam.';
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  };

  const createClass = async () => {
    const name = newClassName.trim();
    if (!name) return;
    setCreatingClass(true);
    try {
      const { data } = await api.post('/classes/', { name });
      setClasses((prev) => [...prev, data]);
      setForm((f) => ({ ...f, assigned_to: data.id }));
      setNewClassName('');
      toast.success('Class created.');
    } catch {
      toast.error('Could not create class.');
    } finally {
      setCreatingClass(false);
    }
  };

  const importQuestions = () => {
    try {
      const arr = JSON.parse(importText);
      if (!Array.isArray(arr)) throw new Error('Expected an array');
      const cleaned = arr.map((q) => ({
        text: q.text || q.question || '',
        type: q.type || 'MCQ',
        points: q.points || 1,
        choices: (q.choices || []).map((c) => ({
          text: c.text || '',
          is_correct: !!c.is_correct,
        })),
      }));
      setForm({ ...form, questions: [...form.questions, ...cleaned] });
      setImportText('');
      setShowImport(false);
      toast.success(`Imported ${cleaned.length} question${cleaned.length === 1 ? '' : 's'}.`);
    } catch (e) {
      toast.error('Invalid JSON.');
    }
  };

  const totalQuestions = form.questions.length;
  const totalPoints = form.questions.reduce(
    (s, q) => s + (Number(q.points) || 0),
    0
  );
  const letterForIndex = (i) => String.fromCharCode(65 + i);

  const generalDone =
    form.title.trim() && form.assigned_to && form.timer_minutes > 0;
  const questionsDone =
    generalDone &&
    form.questions.length > 0 &&
    form.questions.every(
      (q) =>
        q.text.trim() &&
        (q.type !== 'MCQ' ||
          (q.choices.length >= 2 &&
            q.choices.every((c) => c.text.trim()) &&
            q.choices.some((c) => c.is_correct)))
    );
  const step = questionsDone ? 3 : generalDone ? 2 : 1;

  return (
    <form
      onSubmit={submit}
      className="max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-8 p-6 md:p-8 animate-fade-in"
    >
      <div className="flex-1 space-y-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-secondary">
            <button
              type="button"
              onClick={() => nav('/teacher/exams')}
              className="hover:text-primary transition-colors"
            >
              Exams
            </button>
            <span className="material-symbols-outlined text-[12px]">
              chevron_right
            </span>
            <span className="text-primary font-semibold">
              {editing ? 'Edit' : 'New Draft'}
            </span>
          </div>
          <h1 className="text-3xl font-headline font-extrabold text-on-surface">
            {editing ? 'Edit Examination' : 'Curate New Examination'}
          </h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((n, i, arr) => (
            <Fragment key={n}>
              <div
                className={`flex items-center gap-3 ${step < n ? 'opacity-40' : ''}`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step >= n
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-highest text-on-surface-variant'
                  }`}
                >
                  {n}
                </span>
                <span className="text-sm font-semibold text-on-surface">
                  {n === 1 ? 'General Info' : n === 2 ? 'Questions' : 'Ready'}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div
                  className={`h-[2px] w-12 ${step > n ? 'bg-primary' : 'bg-surface-container-highest'}`}
                />
              )}
            </Fragment>
          ))}
        </div>

        <section className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                Exam Title
              </label>
              <input
                className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20"
                placeholder="e.g., Advanced Macroeconomics: Mid-Term"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                Duration (Minutes)
              </label>
              <input
                className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20"
                type="number"
                min="1"
                value={form.timer_minutes}
                onChange={(e) =>
                  setForm({ ...form, timer_minutes: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                Retake Limit
              </label>
              <input
                className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20"
                type="number"
                min="1"
                value={form.retake_limit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    retake_limit: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                Assigned Class
              </label>
              <select
                className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20"
                value={form.assigned_to}
                onChange={(e) =>
                  setForm({ ...form, assigned_to: Number(e.target.value) })
                }
                required
              >
                <option value="">Select a class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 pt-1">
                <input
                  className="flex-1 bg-surface-container-low rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                  placeholder="Or create a new class..."
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                />
                <button
                  type="button"
                  onClick={createClass}
                  disabled={creatingClass || !newClassName.trim()}
                  className="px-4 py-2 text-xs font-bold text-primary bg-primary/10 rounded-lg disabled:opacity-50"
                >
                  {creatingClass ? '...' : 'Add'}
                </button>
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                Description
              </label>
              <textarea
                rows="2"
                className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Brief description (optional)"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) =>
                    setForm({ ...form, is_published: e.target.checked })
                  }
                  className="rounded text-primary focus:ring-primary/40"
                />
                <span className="font-medium text-on-surface">
                  Publish immediately (otherwise saved as draft)
                </span>
              </label>
            </div>
          </div>

          {/* Question types */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-headline font-bold text-on-surface">
                Add Questions
              </h3>
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">upload</span>
                Bulk Import
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={addQuestion}
                className="group p-6 bg-surface-container-lowest hover:bg-primary transition-all rounded-xl text-left hover-lift"
              >
                <span className="material-symbols-outlined text-primary group-hover:text-white mb-4 block">
                  checklist
                </span>
                <div className="font-bold text-on-surface group-hover:text-white">
                  Multiple Choice
                </div>
                <div className="text-xs text-on-surface-variant group-hover:text-white/80 mt-1">
                  Single or multiple answers
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    questions: [
                      ...form.questions,
                      {
                        text: '',
                        type: 'MCQ',
                        points: 1,
                        choices: [
                          { text: 'True', is_correct: true },
                          { text: 'False', is_correct: false },
                        ],
                      },
                    ],
                  })
                }
                className="group p-6 bg-surface-container-lowest hover:bg-primary transition-all rounded-xl text-left hover-lift"
              >
                <span className="material-symbols-outlined text-primary group-hover:text-white mb-4 block">
                  rule
                </span>
                <div className="font-bold text-on-surface group-hover:text-white">
                  True / False
                </div>
                <div className="text-xs text-on-surface-variant group-hover:text-white/80 mt-1">
                  Binary logic
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    questions: [
                      ...form.questions,
                      { text: '', type: 'TEXT', points: 1, choices: [] },
                    ],
                  })
                }
                className="group p-6 bg-surface-container-lowest hover:bg-primary transition-all rounded-xl text-left hover-lift"
              >
                <span className="material-symbols-outlined text-primary group-hover:text-white mb-4 block">
                  subject
                </span>
                <div className="font-bold text-on-surface group-hover:text-white">
                  Text Response
                </div>
                <div className="text-xs text-on-surface-variant group-hover:text-white/80 mt-1">
                  Manual grading
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {form.questions.map((q, qi) => (
              <div
                key={qi}
                className="bg-surface-container-low p-8 rounded-xl space-y-6 animate-fade-in"
              >
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-headline font-black text-primary/10">
                    {String(qi + 1).padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveQ(qi, -1)}
                      disabled={qi === 0}
                      className="p-2 text-outline hover:text-primary disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined text-base">
                        arrow_upward
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQ(qi, 1)}
                      disabled={qi === form.questions.length - 1}
                      className="p-2 text-outline hover:text-primary disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined text-base">
                        arrow_downward
                      </span>
                    </button>
                    {form.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQ(qi)}
                        className="p-2 text-outline hover:text-rose-500"
                      >
                        <span className="material-symbols-outlined">
                          delete
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => updateQ(qi, { type: 'MCQ' })}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        q.type === 'MCQ'
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-lowest text-secondary'
                      }`}
                    >
                      MCQ
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQ(qi, { type: 'TEXT' })}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        q.type === 'TEXT'
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-lowest text-secondary'
                      }`}
                    >
                      Text
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                        Points
                      </span>
                      <input
                        type="number"
                        min="1"
                        className="w-16 bg-surface-container-lowest rounded-lg p-2 text-sm text-center"
                        value={q.points}
                        onChange={(e) =>
                          updateQ(qi, {
                            points: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                    </div>
                  </div>

                  <textarea
                    className="w-full bg-surface-container-lowest border-none rounded-xl p-6 focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none min-h-[100px]"
                    placeholder="Type your question here..."
                    value={q.text}
                    onChange={(e) => updateQ(qi, { text: e.target.value })}
                    required
                  />

                  {q.type === 'MCQ' && (
                    <div className="space-y-3">
                      {q.choices.map((c, ci) => (
                        <div key={ci} className="flex items-center gap-4 group">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors ${
                              c.is_correct
                                ? 'border-primary bg-primary text-white'
                                : 'border-outline-variant text-outline group-hover:border-primary'
                            }`}
                            onClick={() =>
                              updateChoice(qi, ci, {
                                is_correct: !c.is_correct,
                              })
                            }
                          >
                            {letterForIndex(ci)}
                          </div>
                          <input
                            className="flex-1 bg-surface-container-lowest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/10"
                            placeholder={`Option ${letterForIndex(ci)}...`}
                            value={c.text}
                            onChange={(e) =>
                              updateChoice(qi, ci, { text: e.target.value })
                            }
                          />
                          {q.choices.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeChoice(qi, ci)}
                              className="p-2 text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <span className="material-symbols-outlined text-sm">
                                close
                              </span>
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addChoice(qi)}
                        className="text-primary text-xs font-bold flex items-center gap-2 mt-2 hover:opacity-70 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-sm">
                          add_circle
                        </span>
                        ADD OPTION
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addQuestion}
            className="w-full py-4 border-2 border-dashed border-outline-variant/30 rounded-xl text-sm font-bold text-secondary hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Another Question
          </button>

          <div className="pt-8 border-t border-outline-variant/10 flex justify-between">
            <button
              type="button"
              onClick={() => nav('/teacher/exams')}
              className="px-8 py-3 text-secondary font-bold hover:bg-surface-container-high rounded-xl transition-all"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-10 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {saving
                ? editing
                  ? 'SAVING...'
                  : 'PUBLISHING...'
                : editing
                  ? 'SAVE CHANGES'
                  : form.is_published
                    ? 'PUBLISH EXAM'
                    : 'SAVE DRAFT'}
            </button>
          </div>
        </section>
      </div>

      <aside className="w-full lg:w-[400px]">
        <div className="sticky top-24 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-8 shadow-editorial">
            <h2 className="text-xs uppercase tracking-widest text-outline-variant font-black mb-1">
              Live Preview
            </h2>
            <p className="text-lg font-headline font-bold text-on-surface mb-6">
              Student View
            </p>

            <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant mb-4">
              <span>Question 1 of {totalQuestions}</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">timer</span>
                {form.timer_minutes}:00
              </span>
            </div>

            <h4 className="text-sm font-headline font-bold text-on-surface mb-4">
              {form.questions[0]?.text || 'Your question will appear here...'}
            </h4>
            <div className="space-y-3">
              {form.questions[0]?.type === 'MCQ' ? (
                form.questions[0]?.choices.map((c, i) => (
                  <div
                    key={i}
                    className="p-4 bg-surface-container-low rounded-xl text-xs font-medium"
                  >
                    {c.text || `Option ${letterForIndex(i)}`}
                  </div>
                ))
              ) : (
                <div className="p-4 bg-surface-container-low rounded-xl text-xs text-outline-variant italic">
                  Text answer field will appear here
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50/50 p-6 rounded-2xl">
              <div className="text-[10px] font-black text-blue-900/40 uppercase mb-2">
                Questions
              </div>
              <div className="text-xl font-headline font-extrabold text-blue-900">
                {totalQuestions}
              </div>
            </div>
            <div className="bg-slate-100/50 p-6 rounded-2xl">
              <div className="text-[10px] font-black text-slate-900/40 uppercase mb-2">
                Total Points
              </div>
              <div className="text-xl font-headline font-extrabold text-slate-900">
                {totalPoints}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <Modal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Bulk Import Questions"
        width="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowImport(false)}
              className="px-5 py-2 text-sm font-bold text-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={importQuestions}
              className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl"
            >
              Import
            </button>
          </>
        }
      >
        <p className="text-sm text-secondary mb-3">
          Paste a JSON array of questions. Each question must include{' '}
          <code className="bg-slate-100 px-1 rounded">text</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">type</code>, optional{' '}
          <code className="bg-slate-100 px-1 rounded">points</code>, and for MCQ
          a <code className="bg-slate-100 px-1 rounded">choices</code> array.
        </p>
        <textarea
          rows="10"
          className="w-full bg-slate-50 rounded-xl p-3 text-sm font-mono"
          placeholder='[{"text":"2 + 2 = ?","type":"MCQ","points":1,"choices":[{"text":"3"},{"text":"4","is_correct":true}]}]'
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
      </Modal>
    </form>
  );
}
