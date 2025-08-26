const express = require('express');
const router = express.Router();
const tripRoutes = require('./tripRoutes');

// Use trip routes
router.use('/trips', tripRoutes);

module.exports = router;
