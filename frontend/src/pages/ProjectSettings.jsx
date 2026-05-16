import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save, Trash2, X, UserPlus, Shield, User } from 'lucide-react';
import { Avatar, Spinner } from '../components/Badges';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const ProjectSettings = () => {
  const { id: projectId } = useParams();
  const { user }          = useAuth();
  const navigate          = useNavigate();

  const [project, setProject]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [confirmName, setConfirmName] = useState('');

  const [form, setForm] = useState({ name: '', description: '' });
  const [addEmail, setAddEmail]   = useState('');
  const [addRole, setAddRole]     = useState('MEMBER');
  const [addingMember, setAddingMember] = useState(false);
  const [memberErrors, setMemberErrors] = useState({});

  const load = useCallback(async () => {
    try {
      const r = await projectsAPI.get(projectId);
      const p = r.data.data.project;
      setProject(p);
      setForm({ name: p.name, description: p.description || '' });
    } catch {
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const myRole = project?.members?.find(m => m.userId === user?.id)?.role;
  const isAdmin = myRole === 'ADMIN' || user?.role === 'ADMIN';

  /* ─ Save info ─ */
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await projectsAPI.update(projectId, form);
      toast.success('Project updated!');
      setProject(p => ({ ...p, ...form }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  /* ─ Delete project ─ */
  const handleDelete = async () => {
    if (confirmName !== project?.name) {
      toast.error('Project name does not match');
      return;
    }
    setDeleting(true);
    try {
      await projectsAPI.delete(projectId);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  /* ─ Add member ─ */
  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberErrors({});
    if (!addEmail.trim()) { setMemberErrors({ email: 'Email is required' }); return; }
    setAddingMember(true);
    try {
      await projectsAPI.addMember(projectId, { email: addEmail.trim(), role: addRole });
      toast.success('Member added!');
      setAddEmail('');
      setAddRole('MEMBER');
      load();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add member';
      setMemberErrors({ email: msg });
    } finally {
      setAddingMember(false);
    }
  };

  /* ─ Remove member ─ */
  const handleRemoveMember = async (uid, name) => {
    if (!window.confirm(`Remove ${name} from this project?`)) return;
    try {
      await projectsAPI.removeMember(projectId, uid);
      toast.success('Member removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  /* ─ Toggle role ─ */
  const handleToggleRole = async (uid, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    try {
      await projectsAPI.changeRole(projectId, uid, newRole);
      toast.success(`Role changed to ${newRole}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change role');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="md" /></div>;
  if (!project) return (
    <div className="text-center py-20">
      <Link to="/projects" className="btn-primary inline-flex">Back to Projects</Link>
    </div>
  );

  return (
    <div className="animate-fade-in max-w-2xl">
      {/* Header */}
      <Link to={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 text-sm mb-5 hover:underline"
        style={{ color: 'var(--text-3)' }}>
        <ArrowLeft size={14} /> Back to {project.name}
      </Link>

      <h1 className="page-title mb-6">Project Settings</h1>

      {/* ─ Section 1: Project Info ─ */}
      <div className="card p-6 mb-4">
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-1)' }}>Project Information</h2>
        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div className="form-group">
            <label className="label">Project Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              maxLength={80}
              placeholder="Project name"
              disabled={!isAdmin}
            />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea
              className="input resize-none h-20"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What is this project about?"
              disabled={!isAdmin}
            />
          </div>
          {isAdmin && (
            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Spinner /> : <><Save size={14} /> Save Changes</>}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ─ Section 2: Members ─ */}
      <div className="card p-6 mb-4">
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-1)' }}>
          Members ({project.members?.length})
        </h2>

        {/* Add member form (Admin only) */}
        {isAdmin && (
          <form onSubmit={handleAddMember} className="flex gap-2 mb-5">
            <div className="flex-1 min-w-0">
              <input
                type="email"
                className={`input ${memberErrors.email ? 'input-error' : ''}`}
                placeholder="Add member by email…"
                value={addEmail}
                onChange={e => { setAddEmail(e.target.value); setMemberErrors({}); }}
              />
              {memberErrors.email && <p className="field-error">{memberErrors.email}</p>}
            </div>
            <select className="input w-28 flex-shrink-0" value={addRole} onChange={e => setAddRole(e.target.value)}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button type="submit" disabled={addingMember} className="btn-primary flex-shrink-0">
              {addingMember ? <Spinner /> : <><UserPlus size={14} /> Add</>}
            </button>
          </form>
        )}

        {/* Member list */}
        <div className="space-y-2">
          {project.members?.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
              <Avatar name={m.user?.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                  {m.user?.name}
                  {m.userId === user?.id && (
                    <span className="ml-1.5 text-xs" style={{ color: 'var(--text-3)' }}>(you)</span>
                  )}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{m.user?.email}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Role badge */}
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={m.role === 'ADMIN'
                    ? { background: 'var(--accent-glow)', color: 'var(--accent)' }
                    : { background: 'var(--surface-4)', color: 'var(--text-3)' }}>
                  {m.role === 'ADMIN' ? <span className="flex items-center gap-1"><Shield size={10} /> Admin</span> : <span className="flex items-center gap-1"><User size={10} /> Member</span>}
                </span>

                {/* Admin actions */}
                {isAdmin && m.userId !== user?.id && (
                  <>
                    <button
                      onClick={() => handleToggleRole(m.userId, m.role)}
                      className="btn-secondary text-xs py-1 px-2"
                      title={`Change to ${m.role === 'ADMIN' ? 'Member' : 'Admin'}`}
                    >
                      {m.role === 'ADMIN' ? 'Make Member' : 'Make Admin'}
                    </button>
                    <button
                      onClick={() => handleRemoveMember(m.userId, m.user?.name)}
                      className="btn-icon text-red-400 hover:bg-red-500/10"
                      title="Remove member"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─ Danger Zone ─ */}
      {isAdmin && (
        <div className="card p-6 border-red-500/30">
          <h2 className="font-semibold text-sm mb-1 text-red-400">Danger Zone</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
            Deleting this project is permanent and will remove all tasks, comments, and member associations.
          </p>
          <button onClick={() => setShowDelete(true)} className="btn-danger">
            <Trash2 size={14} /> Delete Project
          </button>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Project" size="sm">
        <p className="text-sm mb-2" style={{ color: 'var(--text-2)' }}>
          This will permanently delete <strong style={{ color: 'var(--text-1)' }}>{project.name}</strong> and all its tasks.
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
          Type the project name to confirm:
        </p>
        <input
          className="input mb-4"
          placeholder={project.name}
          value={confirmName}
          onChange={e => setConfirmName(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={() => { setShowDelete(false); setConfirmName(''); }} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || confirmName !== project.name}
            className="btn-danger flex-1 justify-center"
          >
            {deleting ? <Spinner /> : 'Delete Project'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectSettings;
