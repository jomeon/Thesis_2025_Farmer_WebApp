require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./middleware/authMiddleware');
const cronJob = require('./cron'); 

const fieldsRoutes = require('./routes/fieldsRoutes');
const cropsRoutes = require('./routes/cropsRoutes');
const weatherRoutes = require('./routes/weatherRoutes');

const app = express();
app.use(cors());
app.use(express.json());

connectDB(); 

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Przykładowy model użytkownika

// Endpointy API
// app.get('/api/users', async (req, res) => {
//     const users = await User.find();
//     res.json(users);
// });

// app.post('/api/users', async (req, res) => {
//     const user = new User(req.body);
//     await user.save();
//     res.status(201).json(user);
// });

app.get('/api/navitems', async (req, res) => {
  let navItems = [
      { label: 'Home', path: '' },
      { label: 'About', path: 'about' },
      { label: 'Contact', path: 'contact' }
  ];

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('token serw', token);
  if (token) {
      try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          // Możesz również pobrać dodatkowe informacje o użytkowniku, jeśli potrzebujesz
          navItems.push(
              { label: 'Map', path: 'map' },
              { label: 'Profile', path: 'profile' },
              { label: 'Fields', path: 'fields' }, // Dodanie Fields
              { label: 'Logout', path: 'logout' }
          );
      } catch (err) {
          console.error('Nieprawidłowy token:', err.message);
          // Token jest nieprawidłowy lub wygasł, nie dodawaj elementów chronionych
          navItems.push(
              { label: 'Login', path: 'login' },
              { label: 'Register', path: 'register' }
          );
      }
  } else {
      // Użytkownik niezalogowany
      navItems.push(
          { label: 'Login', path: 'login' },
          { label: 'Register', path: 'register' }
      );
  }

  res.json(navItems);
});


  

app.use('/api/fields', fieldsRoutes);
app.use('/api/crops', cropsRoutes);
app.use('/api/weather', weatherRoutes);

app.use((req, res, next) => {
    res.status(404).json({ message: 'Nie znaleziono tej trasy.' });
});


cronJob();
 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
