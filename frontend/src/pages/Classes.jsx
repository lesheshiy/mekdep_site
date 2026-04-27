import { useEffect, useState } from 'react';
import api from '../api';
import EmptyState from '../components/EmptyState.jsx';
import { ListSkeleton } from '../components/Skeleton.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { useSearch } from '../components/SearchContext.jsx';

export default function Classes() {
  const toast = useToast();
  const { query } = useSearch();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [enrollName, setEnrollName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/classes/');
      setClasses(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.post('/classes/', { name });
      setName('');
      toast.success('Class created.');
      load();
    } catch {
      toast.error('Failed to create class.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/classes/${id}/`);
      toast.success('Class removed.');
      load();
    } catch {
      toast.error('Could not delete class.');
    }
  };

  const rename = async () => {
    try {
      await api.patch(`/classes/${editing}/`, { name: editName });
      toast.success('Renamed.');
      setEditing(null);
      load();
    } catch {
      toast.error('Could not rename.');
    }
  };

  const enroll = async (cid) => {
    if (!enrollName.trim()) return;
    try {
      await api.post(`/classes/${cid}/enroll/`, { username: enrollName });
      setEnrollName('');
      toast.success('Student added.');
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not add student.');
    }
  };

  const removeStudent = async (cid, sid) => {
    try {
      await api.post(`/classes/${cid}/remove-student/${sid}/`);
      toast.success('Student removed.');
      load();
    } catch {
      toast.error('Failed.');
    }
  };

  const filtered = classes.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 space-y-10 animate-fade-in">
      <section className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
          Class Roster
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold font-headline text-on-surface tracking-tight">
          Classes
        </h1>
        <p className="text-secondary">Manage your classes and students.</p>
      </section>

      <form
        onSubmit={create}
        className="bg-surface-container-lowest p-6 rounded-2xl shadow-editorial flex gap-3"
      >
        <input
          className="flex-1 bg-surface-container-low border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
          placeholder="New class name (e.g., Physics 101)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          disabled={creating}
          className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
        >
          {creating ? '...' : 'Create'}
        </button>
      </form>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="groups"
          title="No classes yet"
          description="Create your first class to start adding students and assigning exams."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => {
            const isOpen = openId === c.id;
            return (
              <div
                key={c.id}
                className="bg-surface-container-lowest rounded-2xl shadow-editorial overflow-hidden hover-lift"
              >
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 grid place-items-center">
                      <span className="material-symbols-outlined text-primary">
                        groups
                      </span>
                    </div>
                    {editing === c.id ? (
                      <div className="flex gap-2 flex-1">
                        <input
                          autoFocus
                          className="flex-1 bg-surface-container-low rounded-lg p-2 text-sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                        <button
                          onClick={rename}
                          className="px-3 py-1 bg-primary text-white text-sm font-bold rounded-lg"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="px-3 py-1 text-sm font-bold text-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-bold text-on-surface">{c.name}</h3>
                        <p className="text-xs text-secondary">
                          {c.student_count} student
                          {c.student_count === 1 ? '' : 's'}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditing(c.id);
                        setEditName(c.name);
                      }}
                      className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                      title="Rename"
                    >
                      <span className="material-symbols-outlined text-base">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={() => setConfirmDelete(c)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-base">
                        delete
                      </span>
                    </button>
                    <button
                      onClick={() => setOpenId(isOpen ? null : c.id)}
                      className="px-4 py-2 text-xs font-bold text-primary bg-primary/10 rounded-lg"
                    >
                      {isOpen ? 'Hide' : 'Manage'}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-outline-variant/10 p-5 space-y-4 bg-surface-container-low/30 animate-fade-in">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-white rounded-lg p-2 text-sm"
                        placeholder="Add student by username"
                        value={enrollName}
                        onChange={(e) => setEnrollName(e.target.value)}
                      />
                      <button
                        onClick={() => enroll(c.id)}
                        className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg"
                      >
                        Add
                      </button>
                    </div>
                    {c.students.length === 0 ? (
                      <p className="text-sm text-secondary text-center py-4">
                        No students enrolled.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {c.students.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between bg-white rounded-lg px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-bold text-on-surface">
                                {s.username}
                              </p>
                              {s.email && (
                                <p className="text-xs text-secondary">{s.email}</p>
                              )}
                            </div>
                            <button
                              onClick={() => removeStudent(c.id, s.id)}
                              className="text-xs font-bold text-rose-600 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => remove(confirmDelete.id)}
        title="Delete class?"
        message={`"${confirmDelete?.name}" and its exam assignments will be removed. This cannot be undone.`}
        confirmText="Delete"
        destructive
      />
    </div>
  );
}
