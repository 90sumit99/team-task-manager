/* ─── Status Badges ─────────────────────────────────────── */
export const StatusBadge = ({ status }) => {
  const map = {
    TODO:        { cls: 'badge-todo',     label: 'To Do' },
    IN_PROGRESS: { cls: 'badge-progress', label: 'In Progress' },
    DONE:        { cls: 'badge-done',     label: 'Done' },
  };
  const { cls, label } = map[status] || map.TODO;
  return <span className={cls}>{label}</span>;
};

/* ─── Priority Badges with dots ─────────────────────────── */
export const PriorityBadge = ({ priority }) => {
  const map = {
    HIGH:   { dot: 'dot-high',   cls: 'badge-high',   label: 'High' },
    MEDIUM: { dot: 'dot-medium', cls: 'badge-medium', label: 'Medium' },
    LOW:    { dot: 'dot-low',    cls: 'badge-low',    label: 'Low' },
  };
  const { dot, cls, label } = map[priority] || map.MEDIUM;
  return (
    <span className={cls}>
      <span className={dot} />
      {label}
    </span>
  );
};

/* ─── Avatar with initials ──────────────────────────────── */
export const Avatar = ({ name, size = 'md', className = '' }) => {
  const initials = name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const sizeClass = { sm: 'avatar-sm', md: 'avatar-md', lg: 'avatar-lg' }[size];
  return (
    <div className={`${sizeClass} ${className}`} title={name}>
      {initials}
    </div>
  );
};

/* ─── Spinner ───────────────────────────────────────────── */
export const Spinner = ({ size = 'sm' }) => (
  <div className={size === 'md' ? 'spinner-md' : 'spinner-sm'} />
);
