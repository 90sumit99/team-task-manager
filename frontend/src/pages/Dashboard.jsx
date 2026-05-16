import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer
} from 'recharts';
import {
  CheckCircle2, Clock, AlertTriangle, ListTodo, ArrowRight, Calendar, Users
} from 'lucide-react';
import { StatusBadge, PriorityBadge, Avatar, Spinner } from '../components/Badges';
import toast from 'react-hot-toast';

/* ─── Helpers ──────────────────────────────────────────────── */
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

/* ─── Chart colors ─────────────────────────────────────────── */
const STATUS_COLORS = {
  TODO:        '#64748b',
  IN_PROGRESS: '#5b8def',
  DONE:        '#3dba6f',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-xl">
      <p style={{ color: 'var(--text-1)' }}><strong>{payload[0].name}</strong></p>
      <p style={{ color: 'var(--text-2)' }}>{payload[0].value} task{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
};

/* ─── Stat Card ────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, iconColor, borderRed }) => (
  <div className={`stat-card animate-fade-in ${borderRed ? 'border-red-500/40' : ''}`}>
    <div className="flex items-center justify-between mb-3">
      <span className="section-title">{label}</span>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `${iconColor}15` }}>
        <Icon size={16} style={{ color: iconColor }} />
      </div>
    </div>
    <p className="text-3xl font-semibold" style={{ color: 'var(--text-1)' }}>{value}</p>
  </div>
);

/* ─── Dashboard ────────────────────────────────────────────── */
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getStats()
      .then(r => setStats(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="md" />
      </div>
    );
  }

  const byStatus = stats?.byStatus || {};
  const donutData = [
    { name: 'To Do',       value: byStatus.TODO        ?? 0, color: STATUS_COLORS.TODO },
    { name: 'In Progress', value: byStatus.IN_PROGRESS ?? 0, color: STATUS_COLORS.IN_PROGRESS },
    { name: 'Done',        value: byStatus.DONE        ?? 0, color: STATUS_COLORS.DONE },
  ].filter(d => d.value > 0);

  const barData = [
    { name: 'To Do',       count: byStatus.TODO        ?? 0, fill: STATUS_COLORS.TODO },
    { name: 'In Progress', count: byStatus.IN_PROGRESS ?? 0, fill: STATUS_COLORS.IN_PROGRESS },
    { name: 'Done',        count: byStatus.DONE        ?? 0, fill: STATUS_COLORS.DONE },
  ];

  const totalTasks     = stats?.totalTasks ?? stats?.totalAssigned ?? 0;
  const completed      = stats?.completed  ?? byStatus.DONE ?? 0;
  const overdueCount   = stats?.overdue    ?? stats?.overdueTasks?.length ?? 0;
  const overdueTasks   = stats?.overdueTasks ?? [];
  const recentTasks    = stats?.recentTasks ?? stats?.recentActivity ?? [];
  const tasksByUser    = stats?.tasksByUser ?? [];

  // Show tasks-per-user table if there is any admin data
  const showAdminTable = tasksByUser.length > 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            {greeting}, <span style={{ color: 'var(--accent)' }}>{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="page-subtitle">Here's your task overview for today</p>
        </div>
        <Link to="/projects" className="btn-primary hidden sm:flex flex-shrink-0">
          View Projects <ArrowRight size={14} />
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ListTodo}
          label="Total Tasks"
          value={totalTasks}
          iconColor="var(--accent)"
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          value={byStatus.IN_PROGRESS ?? 0}
          iconColor="#5b8def"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={completed}
          iconColor="#3dba6f"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={overdueCount}
          iconColor="#ef4444"
          borderRed={overdueCount > 0}
        />
      </div>

      {/* Chart + Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart — tasks by status */}
        <div className="card p-5">
          <p className="font-semibold text-sm mb-4" style={{ color: 'var(--text-1)' }}>
            Tasks by Status
          </p>
          {totalTasks === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <ListTodo size={32} style={{ color: 'var(--text-3)' }} />
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>No tasks assigned yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} allowDecimals={false} />
                <RechartTooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {barData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Overdue tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
              Overdue Tasks
            </p>
            {overdueCount > 0 && (
              <span className="badge-high">{overdueCount}</span>
            )}
          </div>

          {overdueTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <CheckCircle2 size={28} style={{ color: '#3dba6f' }} />
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>No overdue tasks 🎉</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {overdueTasks.map(task => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  onClick={() => sessionStorage.setItem(`task-${task.id}-projectId`, task.projectId)}
                  className="flex items-start gap-3 p-3 rounded-lg transition-colors group"
                  style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <Calendar size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:underline" style={{ color: 'var(--text-1)' }}>
                      {task.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{task.project?.name}</p>
                    <p className="text-xs text-red-400 mt-0.5">
                      Due {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tasks Per User — Project Admin only */}
      {showAdminTable && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={15} style={{ color: 'var(--accent)' }} />
            <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
              Tasks Per User <span className="ml-1 text-xs px-2 py-0.5 rounded-full font-normal"
                style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>Admin View</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left pb-2 pr-4" style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: '11px' }}>Member</th>
                  <th className="text-center pb-2 pr-4" style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: '11px' }}>Total Tasks</th>
                  <th className="text-center pb-2 pr-4" style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: '11px' }}>Completed</th>
                  <th className="text-center pb-2" style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: '11px' }}>Overdue</th>
                </tr>
              </thead>
              <tbody>
                {tasksByUser.map(m => (
                  <tr key={m.userId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={m.name} size="sm" />
                        <div>
                          <p style={{ color: 'var(--text-1)' }}>{m.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-center" style={{ color: 'var(--text-1)' }}>{m.totalTasks}</td>
                    <td className="py-2.5 pr-4 text-center">
                      <span style={{ color: '#3dba6f' }}>{m.completed}</span>
                    </td>
                    <td className="py-2.5 text-center">
                      {m.overdue > 0
                        ? <span className="badge-high">{m.overdue}</span>
                        : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={15} style={{ color: 'var(--accent)' }} />
          <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Recent Activity</p>
        </div>

        {recentTasks.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>No recent activity</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recentTasks.map(task => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                onClick={() => sessionStorage.setItem(`task-${task.id}-projectId`, task.projectId)}
                className="flex items-center gap-4 py-3 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:underline" style={{ color: 'var(--text-1)' }}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{task.project?.name}</p>
                    {task.assignee && (
                      <>
                        <span style={{ color: 'var(--border)' }}>·</span>
                        <div className="flex items-center gap-1.5">
                          <Avatar name={task.assignee.name} size="sm" />
                          <span className="text-xs" style={{ color: 'var(--text-3)' }}>{task.assignee.name}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={task.status} />
                  <span className="text-xs hidden sm:block" style={{ color: 'var(--text-3)' }}>
                    {timeAgo(task.updatedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
