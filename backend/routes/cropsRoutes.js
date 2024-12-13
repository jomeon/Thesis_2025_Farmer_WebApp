const express = require('express');
const router = express.Router();
const cropsController = require('../controllers/cropsController');

router.get('/', cropsController.getAllCrops);
router.post('/', cropsController.createCrop);
router.put('/:id', cropsController.updateCrop);
router.delete('/:id', cropsController.deleteCrop);

module.exports = router;
