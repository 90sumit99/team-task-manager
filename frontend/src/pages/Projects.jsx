import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../api';
import { Plus, FolderKanban, Users, CheckSquare, ChevronRight, Trash2, Edit3 } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ProjectCard = ({ project, onDelete }) => {
  const { user } = useAuth();
  const myMembership = project.members?.find((m) => m.userId === user?.id);
  const isAdmin = myMembership?.role === 'ADMIN' || user?.role === 'ADMIN';

  const taskCount = project._count?.tasks ?? 0;
  const memberCount = project.members?.length ?? 0;

  return (
    <div className="card-hover p-6 flex flex-col gap-4 animate-fade-in group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-600/20 border border-primary-500/20 flex items-center justify-center">
              <FolderKanban size={16} className="text-primary-400" />
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              isAdmin
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/20'
                : 'bg-dark-700 text-dark-400'
            }`}>
              {isAdmin ? 'Admin' : 'Member'}
            </span>
          </div>
          <h3 className="font-semibold text-white text-lg truncate">{project.name}</h3>
          {project.description && (
            <p className="text-dark-400 text-sm mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-dark-500">
        <div className="flex items-center gap-1.5">
          <CheckSquare size={14} />
          <span>{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={14} />
          <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Member avatars */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {project.members?.slice(0, 4).map((m) => {
            const initials = m.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <div
                key={m.id}
                className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold border-2 border-dark-900 flex-shrink-0"
                title={m.user?.name}
              >
                {initials}
              </div>
            );
          })}
          {(project.members?.length ?? 0) > 4 && (
            <div className="w-7 h-7 rounded-full bg-dark-700 flex items-center justify-center text-dark-300 text-xs font-bold border-2 border-dark-900">
              +{project.members.length - 4}
            </div>
          )}
        </div>
        <p className="text-xs text-dark-600 ml-1">
          Created {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-dark-800">
        <Link
          to={`/projects/${project.id}`}
          className="btn-primary flex-1 justify-center text-sm py-2"
        >
          Open Board <ChevronRight size={14} />
        </Link>
        {isAdmin && (
          <button
            onClick={() => onDelete(project)}
            className="btn-ghost p-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            title="Delete project"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadProjects = async () => {
    try {
      const res = await projectsAPI.list();
      setProjects(res.data.data.projects);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await projectsAPI.create(form);
      toast.success('Project created!');
      setShowCreate(false);
      setForm({ name: '', description: '' });
      loadProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await projectsAPI.delete(deleteTarget.id);
      toast.success('Project deleted');
      setDeleteTarget(null);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } catch {
      toast.error('Failed to delete project');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} found</p>
        </div>
        <button id="create-project-btn" onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={18} /> New Project
        </button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-dark-500">
          <FolderKanban size={48} className="mb-4 text-dark-700" />
          <h3 className="text-white font-medium mb-2">No projects yet</h3>
          <p className="text-sm mb-4">Create your first project to get started</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="form-group">
            <label className="label">Project name *</label>
            <input
              id="project-name-input"
              className="input"
              placeholder="e.g., Website Redesign"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea
              className="input resize-none h-24"
              placeholder="What is this project about?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Project" size="sm">
        <div className="space-y-4">
          <p className="text-dark-300 text-sm">
            Are you sure you want to delete <span className="text-white font-semibold">"{deleteTarget?.name}"</span>?
            This will permanently delete all tasks and comments.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDelete} className="btn-danger flex-1 justify-center">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Projects;
