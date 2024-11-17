const User = require('../models/User')

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Błąd serwera', error });
    }
};

const createUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email jest już zajęty' });
        }

        const newUser = new User({ name, email, password });
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas tworzenia użytkownika', error });
    }
};

module.exports = { getAllUsers, createUser };
