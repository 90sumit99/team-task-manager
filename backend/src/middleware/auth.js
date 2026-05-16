const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { AppError } = require('./errorHandler');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided. Please log in.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      throw new AppError('User not found. Please log in again.', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const requireGlobalAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return next(new AppError('Access denied. Insufficient permissions.', 403));
  }
  next();
};

const requireProjectRole = (requiredRole) => async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const userId = req.user.id;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!membership) {
      // Global admin bypasses membership check
      if (req.user.role === 'ADMIN') {
        req.projectRole = 'ADMIN';
        return next();
      }
      throw new AppError('Access denied. Insufficient permissions.', 403);
    }

    req.projectRole = membership.role;

    if (requiredRole === 'ADMIN' && membership.role !== 'ADMIN') {
      throw new AppError('Access denied. Insufficient permissions.', 403);
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireAuth, requireGlobalAdmin, requireProjectRole };
