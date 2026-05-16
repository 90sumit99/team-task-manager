const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/taskController');

const router = express.Router();

// GET /api/dashboard
router.get('/', requireAuth, getDashboardStats);

module.exports = router;
