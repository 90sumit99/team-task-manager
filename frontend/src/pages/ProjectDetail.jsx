import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { projectsAPI, tasksAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Plus, Users, ArrowLeft, Calendar, MessageSquare, UserPlus, X, Settings } from 'lucide-react';
import { StatusBadge, PriorityBadge, Avatar, Spinner } from '../components/Badges';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

/* ─── Column config ─────────────────────────────────────────── */
const COLUMNS = [
  { id: 'TODO',        label: 'To Do',       dotCls: 'dot-todo' },
  { id: 'IN_PROGRESS', label: 'In Progress',  dotCls: 'dot-progress' },
  { id: 'DONE',        label: 'Done',         dotCls: 'dot-done' },
];

const isOverdue = (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE';

/* ─── Task Card ─────────────────────────────────────────────── */
const TaskCard = ({ task, index, updatingId, currentUserId, isAdmin }) => {
  const overdue = isOverdue(task);
  const isUpdating = updatingId === task.id;
  // Members can only drag their own tasks; admins can drag any
  const canDrag = isAdmin || task.assigneeId === currentUserId;

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!canDrag}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...(canDrag ? provided.dragHandleProps : {})}
          className={`task-card ${overdue ? 'task-card-overdue' : ''} ${snapshot.isDragging ? 'task-card-dragging' : ''}`}
          style={{
            ...provided.draggableProps.style,
            cursor: canDrag ? 'grab' : 'not-allowed',
          }}
        >
          {isUpdating && (
            <div className="absolute inset-0 rounded-lg flex items-center justify-center z-10"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
              <Spinner size="sm" />
            </div>
          )}

          <Link
            to={`/tasks/${task.id}`}
            onClick={(e) => {
              if (snapshot.isDragging || isUpdating) { e.preventDefault(); return; }
              sessionStorage.setItem(`task-${task.id}-projectId`, task.projectId);
            }}
            className="block relative"
          >
            {/* Title */}
            <p className="text-sm font-medium mb-2.5 leading-snug pr-1"
              style={{ color: overdue ? '#fca5a5' : 'var(--text-1)' }}>
              {task.title}
            </p>

            {/* Priority + Overdue badges */}
            <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
              <PriorityBadge priority={task.priority} />
              {overdue && (
                <span className="badge badge-high" style={{ fontSize: '10px' }}>Overdue</span>
              )}
              {!canDrag && (
                <span className="text-xs opacity-40" title="Only the assignee or admin can move this task">🔒</span>
              )}
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between gap-2">
              {task.assignee ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Avatar name={task.assignee.name} size="sm" />
                  <span className="text-xs truncate max-w-[70px]" style={{ color: 'var(--text-3)' }}>
                    {task.assignee.name}
                  </span>
                </div>
              ) : (
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Unassigned</span>
              )}

              <div className="flex items-center gap-2.5 flex-shrink-0">
                {(task._count?.comments ?? 0) > 0 && (
                  <div className="flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                    <MessageSquare size={11} />
                    <span className="text-xs">{task._count.comments}</span>
                  </div>
                )}
                {task.dueDate && (
                  <div className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}
                    style={!overdue ? { color: 'var(--text-3)' } : {}}>
                    <Calendar size={11} />
                    <span className="text-xs">
                      {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>
      )}
    </Draggable>
  );
};

