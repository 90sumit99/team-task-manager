const express = require('express');
const { body } = require('express-validator');
const { addComment, listComments, deleteComment } = require('../controllers/commentController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.post(
  '/',
  [body('content').trim().notEmpty().withMessage('Comment content is required')],
  validate,
  addComment
);

router.get('/', listComments);
router.delete('/:id', deleteComment);

module.exports = router;
