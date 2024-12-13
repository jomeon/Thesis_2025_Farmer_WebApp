const express = require('express');
const router = express.Router();
const fieldsController = require('../controllers/fieldsController');

router.get('/', fieldsController.getAllFields);
router.post('/', fieldsController.createField);
router.put('/:id', fieldsController.updateField);
router.delete('/:id', fieldsController.deleteField);

module.exports = router;
