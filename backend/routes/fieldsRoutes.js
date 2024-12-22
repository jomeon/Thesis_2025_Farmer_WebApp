const express = require('express');
const router = express.Router();
const fieldsController = require('../controllers/fieldsController');
const authMiddleware = require('../middleware/authMiddleware');

// Trasa do pobierania wszystkich pól
router.get('/', fieldsController.getAllFields);

// Trasa do dodawania nowego pola
router.post('/', fieldsController.createField);

// Trasa do aktualizacji pola
router.put('/:id', fieldsController.updateField);

// Trasa do usuwania pola
router.delete('/:id', fieldsController.deleteField);

module.exports = router;
