import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { user, brand, influencer, serviceProvider } from '../models/auth';
import { UserType, JWTPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const EMAIL_USER = process.env.EMAIL_USER || 'your-email@example.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'your-email-password';
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.example.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: false,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

const createToken = (userId: string): string => {
  return jwt.sign({ id: userId } as JWTPayload, JWT_SECRET, {
    expiresIn: '24h'
  });
};

interface SignupRequestBody {
  email: string;
  password: string;
  type: UserType;
  [key: string]: any;
}

interface LoginRequestBody {
  email: string;
  password: string;
}

interface ForgotPasswordRequestBody {
  email: string;
}

interface VerifyResetCodeRequestBody {
  email: string;
  code: string;
}

interface ResetPasswordRequestBody {
  email: string;
  newPassword: string;
}

export const handleSignup = async (req: Request<{}, {}, SignupRequestBody>, res: Response): Promise<void> => {
  try {
    const { email, password, type, ...profileData } = req.body;

    const existingUser = await user.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists with this email' });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
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
        res.status(400).json({ message: 'Invalid user type' });
        return;
    }

    await newUser.save();

    const token = createToken((newUser._id as any).toString());

    const userResponse = newUser.toObject();
    delete (userResponse as any).password;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      data: userResponse
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const handleLogin = async (req: Request<{}, {}, LoginRequestBody>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Please provide email and password' });
      return;
    }

    const foundUser = await user.findOne({ email });
    if (!foundUser) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = createToken((foundUser._id as any).toString());

    const userResponse = foundUser.toObject();
    delete (userResponse as any).password;

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const handleForgotPassword = async (req: Request<{}, {}, ForgotPasswordRequestBody>, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Please provide email' });
      return;
    }

    const foundUser = await user.findOne({ email });
    if (!foundUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = Date.now() + 3600000; // 1 hour

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
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const handleVerifyResetCode = async (req: Request<{}, {}, VerifyResetCodeRequestBody>, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({
        message: 'Please provide email and verification code'
      });
      return;
    }

    const foundUser = await user.findOne({
      email,
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!foundUser) {
      res.status(400).json({ message: 'Invalid or expired verification code' });
      return;
    }

    foundUser.isCodeVerified = true;
    await foundUser.save();

    res.json({
      message: 'Code verified successfully'
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const handleResetPassword = async (req: Request<{}, {}, ResetPasswordRequestBody>, res: Response): Promise<void> => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      res.status(400).json({
        message: 'Please provide email and new password'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    const foundUser = await user.findOne({
      email,
      isCodeVerified: true
    });

    if (!foundUser) {
      res.status(400).json({ 
        message: 'User not found or code not verified' 
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    foundUser.password = hashedPassword;
    foundUser.resetPasswordToken = undefined;
    foundUser.resetPasswordExpires = undefined;
    foundUser.isCodeVerified = false;
    await foundUser.save();

    res.json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const handleGetAllInfluencers = async (req: Request, res: Response): Promise<void> => {
  try {
    const influencers = await influencer.find({}, { password: 0 });
    
    res.json({
      message: 'Influencers retrieved successfully',
      data: influencers
    });
  } catch (error) {
    console.error('Get influencers error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const handleGetInfluencerById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const foundInfluencer = await influencer.findById(id, { password: 0 });
    if (!foundInfluencer) {
      res.status(404).json({ message: 'Influencer not found' });
      return;
    }

    res.json({
      message: 'Influencer retrieved successfully',
      data: foundInfluencer
    });
  } catch (error) {
    console.error('Get influencer error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}; 