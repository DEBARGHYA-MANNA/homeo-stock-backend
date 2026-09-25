const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },        // Payload - data stored in token
        process.env.JWT_SECRET, // Secret key to sign the token
        { expiresIn: process.env.JWT_EXPIRE } // Token expiry time
    );
};

module.exports = generateToken;