const user = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function handleSignup(req, res) {
    try {
        const { name, email, password, mobileNumber, agencyName, website } = req.body;

        if (!email || !name || !password) {
            return res.status(400).json({ message: 'All required fields must be provided' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }


        const existingUser = await user.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const createdUser = await user.create({ name, email, password: hashedPassword, mobileNumber, agencyName, website });

        const token = jwt.sign({ id: createdUser._id, email: createdUser.email }, process.env.JWT_SECRET);

        res.cookie("authtoken", token, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            domain: '.phyo.ai',
            maxAge: 30 * 24 * 60 * 60 * 1000
        })
        res.status(201).json({ message: 'User created successfully', token, data: createdUser });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

async function handleLogin(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const foundUser = await user.findOne({ email });
        if (!foundUser) return res.status(404).json({ message: 'User not found' });

        const isPasswordValid = await bcrypt.compare(password, foundUser.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: foundUser._id, email: user.email }, process.env.JWT_SECRET);

        res.cookie("authtoken", token, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            domain: '.phyo.ai',
            maxAge: 30 * 24 * 60 * 60 * 1000
        })
        res.status(200).json({ message: 'Login successful', token, data: foundUser });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

module.exports = {
    handleLogin,
    handleSignup
}

