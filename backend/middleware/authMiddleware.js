const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {

    // const authHeader = req.headers['authorization'];
    // console.log('Authorization Header:', authHeader); // Log nagłówka
    // const token = authHeader && authHeader.split(' ')[1]; 

    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Brak tokenu, autoryzacja odrzucona.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'Autoryzacja odrzucona, użytkownik nie znaleziony.' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error(err);
        res.status(401).json({ message: 'Token nieprawidłowy.' });
    }
};

module.exports = auth;