const prisma = require('../prisma');
const { AppError } = require('../middleware/errorHandler');

// POST /api/projects/:projectId/tasks
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, assigneeId, dueDate } = req.body;
    const { projectId } = req.params;

    // Validate that assigneeId (if provided) is actually a project member
    if (assigneeId) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: assigneeId } },
      });
      if (!membership) throw new AppError('Assignee must be a member of this project', 400);
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        projectId,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, message: 'Task created', data: { task } });
  } catch (err) {
    next(err);
  }
};

// GET /api/projects/:projectId/tasks
const listTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assigneeId } = req.query;

    const where = { projectId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: { tasks } });
  } catch (err) {
    next(err);
  }
};

// GET /api/projects/:projectId/tasks/:id
const getTask = async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, projectId: req.params.projectId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!task) throw new AppError('Task not found', 404);

    res.json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/projects/:projectId/tasks/:id — Project ADMIN only (enforced by route middleware)
const updateTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, assigneeId, dueDate } = req.body;
    const { projectId } = req.params;

    const task = await prisma.task.findFirst({
      where: { id: req.params.id, projectId },
    });
    if (!task) throw new AppError('Task not found', 404);

    // Validate new assigneeId is a project member (if provided)
    if (assigneeId !== undefined && assigneeId !== null) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: assigneeId } },
      });
      if (!membership) throw new AppError('Assignee must be a member of this project', 400);
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, message: 'Task updated', data: { task: updated } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/projects/:projectId/tasks/:id — ADMIN only (enforced by route middleware)
const deleteTask = async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, projectId: req.params.projectId },
    });
    if (!task) throw new AppError('Task not found', 404);

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/projects/:projectId/tasks/:id/status — Assignee OR Project ADMIN
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, projectId: req.params.projectId },
    });

    if (!task) throw new AppError('Task not found', 404);

    // Only ADMIN or the specific assignee can update status
    if (req.projectRole !== 'ADMIN' && task.assigneeId !== req.user.id) {
      throw new AppError('Access denied. Insufficient permissions.', 403);
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { status },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });

    res.json({ success: true, message: 'Status updated', data: { task: updated } });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard — stats for current user; includes tasksByUser for project admins
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const isGlobalAdmin = req.user.role === 'ADMIN';

    // Find projects where user is an admin
    const adminProjects = await prisma.projectMember.findMany({
      where: { userId, role: 'ADMIN' },
      select: { projectId: true },
    });
    const adminProjectIds = adminProjects.map(p => p.projectId);
    const isProjectAdmin = adminProjectIds.length > 0;

    // Define the base filter for tasks shown in the top cards
    let taskFilter = { assigneeId: userId }; // Default: only their own tasks
    
    if (isGlobalAdmin) {
      taskFilter = {}; // Global admin sees all tasks
    } else if (isProjectAdmin) {
      // Project admin sees tasks in their projects AND their own tasks
      taskFilter = {
        OR: [
          { assigneeId: userId },
          { projectId: { in: adminProjectIds } }
        ]
      };
    }

    const [assignedTasks, statusCounts, overdueTasks, recentTasks] = await Promise.all([
      prisma.task.count({ where: taskFilter }),
      prisma.task.groupBy({
        by: ['status'],
        where: taskFilter,
        _count: { status: true },
      }),
      prisma.task.findMany({
        where: { ...taskFilter, dueDate: { lt: now }, status: { not: 'DONE' } },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.task.findMany({
        where: taskFilter,
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    const statusMap = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    statusCounts.forEach(({ status, _count }) => {
      statusMap[status] = _count.status;
    });

    // tasksByUser: only for project admins and global admins — show member stats
    let tasksByUser = [];
    if (isGlobalAdmin || isProjectAdmin) {
      let memberFilter = {}; // Global admin gets all members of any project
      let taskScopeFilter = {}; // Global admin tracks across all projects

      if (!isGlobalAdmin && isProjectAdmin) {
        memberFilter = { projectId: { in: adminProjectIds } };
        taskScopeFilter = { projectId: { in: adminProjectIds } };
      }

      // Get members based on scope
      const members = await prisma.projectMember.findMany({
        where: memberFilter,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Deduplicate by userId
      const uniqueMembers = Array.from(
        members.reduce((map, m) => {
          if (!map.has(m.userId)) map.set(m.userId, m);
          return map;
        }, new Map()).values()
      );

      tasksByUser = await Promise.all(
        uniqueMembers.map(async (m) => {
          const mFilter = { assigneeId: m.userId, ...taskScopeFilter };
          const [total, completed, overdue] = await Promise.all([
            prisma.task.count({ where: mFilter }),
            prisma.task.count({ where: { ...mFilter, status: 'DONE' } }),
            prisma.task.count({ where: { ...mFilter, status: { not: 'DONE' }, dueDate: { lt: now } } }),
          ]);
          return {
            userId: m.userId,
            name: m.user.name,
            email: m.user.email,
            totalTasks: total,
            completed,
            overdue,
          };
        })
      );
      
      // Sort tasksByUser by total tasks descending
      tasksByUser.sort((a, b) => b.totalTasks - a.totalTasks);
    }

    res.json({
      success: true,
      data: {
        totalTasks: assignedTasks,
        byStatus: statusMap,
        overdueTasks,
        recentTasks,
        // Convenience aliases
        completed: statusMap.DONE,
        overdue: overdueTasks.length,
        recentActivity: recentTasks,
        totalAssigned: assignedTasks,
        // Admin-only
        tasksByUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createTask, listTasks, getTask, updateTask, deleteTask, updateStatus, getDashboardStats };
