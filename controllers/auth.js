const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { user, brand, influencer, serviceProvider } = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const EMAIL_USER = process.env.EMAIL_USER || 'your-email@example.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'your-email-password';
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.example.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;

const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: false,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

const createToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, {
        expiresIn: '24h'
    });
};

router.post('/signup', async (req, res) => {
    try {
        const { email, password, type, ...profileData } = req.body;

        const existingUser = await user.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let newUser;

        switch (type) {
            case 'BRAND':
                newUser = new brand({
                    email,
                    password: hashedPassword,
                    ...profileData
                });
                break;
            case 'INFLUENCER':
                newUser = new influencer({
                    email,
                    password: hashedPassword,
                    ...profileData
                });
                break;
            case 'SERVICE_PROVIDER':
                newUser = new serviceProvider({
                    email,
                    password: hashedPassword,
                    ...profileData
                });
                break;
            default:
                return res.status(400).json({ message: 'Invalid user type' });
        }

        await newUser.save();

        const token = createToken(newUser._id);

        const userResponse = newUser.toObject();
        delete userResponse.password;

        res.status(201).json({
            message: 'User registered successfully',
            token,
            data: userResponse
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const foundUser = await user.findOne({ email });
        if (!foundUser) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, foundUser.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = createToken(foundUser._id);

        const userResponse = foundUser.toObject();
        delete userResponse.password;

        res.json({
            message: 'Login successful',
            token,
            user: userResponse
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Please provide email' });
        }

        const foundUser = await user.findOne({ email });
        if (!foundUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpiry = Date.now() + 3600000;

        foundUser.resetPasswordToken = verificationCode;
        foundUser.resetPasswordExpires = codeExpiry;
        await foundUser.save();

        const mailOptions = {
            from: EMAIL_USER,
            to: foundUser.email,
            subject: 'Password Reset Verification Code',
            html: `
        <p>You requested a password reset</p>
        <p>Your verification code is: <strong>${verificationCode}</strong></p>
        <p>This code is valid for 1 hour.</p>
      `
        };

        await transporter.sendMail(mailOptions);

        res.json({
            message: 'Verification code sent to your email',
            email: foundUser.email
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.post('/verify-reset-code', async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                message: 'Please provide email and verification code'
            });
        }

        const foundUser = await user.findOne({
            email,
            resetPasswordToken: code,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!foundUser) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        // Create a temporary session token for the reset process
        //   const resetSessionToken = crypto.randomBytes(20).toString('hex');

        foundUser.isCodeVerified = true;
        await foundUser.save();

        res.json({
            message: 'Code verified successfully',
        });
    } catch (error) {
        console.error('Verify code error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                message: 'Please provide email, reset session token, and new password'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Find user with the reset session token
        const foundUser = await user.findOne({
            email,
            isCodeVerified: true,
            resetPasswordExpires: { $gt: Date.now() } // Still check expiry time
        });

        if (!foundUser) {
            return res.status(400).json({ message: 'Invalid session or session expired' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        foundUser.password = await bcrypt.hash(newPassword, salt);

        // Clear all reset fields
        foundUser.resetPasswordToken = undefined;
        foundUser.resetPasswordExpires = undefined;
        foundUser.isCodeVerified = false;

        await foundUser.save();

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;