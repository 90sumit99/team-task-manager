const express = require('express');
const { body } = require('express-validator');
const {
  createProject, listProjects, getProject, updateProject,
  deleteProject, addMember, removeMember, changeRole,
} = require('../controllers/projectController');
const { requireAuth, requireProjectRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getDashboardStats } = require('../controllers/taskController');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// Project CRUD
router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Project name is required')],
  validate,
  createProject
);

router.get('/', listProjects);
router.get('/:id', requireProjectRole('MEMBER'), getProject);

router.put(
  '/:id',
  requireProjectRole('ADMIN'),
  [body('name').optional().trim().notEmpty().withMessage('Project name cannot be empty')],
  validate,
  updateProject
);

router.delete('/:id', requireProjectRole('ADMIN'), deleteProject);

// Member management
router.post(
  '/:id/members',
  requireProjectRole('ADMIN'),
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('role').optional().isIn(['ADMIN', 'MEMBER']).withMessage('Role must be ADMIN or MEMBER'),
  ],
  validate,
  addMember
);

router.delete('/:id/members/:uid', requireProjectRole('ADMIN'), removeMember);

// PATCH role — only project ADMIN can change a member's role
router.patch(
  '/:id/members/:uid/role',
  requireProjectRole('ADMIN'),
  [body('role').isIn(['ADMIN', 'MEMBER']).withMessage('Role must be ADMIN or MEMBER')],
  validate,
  changeRole
);

module.exports = router;