/* ─── Task Form ──────────────────────────────────────────────── */
const TaskForm = ({ projectId, members, defaultStatus, onCreated, onClose }) => {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM',
    assigneeId: '', dueDate: '', status: defaultStatus || 'TODO',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setErrors({ title: 'Title is required' }); return; }
    setLoading(true);
    try {
      const res = await tasksAPI.create(projectId, {
        ...form,
        assigneeId: form.assigneeId || undefined,
        dueDate:    form.dueDate    || undefined,
      });
      onCreated(res.data.data.task);
      toast.success('Task created!');
      onClose();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const m = {};
        apiErrors.forEach(({ field, message }) => { m[field] = message; });
        setErrors(m);
      } else {
        toast.error(err.response?.data?.message || 'Failed to create task');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-group">
        <label className="label">Title *</label>
        <input className={`input ${errors.title ? 'input-error' : ''}`}
          placeholder="Task title" value={form.title}
          onChange={e => set('title', e.target.value)} maxLength={100} autoFocus />
        {errors.title && <p className="field-error">{errors.title}</p>}
      </div>
      <div className="form-group">
        <label className="label">Description</label>
        <textarea className="input resize-none h-20" placeholder="Optional…"
          value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group">
          <label className="label">Priority</label>
          <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label">Assignee</label>
          <select className="input" value={form.assigneeId} onChange={e => set('assigneeId', e.target.value)}>
            <option value="">Unassigned</option>
            {members?.map(m => (
              <option key={m.userId} value={m.userId}>{m.user?.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="label">Due Date</label>
        <input type="date" className="input" value={form.dueDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={e => set('dueDate', e.target.value)} />
        {errors.dueDate && <p className="field-error">{errors.dueDate}</p>}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? <Spinner /> : 'Create Task'}
        </button>
      </div>
    </form>
  );
};

/* ─── Add Member Form ────────────────────────────────────────── */
const AddMemberForm = ({ projectId, onAdded, onClose }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await projectsAPI.addMember(projectId, { email, role });
      toast.success('Member added!');
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-group">
        <label className="label">Email address</label>
        <input type="email" className="input" placeholder="user@example.com"
          value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
      </div>
      <div className="form-group">
        <label className="label">Role</label>
        <select className="input" value={role} onChange={e => setRole(e.target.value)}>
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? <Spinner /> : 'Add Member'}
        </button>
      </div>
    </form>
  );
};

/* ─── Project Detail (Kanban Board) ─────────────────────────── */
const ProjectDetail = () => {
  const { id: projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormStatus, setTaskFormStatus] = useState('TODO');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const myRole = project?.members?.find(m => m.userId === user?.id)?.role
    || (user?.role === 'ADMIN' ? 'ADMIN' : null);
  const isAdmin = myRole === 'ADMIN';

  const loadProject = useCallback(async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        projectsAPI.get(projectId),
        tasksAPI.list(projectId),
      ]);
      setProject(projRes.data.data.project);
      setTasks(tasksRes.data.data.tasks);
    } catch {
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadProject(); }, [loadProject]);

  const handleDragEnd = async ({ draggableId, destination, source }) => {
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const newStatus = destination.droppableId;
    const task = tasks.find(t => t.id === draggableId);
    if (!task || task.status === newStatus) return;

    // Enforce: only admin or assignee can change status via drag
    if (!isAdmin && task.assigneeId !== user?.id) {
      toast.error('You can only move your own tasks');
      return;
    }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t));
    setUpdatingId(draggableId);

    try {
      await tasksAPI.updateStatus(projectId, draggableId, newStatus);
    } catch {
      toast.error('Failed to update status');
      // Revert on error
      setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: task.status } : t));
    } finally {
      setUpdatingId(null);
    }
  };

  const openTaskForm = (status) => { setTaskFormStatus(status); setShowTaskForm(true); };
  const handleTaskCreated = (task) => setTasks(prev => [task, ...prev]);

  const handleRemoveMember = async (uid) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await projectsAPI.removeMember(projectId, uid);
      toast.success('Member removed');
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="md" /></div>;
  }
  if (!project) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--text-3)' }}>Project not found</p>
        <Link to="/projects" className="btn-primary mt-4 inline-flex">Back to Projects</Link>
      </div>
    );
  }

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors hover:underline"
          style={{ color: 'var(--text-3)' }}>
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.description && <p className="page-subtitle mt-1">{project.description}</p>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowMembers(true)} className="btn-secondary">
              <Users size={14} /> {project.members?.length} Members
            </button>
            {isAdmin && (
              <>
                <button onClick={() => setShowAddMember(true)} className="btn-secondary">
                  <UserPlus size={14} /> Add Member
                </button>
                <Link to={`/projects/${projectId}/settings`} className="btn-secondary">
                  <Settings size={14} /> Settings
                </Link>
                <button onClick={() => openTaskForm('TODO')} className="btn-primary" id="create-task-btn">
                  <Plus size={15} /> New Task
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6">
          {COLUMNS.map(col => (
            <div key={col.id} className="kanban-col">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className={col.dotCls} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
                  {col.label}
                </span>
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-md"
                  style={{ background: 'var(--surface-4)', color: 'var(--text-3)' }}>
                  {tasksByStatus[col.id]?.length ?? 0}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => openTaskForm(col.id)}
                    className="ml-auto btn-icon opacity-60 hover:opacity-100"
                    title={`Add task to ${col.label}`}
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>

              {/* Drop zone */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 rounded-lg transition-colors duration-150 min-h-[100px]"
                    style={snapshot.isDraggingOver ? {
                      background: 'var(--accent-subtle)',
                      outline: '2px dashed var(--accent)',
                      outlineOffset: '-2px',
                    } : {}}
                  >
                    {tasksByStatus[col.id]?.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={index}
                        updatingId={updatingId}
                        currentUserId={user?.id}
                        isAdmin={isAdmin}
                      />
                    ))}
                    {provided.placeholder}
                    {tasksByStatus[col.id]?.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-20 text-xs rounded-lg"
                        style={{ color: 'var(--text-3)', border: '1px dashed var(--border)' }}>
                        Drop tasks here
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Task Create Modal */}
      <Modal isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} title="Create Task">
        <TaskForm
          projectId={projectId}
          members={project.members}
          defaultStatus={taskFormStatus}
          onCreated={handleTaskCreated}
          onClose={() => setShowTaskForm(false)}
        />
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member" size="sm">
        <AddMemberForm projectId={projectId} onAdded={loadProject} onClose={() => setShowAddMember(false)} />
      </Modal>

      {/* Members Modal */}
      <Modal isOpen={showMembers} onClose={() => setShowMembers(false)} title={`Members (${project.members?.length})`}>
        <div className="space-y-2">
          {project.members?.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
              <Avatar name={m.user?.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{m.user?.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{m.user?.email}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={m.role === 'ADMIN'
                  ? { background: 'var(--accent-glow)', color: 'var(--accent)' }
                  : { background: 'var(--surface-4)', color: 'var(--text-3)' }}>
                {m.role}
              </span>
              {isAdmin && m.userId !== user?.id && (
                <button onClick={() => handleRemoveMember(m.userId)}
                  className="btn-icon text-red-400 hover:bg-red-500/10">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default ProjectDetail;
