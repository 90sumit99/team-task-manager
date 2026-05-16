const express = require('express');
const { body, query } = require('express-validator');
const { createTask, listTasks, getTask, updateTask, deleteTask, updateStatus } = require('../controllers/taskController');
const { requireAuth, requireProjectRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// mergeParams allows access to :projectId from parent router
const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireProjectRole('MEMBER')); // all task routes require at least membership

// ── Shared validation ─────────────────────────────────────────────────────────
const createTaskValidation = [
  body('title')
    .trim().notEmpty().withMessage('Task title is required')
    .isLength({ max: 100 }).withMessage('Title max 100 chars'),
  body('priority')
    .isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Priority must be LOW, MEDIUM, or HIGH'),
  body('dueDate')
    .notEmpty().withMessage('Due date is required')
    .isISO8601().withMessage('Due date must be a valid date')
    .custom((value) => {
      const due = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today) throw new Error('Due date must be today or a future date');
      return true;
    }),
  body('assigneeId')
    .optional({ nullable: true })
    .isString().withMessage('AssigneeId must be a string'),
  body('status')
    .optional()
    .isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Status must be TODO, IN_PROGRESS, or DONE'),
];

const updateTaskValidation = [
  body('title')
    .optional()
    .trim().notEmpty().withMessage('Task title cannot be empty')
    .isLength({ max: 100 }).withMessage('Title max 100 chars'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Priority must be LOW, MEDIUM, or HIGH'),
  body('dueDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Due date must be a valid date'),
  body('status')
    .optional()
    .isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Status must be TODO, IN_PROGRESS, or DONE'),
];

// POST — ADMIN only can create tasks
router.post('/', requireProjectRole('ADMIN'), createTaskValidation, validate, createTask);

// GET — any project member can list/get tasks
router.get('/', listTasks);
router.get('/:id', getTask);

// PUT — ADMIN only can fully update tasks (title, description, priority, assignee, dueDate, status)
router.put('/:id', requireProjectRole('ADMIN'), updateTaskValidation, validate, updateTask);

// DELETE — ADMIN only
router.delete('/:id', requireProjectRole('ADMIN'), deleteTask);

// PATCH /status — assignee OR admin (enforced inside controller)
router.patch(
  '/:id/status',
  [body('status').isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Invalid status')],
  validate,
  updateStatus
);

module.exports = router;
