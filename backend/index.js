require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use(cors());
app.use(express.json());


connectDB();
app.use('/api/users', userRoutes);

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Połączono z MongoDB'))
    .catch((error) => console.error('Błąd połączenia z MongoDB:', error));

// Przykładowy model użytkownika
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
});
const User = mongoose.model('User', UserSchema);

// Endpointy API
app.get('/api/users', async (req, res) => {
    const users = await User.find();
    res.json(users);
});

app.post('/api/users', async (req, res) => {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
