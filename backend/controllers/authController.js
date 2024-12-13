const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Rejestracja użytkownika
exports.register = async (req, res) => {
    console.log('Otrzymano żądanie rejestracji:', req.body);
    const { username, email, password, firstName, lastName } = req.body;
    console.log('JWT_SECRET:', process.env.JWT_SECRET); 
    try {
        // Sprawdzenie, czy użytkownik już istnieje
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'Użytkownik już istnieje.' });
        }

        user = new User({
            username,
            email,
            password,
            firstName,
            lastName
        });

        await user.save();

        // Generowanie tokenu
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Serwer błąd');
    }
};

// Logowanie użytkownika
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Sprawdzenie, czy użytkownik istnieje
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Nieprawidłowe dane logowania.' });
        }

        // Sprawdzenie hasła
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Nieprawidłowe dane logowania.' });
        }

        // Generowanie tokenu
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Serwer błąd');
    }
};