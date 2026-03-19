const { user } = require('../models/auth');
const Admin = require('../models/admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateToken = (userId, role = 'user', tokenVersion = 0) => jwt.sign({ id: userId, role, tokenVersion }, JWT_SECRET, { expiresIn: '24h' });

// SIGNUP
exports.signup = async (req, res) => {
    try {
        const { email, password, type = 'BRAND', name, ...profileData } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ success: false, message: 'Email, password, and name are required' });
        }

        const existingUser = await user.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const emailOTP = generateOTP();
        const emailOTPExpires = new Date(Date.now() + 10 * 60 * 1000);

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await user.create({
            email,
            password: hashedPassword,
            type,
            name,
            emailOTP,
            emailOTPExpires,
            ...profileData
        });

        // Send OTP email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Phyo - Email Verification OTP',
            html: `<h2>Your OTP: <strong>${emailOTP}</strong></h2><p>Valid for 10 minutes</p>`
        });

        const token = generateToken(newUser._id);

        res.status(201).json({
            success: true,
            message: 'User created. OTP sent to email.',
            token,
            data: { id: newUser._id, email: newUser.email, type: newUser.type }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// VERIFY EMAIL OTP
exports.verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP required' });
        }

        const foundUser = await user.findOne({ email, emailOTP: otp, emailOTPExpires: { $gt: Date.now() } });

        if (!foundUser) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        foundUser.emailVerified = true;
        foundUser.emailOTP = undefined;
        foundUser.emailOTPExpires = undefined;
        await foundUser.save();

        // Generate a fresh token after OTP verification for full authentication
        const token = generateToken(foundUser._id, foundUser.role, foundUser.tokenVersion);

        res.json({
            success: true,
            message: 'Email verified successfully',
            token,
            user: { id: foundUser._id, email: foundUser.email, type: foundUser.type, name: foundUser.name }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// RESEND EMAIL OTP
exports.resendEmailOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email required' });
        }

        const foundUser = await user.findOne({ email });
        if (!foundUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const emailOTP = generateOTP();
        const emailOTPExpires = new Date(Date.now() + 10 * 60 * 1000);

        foundUser.emailOTP = emailOTP;
        foundUser.emailOTPExpires = emailOTPExpires;
        await foundUser.save();

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Phyo - Email Verification OTP (Resend)',
            html: `<h2>Your OTP: <strong>${emailOTP}</strong></h2><p>Valid for 10 minutes</p>`
        });

        res.json({ success: true, message: 'OTP resent to email' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// LOGIN
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        const foundUser = await user.findOne({ email });
        if (!foundUser) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, foundUser.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(foundUser._id, foundUser.role, foundUser.tokenVersion);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            data: { id: foundUser._id, email: foundUser.email, type: foundUser.type, name: foundUser.name }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email required' });
        }

        const foundUser = await user.findOne({ email });
        if (!foundUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const resetToken = generateOTP();
        foundUser.resetPasswordToken = resetToken;
        foundUser.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
        await foundUser.save();

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Phyo - Password Reset Code',
            html: `<h2>Your reset code: <strong>${resetToken}</strong></h2><p>Valid for 1 hour</p>`
        });

        res.json({ success: true, message: 'Reset code sent to email' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// VERIFY RESET CODE
exports.verifyResetCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Email and code required' });
        }

        const foundUser = await user.findOne({
            email,
            resetPasswordToken: code,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!foundUser) {
            return res.status(400).json({ success: false, message: 'Invalid or expired code' });
        }

        foundUser.isCodeVerified = true;
        await foundUser.save();

        res.json({ success: true, message: 'Code verified' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ success: false, message: 'Email and new password required' });
        }

        const foundUser = await user.findOne({ email, isCodeVerified: true, resetPasswordExpires: { $gt: Date.now() } });
        if (!foundUser) {
            return res.status(400).json({ success: false, message: 'Invalid session or expired' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        foundUser.password = hashedPassword;
        foundUser.resetPasswordToken = undefined;
        foundUser.resetPasswordExpires = undefined;
        foundUser.isCodeVerified = false;
        await foundUser.save();

        res.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET ALL INFLUENCERS (public)
exports.getAllInfluencers = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, minFollowers, maxFollowers } = req.query;

        let filter = { type: 'INFLUENCER', emailVerified: true };

        if (category) filter.categoryInstagram = category;
        if (minFollowers || maxFollowers) {
            filter['instagramData.followers'] = {};
            if (minFollowers) filter['instagramData.followers'].$gte = parseInt(minFollowers);
            if (maxFollowers) filter['instagramData.followers'].$lte = parseInt(maxFollowers);
        }

        const influencers = await user
            .find(filter)
            .select('name email type categoryInstagram instagramData.followers profileImage')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await user.countDocuments(filter);

        res.json({ success: true, total, page, limit, data: influencers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET INFLUENCER BY ID (public)
exports.getInfluencerById = async (req, res) => {
    try {
        const { id } = req.params;

        const influencer = await user.findById(id).select('-password');
        if (!influencer || influencer.type !== 'INFLUENCER') {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        res.json({ success: true, data: influencer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// CHECK REGISTRATION STATUS
exports.checkRegistrationStatus = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email required' });
        }

        const foundUser = await user.findOne({ email });

        res.json({
            success: true,
            isRegistered: !!foundUser,
            isVerified: foundUser?.emailVerified || false,
            userType: foundUser?.type
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ADMIN LOGIN
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        const admin = await Admin.findOne({ email, isActive: true });
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        admin.lastLogin = new Date();
        await admin.save();

        const token = generateToken(admin._id, 'admin', admin.tokenVersion || 0);

        res.json({
            success: true,
            message: 'Admin login successful',
            token,
            data: { id: admin._id, email: admin.email, name: admin.name, role: admin.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GOOGLE OAUTH
exports.googleAuth = async (req, res) => {
    try {
        const { token, type = 'BRAND', name, email } = req.body;

        if (!token || !email) {
            return res.status(400).json({ success: false, message: 'Token and email required' });
        }

        let foundUser = await user.findOne({ email });

        if (!foundUser) {
            const hashedPassword = await bcrypt.hash(token.substring(0, 20), 10);
            foundUser = await user.create({
                email,
                name: name || email.split('@')[0],
                password: hashedPassword,
                type,
                emailVerified: true
            });
        }

        const jwtToken = generateToken(foundUser._id, foundUser.role, foundUser.tokenVersion);

        res.json({
            success: true,
            message: 'Google auth successful',
            token: jwtToken,
            data: { id: foundUser._id, email: foundUser.email, name: foundUser.name, type: foundUser.type }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
