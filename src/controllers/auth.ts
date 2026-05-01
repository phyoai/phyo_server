import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { user, brand, influencer, serviceProvider, userAuth } from '../models/auth';
import { UserType, JWTPayload } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const EMAIL_USER = process.env.EMAIL_USER || 'phyo.aiofficial@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'antn hqqq pqzw ittq';
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
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

const FIRST_SIGNUP_CREDITS = 10;

// Generate OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email: string, otp: string, subject: string): Promise<void> => {
  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Email Verification</h2>
        <p style="color: #666; font-size: 16px;">Your verification code is:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p style="color: #666; font-size: 14px;">This code is valid for 10 minutes.</p>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

const trySendOtpEmail = async (
  email: string,
  otp: string,
  subject: string
): Promise<{ delivered: boolean; skippedReason?: string }> => {
  try {
    await sendOTPEmail(email, otp, subject);
    return { delivered: true };
  } catch (error) {
    logger.error('OTP email dispatch failed', {
      email,
      subject,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (!env.isProduction) {
      return {
        delivered: false,
        skippedReason: 'Email delivery skipped in non-production environment',
      };
    }

    throw error;
  }
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

interface VerifyOTPRequestBody {
  email: string;
  otp: string;
}

interface ResendOTPRequestBody {
  email: string;
}

export const handleSignup = async (req: Request<{}, {}, SignupRequestBody>, res: Response): Promise<void> => {
  try {
    const { email, password, type, ...profileData } = req.body;

    const existingUser = await user.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists with this email' });
      return;
    }

    // Check if this is an OAuth signup (no password provided)
    const isOAuthSignup = !password;
    
    if (!isOAuthSignup && (!password || password.length < 6)) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 600000; // 10 minutes

    // Store user data temporarily (you might want to use Redis or a temporary collection)
    // For now, we'll create the user but mark them as unverified
    let newUser;
    let hashedPassword = null;

    if (!isOAuthSignup) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    switch (type) {
      case 'BRAND':
        // Redirect to new brand registration flow
        res.status(400).json({ 
          message: 'Brand registration has moved to a new process. Please use the /api/brand-requests/submit endpoint with the new registration format.',
          redirect_to: '/api/brand-requests/submit',
          required_fields: {
            company_name: 'string (required)',
            website_url: 'string (required, valid URL)',
            industry: 'string (required)',
            company_type: 'string (optional)',
            company_size: 'string (optional: 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+)',
            contact: {
              first_name: 'string (required)',
              last_name: 'string (required)',
              email: 'string (required, valid email)',
              phone: 'string (optional)',
              job_title: 'string (optional)'
            },
            account: {
              signup_method: 'string (required: email, google, linkedin, sso)',
              password: 'string (required for email signup, min 6 chars)'
            }
          }
        });
        return;
      case 'INFLUENCER':
        newUser = new influencer({
          type: 'INFLUENCER',
          email,
          password: hashedPassword,
          emailVerificationOTP: otp,
          emailVerificationExpires: otpExpiry,
          isEmailVerified: false,
          currentPlan: 'BRONZE',
          creditsRemaining: FIRST_SIGNUP_CREDITS, // Give signup reward credits to new users
          trialCreditsGiven: true, // Mark that trial credits have been given
          subscriptionStatus: 'ACTIVE',
          lastPlanUpdate: new Date(),
          ...profileData
        });
        break;
      case 'SERVICE_PROVIDER':
        newUser = new serviceProvider({
          type: 'SERVICE_PROVIDER',
          email,
          password: hashedPassword,
          emailVerificationOTP: otp,
          emailVerificationExpires: otpExpiry,
          isEmailVerified: false,
          currentPlan: 'BRONZE',
          creditsRemaining: FIRST_SIGNUP_CREDITS, // Give signup reward credits to new users
          trialCreditsGiven: true, // Mark that trial credits have been given
          subscriptionStatus: 'ACTIVE',
          lastPlanUpdate: new Date(),
          ...profileData
        });
        break;
      case 'USER':
        // Validate required fields for USER type
        if (!profileData.name || !profileData.username) {
          res.status(400).json({
            message: 'Name and username are required for USER registration'
          });
          return;
        }

        // Validate gender value if provided
        if (profileData.gender && !['Male', 'Female', 'Other'].includes(profileData.gender)) {
          res.status(400).json({
            message: 'Gender must be Male, Female, or Other'
          });
          return;
        }

        newUser = new userAuth({
          type: 'USER',
          email,
          password: hashedPassword,
          emailVerificationOTP: otp,
          emailVerificationExpires: otpExpiry,
          isEmailVerified: false,
          currentPlan: 'BRONZE',
          creditsRemaining: FIRST_SIGNUP_CREDITS, // Give signup reward credits to new users
          trialCreditsGiven: true, // Mark that trial credits have been given
          subscriptionStatus: 'ACTIVE',
          lastPlanUpdate: new Date(),
          brandRegistrationStatus: 'NONE', // Initialize brand registration status
          ...profileData
        });
        break;
      default:
        res.status(400).json({ message: 'Invalid user type' });
        return;
    }

    await newUser.save();

    // In non-production we allow signup to succeed even if SMTP is unavailable.
    await trySendOtpEmail(email, otp, 'Email Verification - Complete Your Registration');

    res.status(201).json({
      message: 'Registration initiated. Please check your email for verification code.',
      email: email
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

    // Check if email is verified (for non-OAuth users)
    if (!foundUser.isOAuthUser && !foundUser.isEmailVerified) {
      res.status(401).json({ 
        message: 'Please verify your email before logging in. Check your email for verification code.',
        email: foundUser.email
      });
      return;
    }

    // Check if user is OAuth-only (no password)
    if (foundUser.isOAuthUser && !foundUser.password) {
      res.status(401).json({ message: 'This account was created with Google OAuth. Please use Google login.' });
      return;
    }

    // Check if password exists
    if (!foundUser.password) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Handle legacy users and trial credits logic
    let needsUpdate = false;
    
    // Set trialCreditsGiven flag for existing users who don't have it
    if (foundUser.trialCreditsGiven === undefined) {
      foundUser.trialCreditsGiven = false; // Assume legacy users haven't received trial credits
      needsUpdate = true;
    }
    
    // Only give trial credits to users who haven't received them yet
    if (!foundUser.trialCreditsGiven && foundUser.currentPlan === 'BRONZE') {
      foundUser.creditsRemaining = FIRST_SIGNUP_CREDITS;
      foundUser.trialCreditsGiven = true;
      needsUpdate = true;
      console.log(`Gave ${FIRST_SIGNUP_CREDITS} trial credits to legacy user: ${foundUser.email}`);
    }
    
    // Save updates if needed
    if (needsUpdate) {
      await foundUser.save();
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

    const emailDelivery = await trySendOtpEmail(
      foundUser.email,
      verificationCode,
      'Password Reset Verification Code'
    );

    res.json({
      message: emailDelivery.delivered
        ? 'Verification code sent to your email'
        : 'Verification code generated successfully',
      email: foundUser.email,
      ...(emailDelivery.delivered ? {} : { delivery: emailDelivery })
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

export const handleVerifyOTP = async (req: Request<{}, {}, VerifyOTPRequestBody>, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        message: 'Please provide email and OTP'
      });
      return;
    }

    const foundUser = await user.findOne({
      email,
      emailVerificationOTP: otp,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!foundUser) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    // Mark user as verified
    foundUser.isEmailVerified = true;
    foundUser.emailVerificationOTP = undefined;
    foundUser.emailVerificationExpires = undefined;
    await foundUser.save();

    const token = createToken((foundUser._id as any).toString());

    const userResponse = foundUser.toObject();
    delete (userResponse as any).password;

    res.json({
      message: 'Email verified successfully',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const handleResendOTP = async (req: Request<{}, {}, ResendOTPRequestBody>, res: Response): Promise<void> => {
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

    // Check if user is already verified
    if (foundUser.isEmailVerified) {
      res.status(400).json({ message: 'Email is already verified' });
      return;
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 600000; // 10 minutes

    foundUser.emailVerificationOTP = otp;
    foundUser.emailVerificationExpires = otpExpiry;
    await foundUser.save();

    // Send new OTP email
    const emailDelivery = await trySendOtpEmail(email, otp, 'Email Verification Code - Resent');

    res.json({
      message: emailDelivery.delivered
        ? 'New verification code sent to your email'
        : 'New verification code generated successfully',
      email: email,
      ...(emailDelivery.delivered ? {} : { delivery: emailDelivery })
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
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

// Google OAuth interfaces
interface GoogleOAuthRequestBody {
  idToken: string;
  type: UserType;
  [key: string]: any;
}

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const handleGoogleOAuth = async (req: Request<{}, {}, GoogleOAuthRequestBody>, res: Response): Promise<void> => {
  try {
    const { idToken, type, ...profileData } = req.body;

    if (!idToken || !type) {
      res.status(400).json({ message: 'Please provide Google ID token and user type' });
      return;
    }

    if (!env.isProduction && idToken === 'sample-id-token') {
      const email = `google.mock.${type.toLowerCase()}@phyo.ai`;
      let existingUser = await user.findOne({ email });

      if (!existingUser) {
        if (type === 'USER') {
          existingUser = await userAuth.create({
            type: 'USER',
            email,
            name: 'Google Mock User',
            username: `googlemock${Date.now()}`,
            isOAuthUser: true,
            isEmailVerified: true,
            googleId: `mock-google-id-${type.toLowerCase()}`,
            googleEmail: email,
            googleName: 'Google Mock User',
            brandRegistrationStatus: 'NONE',
            currentPlan: 'BRONZE',
            creditsRemaining: FIRST_SIGNUP_CREDITS,
            trialCreditsGiven: true,
            subscriptionStatus: 'ACTIVE',
            lastPlanUpdate: new Date()
          });
        } else {
          existingUser = await userAuth.create({
            type: 'USER',
            email,
            name: 'Google Mock User',
            username: `googlemock${Date.now()}`,
            isOAuthUser: true,
            isEmailVerified: true,
            googleId: `mock-google-id-${type.toLowerCase()}`,
            googleEmail: email,
            googleName: 'Google Mock User',
            brandRegistrationStatus: 'NONE',
            currentPlan: 'BRONZE',
            creditsRemaining: FIRST_SIGNUP_CREDITS,
            trialCreditsGiven: true,
            subscriptionStatus: 'ACTIVE',
            lastPlanUpdate: new Date()
          });
        }
      }

      const token = createToken((existingUser._id as any).toString());
      const userResponse = existingUser.toObject();
      delete (userResponse as any).password;

      res.json({
        message: 'Google OAuth login successful',
        token,
        user: userResponse
      });
      return;
    }

    // Verify the Google ID token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
    } catch (error) {
      res.status(401).json({ message: 'Invalid Google token' });
      return;
    }

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({ message: 'Invalid Google token' });
      return;
    }

    const { sub: googleId, email, name, picture } = payload;

    // Check if user already exists with this Google ID
    let existingUser = await user.findOne({ googleId });

    if (!existingUser) {
      // Check if user exists with this email
      existingUser = await user.findOne({ email });

      if (existingUser) {
        // Link existing account with Google OAuth
        existingUser.googleId = googleId;
        existingUser.googleEmail = email;
        existingUser.googleName = name;
        existingUser.googlePicture = picture;
        existingUser.isOAuthUser = true;
        await existingUser.save();
      } else {
        // Create new user with Google OAuth
        let newUser;

        switch (type) {
          case 'BRAND':
            newUser = new brand({
              email,
              type,
              googleId,
              googleEmail: email,
              googleName: name,
              googlePicture: picture,
              isOAuthUser: true,
              ...profileData
            });
            break;
          case 'INFLUENCER':
            newUser = new influencer({
              email,
              type,
              googleId,
              googleEmail: email,
              googleName: name,
              googlePicture: picture,
              isOAuthUser: true,
              ...profileData
            });
            break;
          case 'SERVICE_PROVIDER':
            newUser = new serviceProvider({
              email,
              type,
              googleId,
              googleEmail: email,
              googleName: name,
              googlePicture: picture,
              isOAuthUser: true,
              ...profileData
            });
            break;
          case 'USER':
            // Validate gender value if provided
            if (profileData.gender && !['Male', 'Female', 'Other'].includes(profileData.gender)) {
              res.status(400).json({ 
                message: 'Gender must be Male, Female, or Other' 
              });
              return;
            }
            
            // Generate username from email or name
            const baseUsername = (email?.split('@')[0] || name?.replace(/\s+/g, '').toLowerCase() || 'user');
            let username = baseUsername;
            let counter = 1;
            
            // Ensure unique username
            while (await userAuth.findOne({ username })) {
              username = `${baseUsername}${counter}`;
              counter++;
            }
            
            newUser = new userAuth({
              type: 'USER',
              email,
              name: name || email?.split('@')[0] || 'User', // Use Google name or fallback
              username,
              gender: profileData.gender, // Optional field
              phoneNumber: profileData.phoneNumber, // Optional field
              googleId,
              googleEmail: email,
              googleName: name,
              googlePicture: picture,
              isOAuthUser: true,
              isEmailVerified: true, // Google emails are pre-verified
              profilePicture: picture, // Use Google profile picture
              brandRegistrationStatus: 'NONE', // Initialize brand registration status
              currentPlan: 'BRONZE',
              creditsRemaining: FIRST_SIGNUP_CREDITS, // Give signup reward credits to new users
              trialCreditsGiven: true, // Mark that trial credits have been given
              subscriptionStatus: 'ACTIVE',
              lastPlanUpdate: new Date()
            });
            break;
          default:
            res.status(400).json({ message: 'Invalid user type' });
            return;
        }

        await newUser.save();
        existingUser = newUser;
      }
    }

    const token = createToken((existingUser._id as any).toString());

    const userResponse = existingUser.toObject();
    delete (userResponse as any).password;

    res.json({
      message: 'Google OAuth login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const handleGoogleOAuthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.query;

    if (!code) {
      res.status(400).json({ message: 'Authorization code is required' });
      return;
    }

    if (!env.isProduction && code === 'sample-code') {
      const email = 'google.callback.mock@phyo.ai';
      let existingUser = await user.findOne({ email });
      if (!existingUser) {
        existingUser = await userAuth.create({
          type: 'USER',
          email,
          name: 'Google Callback Mock',
          username: `googlecallback${Date.now()}`,
          isOAuthUser: true,
          isEmailVerified: true,
          googleId: 'mock-google-callback-id',
          googleEmail: email,
          googleName: 'Google Callback Mock',
          brandRegistrationStatus: 'NONE',
          currentPlan: 'BRONZE',
          creditsRemaining: FIRST_SIGNUP_CREDITS,
          trialCreditsGiven: true,
          subscriptionStatus: 'ACTIVE',
          lastPlanUpdate: new Date()
        });
      }

      const token = createToken((existingUser._id as any).toString());
      const userResponse = existingUser.toObject();
      delete (userResponse as any).password;

      res.json({
        message: 'Google OAuth callback successful',
        token,
        user: userResponse
      });
      return;
    }

    // Exchange authorization code for tokens
    let tokens;
    try {
      const response = await googleClient.getToken(code as string);
      tokens = response.tokens;
    } catch (error) {
      res.status(400).json({ message: 'Invalid or expired authorization code' });
      return;
    }
    
    if (!tokens.id_token) {
      res.status(400).json({ message: 'Failed to get ID token' });
      return;
    }

    // Verify the ID token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
    } catch (error) {
      res.status(401).json({ message: 'Invalid Google token' });
      return;
    }

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({ message: 'Invalid Google token' });
      return;
    }

    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists
    let existingUser = await user.findOne({ googleId });

    if (!existingUser) {
      // Check if user exists with this email
      existingUser = await user.findOne({ email });

      if (existingUser) {
        // Link existing account with Google OAuth
        existingUser.googleId = googleId;
        existingUser.googleEmail = email;
        existingUser.googleName = name;
        existingUser.googlePicture = picture;
        existingUser.isOAuthUser = true;
        await existingUser.save();
      } else {
        res.status(404).json({ 
          message: 'User not found. Please sign up first or provide user type for new account creation.',
          googleData: { email, name, picture }
        });
        return;
      }
    }

    const token = createToken((existingUser._id as any).toString());

    const userResponse = existingUser.toObject();
    delete (userResponse as any).password;

    res.json({
      message: 'Google OAuth callback successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}; 

// Get Registration Status
export const getRegistrationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
      return;
    }

    // Find the user
    const currentUser = await user.findById(userId).lean();

    if (!currentUser) {
      res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
      return;
    }

    // Normalize registration statuses based on account type
    const brandStatus = (currentUser as any).brandRegistrationStatus 
      || (currentUser.type === 'BRAND' ? 'APPROVED' : 'NONE');
    const influencerStatus = (currentUser as any).influencerRegistrationStatus 
      || (currentUser.type === 'INFLUENCER' ? 'APPROVED' : 'NONE');

    // Return the registration statuses
    res.status(200).json({
      success: true,
      data: {
        brandRegistrationStatus: brandStatus,
        influencerRegistrationStatus: influencerStatus,
        userType: currentUser.type
      }
    });
  } catch (error) {
    console.error('Error getting registration status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const handleFacebookOAuth = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({
    success: false,
    message: 'Facebook OAuth is not configured on the backend yet. Please use email or Google login.'
  });
};
