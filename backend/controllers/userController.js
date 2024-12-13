const User = require('../models/User');

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Błąd serwera', error });
    }
};

const createUser = async (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email jest już zajęty' });
        }

        const newUser = new User({ username, email, password, firstName, lastName });
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas tworzenia użytkownika', error });
    }
};


const getProfile = async (req, res) => {
    res.json(req.user);
};

// Edytuj profil użytkownika
const updateProfile = async (req, res) => {
    const { firstName, lastName, password } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'Użytkownik nie znaleziony.' });
        }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (password) user.password = password; // Haszowanie hasła będzie obsługiwane przez middleware

        await user.save();

        res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Serwer błąd');
    }
};

const registerUser = async (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;

    try {
        // Sprawdzenie, czy użytkownik już istnieje
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'Użytkownik o podanym emailu lub nazwie już istnieje.' });
        }

        // Tworzenie nowego użytkownika
        user = new User({
            username,
            email,
            password,
            firstName,
            lastName
        });

        await user.save();

        res.status(201).json({
            message: 'Użytkownik został pomyślnie utworzony.',
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

module.exports = { getAllUsers, createUser, getProfile, updateProfile, registerUser };
