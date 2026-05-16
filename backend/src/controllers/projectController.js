const prisma = require('../prisma');
const { AppError } = require('../middleware/errorHandler');

// POST /api/projects
const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: req.user.id,
        members: {
          create: { userId: req.user.id, role: 'ADMIN' },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    res.status(201).json({ success: true, message: 'Project created', data: { project } });
  } catch (err) {
    next(err);
  }
};

// GET /api/projects
const listProjects = async (req, res, next) => {
  try {
    const whereClause =
      req.user.role === 'ADMIN'
        ? {} // Global admins see all
        : { members: { some: { userId: req.user.id } } };

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { projects } });
  } catch (err) {
    next(err);
  }
};

// GET /api/projects/:id
const getProject = async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!project) throw new AppError('Project not found', 404);

    // Check membership
    const isMember = project.members.some((m) => m.userId === req.user.id);
    if (!isMember && req.user.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    res.json({ success: true, data: { project } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/projects/:id
const updateProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { name, description },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    res.json({ success: true, message: 'Project updated', data: { project } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/projects/:id
const deleteProject = async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/projects/:id/members
const addMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('User with this email not found', 404);

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: user.id } },
    });
    if (existing) throw new AppError('User is already a member', 400);

    const member = await prisma.projectMember.create({
      data: {
        projectId: req.params.id,
        userId: user.id,
        role: role || 'MEMBER',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ success: true, message: 'Member added', data: { member } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/projects/:id/members/:uid
const removeMember = async (req, res, next) => {
  try {
    const { id: projectId, uid: userId } = req.params;

    // Prevent removing the project owner
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project?.ownerId === userId) {
      throw new AppError('Cannot remove project owner', 400);
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/projects/:id/members/:uid/role
const changeRole = async (req, res, next) => {
  try {
    const { id: projectId, uid: userId } = req.params;
    const { role } = req.body;

    // Prevent changing the project owner's role
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project?.ownerId === userId) {
      throw new AppError('Cannot change the project owner\'s role', 400);
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!membership) throw new AppError('User is not a member of this project', 404);

    const updated = await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json({ success: true, message: `Role changed to ${role}`, data: { member: updated } });
  } catch (err) {
    next(err);
  }
};

module.exports = { createProject, listProjects, getProject, updateProject, deleteProject, addMember, removeMember, changeRole };
