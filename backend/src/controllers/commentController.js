const prisma = require('../prisma');
const { AppError } = require('../middleware/errorHandler');

// POST /api/tasks/:taskId/comments
const addComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    // Verify task exists and user is a project member
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } },
    });

    if (!task) throw new AppError('Task not found', 404);

    const isMember = task.project.members.some((m) => m.userId === req.user.id);
    if (!isMember && req.user.role !== 'ADMIN') {
      throw new AppError('You must be a project member to comment', 403);
    }

    const comment = await prisma.comment.create({
      data: { content, taskId, authorId: req.user.id },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ success: true, message: 'Comment added', data: { comment } });
  } catch (err) {
    next(err);
  }
};

// GET /api/tasks/:taskId/comments
const listComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } },
    });

    if (!task) throw new AppError('Task not found', 404);

    const isMember = task.project.members.some((m) => m.userId === req.user.id);
    if (!isMember && req.user.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: { comments } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:taskId/comments/:id
const deleteComment = async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      include: {
        task: {
          include: {
            project: {
              include: { members: { where: { userId: req.user.id } } },
            },
          },
        },
      },
    });

    if (!comment) throw new AppError('Comment not found', 404);

    const isAuthor = comment.authorId === req.user.id;
    const isProjectAdmin = comment.task.project.members[0]?.role === 'ADMIN';
    const isGlobalAdmin = req.user.role === 'ADMIN';

    if (!isAuthor && !isProjectAdmin && !isGlobalAdmin) {
      throw new AppError('You can only delete your own comments', 403);
    }

    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { addComment, listComments, deleteComment };
