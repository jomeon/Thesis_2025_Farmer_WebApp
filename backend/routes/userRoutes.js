const express = require('express');
const { getAllUsers, createUser, getProfile, updateProfile, registerUser } = require('../controllers/userController');
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

console.log('getAllUsers:', getAllUsers);
console.log('createUser:', createUser);
console.log('getProfile:', getProfile);
console.log('updateProfile:', updateProfile);
console.log('registerUser:', registerUser);


router.get('/', getAllUsers);
router.post('/', createUser);


// Pobierz profil użytkownika
router.get('/profile', auth, getProfile);

// Edytuj profil użytkownika
router.put('/profile', auth, updateProfile);

router.post('/register', auth, registerUser);
module.exports = router;
