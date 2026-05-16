import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tasksAPI, commentsAPI, projectsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Calendar, MessageSquare, Trash2, Send,
  AlertCircle, User, Flag, Clock, Edit2, Check, X, FolderKanban
} from 'lucide-react';
import { StatusBadge, PriorityBadge, Avatar, Spinner } from '../components/Badges';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

/* ─── Inline editable text ──────────────────────────────────── */
const InlineEdit = ({ value, onSave, multiline, className, disabled }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // If disabled, just render the value as plain text
  if (disabled) {
    return (
      <div className={className}>
        <span className="flex-1">{value || <span style={{ color: 'var(--text-3)' }}>Not set</span>}</span>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className={`group flex items-start gap-2 cursor-pointer ${className}`}
        onClick={() => { setDraft(value); setEditing(true); }}>
        <span className="flex-1">{value || <span style={{ color: 'var(--text-3)' }}>Click to add…</span>}</span>
        <Edit2 size={13} className="opacity-0 group-hover:opacity-60 flex-shrink-0 mt-1"
          style={{ color: 'var(--text-3)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {multiline ? (
        <textarea
          className="input w-full resize-none"
          style={{ minHeight: '80px' }}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          autoFocus
        />
      ) : (
        <input className="input" value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus />
      )}
      <div className="flex gap-2">
        <button onClick={commit} disabled={saving} className="btn-primary py-1 px-3 text-xs">
          {saving ? <Spinner /> : <><Check size={12} /> Save</>}
        </button>
        <button onClick={() => setEditing(false)} className="btn-secondary py-1 px-3 text-xs">
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
};

/* ─── Task Detail Page ──────────────────────────────────────── */
const TaskDetail = () => {
  const { id: taskId } = useParams();
  const { user }       = useAuth();
  const navigate       = useNavigate();
  const [task, setTask]         = useState(null);
  const [members, setMembers]   = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [commentText, setCommentText]         = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const projectId = task?.projectId;

  /* ─ Load ─ */
  const load = useCallback(async () => {
    const pid = sessionStorage.getItem(`task-${taskId}-projectId`);
    if (!pid) { setLoading(false); return; }
    try {
      const [taskRes, projRes] = await Promise.all([
        tasksAPI.get(pid, taskId),
        projectsAPI.get(pid),
      ]);
      const t = taskRes.data.data.task;
      setTask({ ...t, projectId: pid });
      setComments(t.comments || []);
      setMembers(projRes.data.data.project?.members || []);
    } catch {
      toast.error('Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  /* ─ Role checks ─ */
  const myProjectRole = members.find(m => m.userId === user?.id)?.role
    || (user?.role === 'ADMIN' ? 'ADMIN' : null);
  const isProjectAdmin = myProjectRole === 'ADMIN';
  const isAssignee = task?.assigneeId === user?.id;
  // Members can ONLY update status of their own task
  const canEditStatus = isProjectAdmin || isAssignee;
  // Only admins can edit title, description, priority, due date, assignee
  const canEditDetails = isProjectAdmin;
  // Only admins can delete task
  const canDelete = isProjectAdmin;

  /* ─ Update helpers ─ */
  const patchTask = async (data) => {
    const res = await tasksAPI.update(projectId, taskId, data);
    setTask(prev => ({ ...res.data.data.task, projectId: prev.projectId }));
  };

  const handleStatusChange = async (e) => {
    if (!canEditStatus) return;
    try {
      const res = await tasksAPI.updateStatus(projectId, taskId, e.target.value);
      setTask(prev => ({ ...prev, status: res.data.data.task.status }));
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
  };

  const handlePriorityChange = async (e) => {
    if (!canEditDetails) return;
    try {
      await patchTask({ priority: e.target.value });
      toast.success('Priority updated');
    } catch { toast.error('Failed to update priority'); }
  };

  const handleAssigneeChange = async (e) => {
    if (!canEditDetails) return;
    try {
      await patchTask({ assigneeId: e.target.value || null });
      toast.success('Assignee updated');
    } catch { toast.error('Failed to update assignee'); }
  };

  const handleDueDateChange = async (e) => {
    if (!canEditDetails) return;
    try {
      await patchTask({ dueDate: e.target.value || null });
      toast.success('Due date updated');
    } catch { toast.error('Failed to update due date'); }
  };

  /* ─ Comments ─ */
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await commentsAPI.add(taskId, { content: commentText.trim() });
      setComments(prev => [...prev, res.data.data.comment]);
      setCommentText('');
      toast.success('Comment added');
    } catch { toast.error('Failed to add comment'); } finally { setSubmittingComment(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentsAPI.delete(taskId, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Comment deleted');
    } catch { toast.error('Failed to delete comment'); }
  };

  /* ─ Delete task ─ */
  const handleDelete = async () => {
    try {
      await tasksAPI.delete(projectId, taskId);
      toast.success('Task deleted');
      navigate(`/projects/${projectId}`);
    } catch { toast.error('Failed to delete task'); }
  };

  /* ─ States ─ */
  const isOverdue = task?.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  const timeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="md" /></div>;
  if (!task) return (
    <div className="text-center py-20">
      <p style={{ color: 'var(--text-3)' }}>Task not found. Navigate from a project board.</p>
      <Link to="/projects" className="btn-primary mt-4 inline-flex">Go to Projects</Link>
    </div>
  );

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Back link */}
      <Link to={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 text-sm mb-5 hover:underline"
        style={{ color: 'var(--text-3)' }}>
        <ArrowLeft size={14} /> Back to {task.project?.name}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left Panel (70%) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Title + description */}
          <div className="card p-6">
            {isOverdue && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs mb-3">
                <AlertCircle size={12} />Overdue task
              </div>
            )}

            <h1 className="text-lg font-semibold mb-1 leading-snug" style={{ color: 'var(--text-1)' }}>
              <InlineEdit
                value={task.title}
                onSave={(v) => patchTask({ title: v })}
                className="text-lg font-semibold"
                disabled={!canEditDetails}
              />
            </h1>

            <div className="flex items-center gap-2 flex-wrap mt-3 mb-4">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
            </div>

            <div className="divider" />

            <div>
              <p className="label mb-2">Description</p>
              {canEditDetails ? (
                <InlineEdit
                  value={task.description || ''}
                  onSave={(v) => patchTask({ description: v })}
                  multiline
                  className="text-sm"
                  disabled={false}
                />
              ) : (
                task.description
                  ? <p className="text-sm" style={{ color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{task.description}</p>
                  : <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>No description</p>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={15} style={{ color: 'var(--accent)' }} />
              <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                Comments ({comments.length})
              </p>
            </div>

            <div className="space-y-4 mb-5 max-h-72 overflow-y-auto pr-1">
              {comments.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>
                  No comments yet. Be the first!
                </p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.author?.name} size="sm" className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-1)' }}>{c.author?.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{timeAgo(c.createdAt)}</span>
                        {/* Can delete own comment, or project admin can delete any */}
                        {(c.authorId === user?.id || isProjectAdmin) && (
                          <button onClick={() => handleDeleteComment(c.id)} className="btn-icon text-red-400">
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm p-3 rounded-lg leading-relaxed" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
                      {c.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-3">
              <Avatar name={user?.name} size="sm" className="mt-2" />
              <div className="flex-1 flex gap-2">
                <input
                  className="input flex-1 text-sm"
                  placeholder="Write a comment…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                />
                <button type="submit" disabled={submittingComment || !commentText.trim()} className="btn-primary px-3">
                  {submittingComment ? <Spinner /> : <Send size={14} />}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Right Panel (30%) ── */}
        <div className="space-y-3">
          {/* Quick actions */}
          <div className="card p-4 space-y-4">
            <p className="section-title">Properties</p>

            {/* Status — editable by assignee or admin */}
            <div>
              <label className="label">Status</label>
              {canEditStatus ? (
                <select className="input" value={task.status} onChange={handleStatusChange}>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              ) : (
                <div className="input flex items-center" style={{ cursor: 'not-allowed', opacity: 0.7 }}>
                  <StatusBadge status={task.status} />
                </div>
              )}
            </div>

            {/* Priority — admin only */}
            <div>
              <label className="label">Priority {!canEditDetails && <span className="text-xs text-amber-500 ml-1">(read-only)</span>}</label>
              {canEditDetails ? (
                <select className="input" value={task.priority} onChange={handlePriorityChange}>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              ) : (
                <div className="input flex items-center" style={{ cursor: 'not-allowed', opacity: 0.7 }}>
                  <PriorityBadge priority={task.priority} />
                </div>
              )}
            </div>

            {/* Assignee — admin only */}
            <div>
              <label className="label">Assignee {!canEditDetails && <span className="text-xs text-amber-500 ml-1">(read-only)</span>}</label>
              {canEditDetails ? (
                <select className="input" value={task.assigneeId || ''} onChange={handleAssigneeChange}>
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.userId} value={m.userId}>{m.user?.name}</option>
                  ))}
                </select>
              ) : (
                <div className="input" style={{ cursor: 'not-allowed', opacity: 0.7 }}>
                  {task.assignee ? task.assignee.name : 'Unassigned'}
                </div>
              )}
            </div>

            {/* Due date — admin only */}
            <div>
              <label className="label">Due Date {!canEditDetails && <span className="text-xs text-amber-500 ml-1">(read-only)</span>}</label>
              {canEditDetails ? (
                <>
                  <input
                    type="date"
                    className={`input ${isOverdue ? 'input-error' : ''}`}
                    value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                    onChange={handleDueDateChange}
                  />
                  {isOverdue && <p className="text-xs text-red-400 mt-1">This task is overdue</p>}
                </>
              ) : (
                <div className={`input ${isOverdue ? 'border-red-500/50' : ''}`} style={{ cursor: 'not-allowed', opacity: 0.7 }}>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'No due date'}
                  {isOverdue && <span className="ml-2 text-red-400 text-xs">Overdue</span>}
                </div>
              )}
            </div>
          </div>

          {/* Meta info */}
          <div className="card p-4 space-y-3">
            <p className="section-title">Details</p>

            <div className="flex items-center gap-2.5">
              <User size={13} style={{ color: 'var(--text-3)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Assignee</p>
                {task.assignee ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Avatar name={task.assignee.name} size="sm" />
                    <span className="text-xs" style={{ color: 'var(--text-1)' }}>{task.assignee.name}</span>
                  </div>
                ) : <span className="text-xs" style={{ color: 'var(--text-3)' }}>Unassigned</span>}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Clock size={13} style={{ color: 'var(--text-3)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Updated</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-1)' }}>
                  {new Date(task.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Calendar size={13} style={{ color: 'var(--text-3)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Created</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-1)' }}>
                  {new Date(task.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <FolderKanban size={13} style={{ color: 'var(--text-3)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Project</p>
                <Link to={`/projects/${projectId}`}
                  className="text-xs mt-0.5 hover:underline"
                  style={{ color: 'var(--accent)' }}>
                  {task.project?.name}
                </Link>
              </div>
            </div>

            {/* Role badge */}
            <div className="pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                Your role: <span style={{ color: 'var(--accent)' }}>
                  {isProjectAdmin ? 'Project Admin' : isAssignee ? 'Assignee' : 'Member'}
                </span>
              </p>
            </div>
          </div>

          {/* Danger zone — admin only */}
          {canDelete && (
            <div className="card p-4">
              <p className="section-title mb-3">Danger Zone</p>
              <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger w-full justify-center">
                <Trash2 size={14} /> Delete Task
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Task" size="sm">
        <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-1)' }}>"{task.title}"</strong>?
          This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDelete} className="btn-danger flex-1 justify-center">Delete</button>
        </div>
      </Modal>
    </div>
  );
};

export default TaskDetail;
