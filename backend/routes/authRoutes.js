const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rejestracja
router.post('/register', authController.register);

// Logowanie
router.post('/login', authController.login);

router.get('/test', (req, res) => {
    res.json({ message: 'Auth Routes działają!' });
});

module.exports = router;