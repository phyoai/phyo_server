import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import BrandRequest from '../models/brandRequest';
import { brand, user, userAuth } from '../models/auth';
import { AdminRequest } from '../middleware/admin';
import { AuthenticatedRequest } from '../types';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { extractFileUrls } from '../middleware/fileUpload';

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

const isProduction = process.env.NODE_ENV === 'production';
const FIRST_SIGNUP_CREDITS = 10;

// Generate OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate a random secure password
const generateSecurePassword = (): string => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Safely parse JSON strings coming from multipart/form-data
const parseJSONField = <T>(value: any): T | undefined => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return value as T;
};

// Send email notification
const sendEmail = async (email: string, subject: string, html: string): Promise<void> => {
  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: subject,
    html: html
  };

  await transporter.sendMail(mailOptions);
};

const sendEmailSafely = async (email: string, subject: string, html: string): Promise<void> => {
  try {
    await sendEmail(email, subject, html);
  } catch (error) {
    if (!isProduction) {
      console.warn('Brand email delivery skipped in non-production:', {
        email,
        subject,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }

    throw error;
  }
};

// Send OTP email for new brand accounts
const sendOTPEmail = async (email: string, otp: string, subject: string): Promise<void> => {
  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Email Verification</h2>
        <p style="color: #666; font-size: 16px;">Your brand account has been approved! Please verify your email with the code below:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p style="color: #666; font-size: 14px;">This code is valid for 10 minutes.</p>
        <p style="color: #666; font-size: 14px;">Welcome to Phyo! You can now start creating campaigns and connecting with influencers.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

const sendOTPEmailSafely = async (email: string, otp: string, subject: string): Promise<void> => {
  try {
    await sendOTPEmail(email, otp, subject);
  } catch (error) {
    if (!isProduction) {
      console.warn('Brand OTP email delivery skipped in non-production:', {
        email,
        subject,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }

    throw error;
  }
};

interface BrandSubmissionRequest {
  // Step 1: Company Information (Required)
  company_name: string;
  website_url: string;
  industry: string;
  company_type?: string;
  company_size?: string;
  company_description?: string;
  location?: string;
  country?: string;
  
  // Step 2: Brand Identity (Optional)
  company_logo?: string;
  brand_images?: string[];
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  brand_story?: string;
  
  // Step 3: Verification Documents (Optional)
  verification_documents?: {
    business_registration?: string;
    tax_id?: string;
    company_registration_number?: string;
    authorization_letter?: string;
  };
  
  // Step 4: Billing Information (Optional)
  billing_info?: {
    billing_address?: string;
    contact_person?: string;
    finance_email?: string;
  };
  
  // Step 5: Payment Method (Optional)
  payment_method?: {
    card_details?: any;
    bank_account?: any;
    default_payment?: 'card' | 'bank';
    budget_limit?: number;
  };
  
  // Step 6: Subscription Plan (Optional)
  subscription_plan?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PREMIUM';
  
  // Step 7: Team Setup (Optional)
  team_members?: Array<{
    email: string;
    role: string;
    permissions: string[];
  }>;
  
  // Step 8: Preferences (Optional)
  preferences?: {
    notifications?: boolean;
    email_preferences?: string[];
    timezone?: string;
    language?: string;
  };
  
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    job_title?: string;
  };
  account: {
    signup_method: 'email' | 'google' | 'linkedin' | 'sso';
  };
}

// Handle brand registration submission
export const submitBrandRegistration = async (
  req: AuthenticatedRequest<{}, {}, BrandSubmissionRequest>, 
  res: Response
): Promise<void> => {
  try {
    // Parse nested JSON payloads if they arrive as strings (common with FormData)
    req.body.contact = parseJSONField(req.body.contact) || req.body.contact;
    req.body.social_media = parseJSONField(req.body.social_media) || req.body.social_media;
    req.body.verification_documents = parseJSONField(req.body.verification_documents) || req.body.verification_documents;
    req.body.billing_info = parseJSONField(req.body.billing_info) || req.body.billing_info;
    req.body.payment_method = parseJSONField(req.body.payment_method) || req.body.payment_method;
    req.body.subscription_plan = parseJSONField(req.body.subscription_plan) || req.body.subscription_plan;
    req.body.team_members = parseJSONField(req.body.team_members) || req.body.team_members;
    req.body.preferences = parseJSONField(req.body.preferences) || req.body.preferences;
    req.body.account = parseJSONField(req.body.account) || req.body.account;

    // Extract file URLs if any files were uploaded (after parsing contact email)
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const userEmail = (req as any).user?.email || req.body.contact?.email || 'anonymous';
    const fileUrls = await extractFileUrls(files, userEmail);

    const {
      company_name,
      website_url,
      industry,
      company_type,
      company_size,
      company_description,
      location,
      country,
      social_media,
      brand_story,
      verification_documents,
      billing_info,
      payment_method,
      subscription_plan,
      team_members,
      preferences,
      contact,
      account
    } = req.body;

    // Check if user is authenticated (existing USER wants to convert to BRAND)
    const isAuthenticated = !!req.user;
    let userId = null;
    let existingUserAccount = null;

    if (isAuthenticated) {
      // Authenticated user - converting USER to BRAND
      userId = req.user!.id;
      existingUserAccount = await user.findById(userId);

      if (!existingUserAccount) {
        res.status(404).json({ message: 'User account not found' });
        return;
      }

      // Check if user is already a BRAND
      if (existingUserAccount.type === 'BRAND') {
        res.status(400).json({ 
          message: 'You are already registered as a brand.' 
        });
        return;
      }

      // Check if user type is USER
      if (existingUserAccount.type !== 'USER') {
        res.status(400).json({ 
          message: 'Only USER type accounts can request brand conversion.' 
        });
        return;
      }

      // Use authenticated user's email
      contact.email = existingUserAccount.email;
    } else {
      // Non-authenticated user - new brand registration
      // Validate required fields for non-authenticated users
      if (!company_name || !website_url || !industry || !contact.first_name || 
          !contact.last_name || !contact.email || !account.signup_method) {
        res.status(400).json({ 
          message: 'Missing required fields. Please fill in all required information.' 
        });
        return;
      }
    }

    // Check if email already exists in brand requests
    const existingRequest = await BrandRequest.findOne({ 'contact.email': contact.email });

    if (existingRequest) {
      res.status(400).json({ 
        message: 'A brand registration request already exists with this email address.',
        status: existingRequest.status
      });
      return;
    }

    // For non-authenticated users, check if brand account already exists
    if (!isAuthenticated) {
      const existingBrand = await brand.findOne({ email: contact.email });
      if (existingBrand) {
        res.status(400).json({ 
          message: 'An account already exists with this email address.' 
        });
        return;
      }
    }

    // Merge uploaded file URLs with provided data
    const mergedVerificationDocs = {
      ...verification_documents,
      ...(fileUrls.business_registration && { business_registration: fileUrls.business_registration }),
      ...(fileUrls.authorization_letter && { authorization_letter: fileUrls.authorization_letter })
    };

    // Create brand request with all optional fields
    const brandRequest = new BrandRequest({
      // Step 1: Company Information
      company_name,
      website_url,
      industry,
      company_type,
      company_size,
      company_description,
      location,
      country,
      
      // Step 2: Brand Identity
      company_logo: fileUrls.company_logo || undefined,
      brand_images: fileUrls.brand_images || [],
      social_media,
      brand_story,
      
      // Step 3: Verification Documents (Optional)
      verification_documents: mergedVerificationDocs,
      
      // Step 4: Billing Information (Optional)
      billing_info,
      
      // Step 5: Payment Method (Optional)
      payment_method,
      
      // Step 6: Subscription Plan (Optional)
      subscription_plan: subscription_plan || 'BRONZE',
      
      // Step 7: Team Setup (Optional)
      team_members,
      
      // Step 8: Preferences (Optional)
      preferences,
      
      contact,
      account: {
        signup_method: account.signup_method
      },
      status: 'PENDING',
      userId: userId, // Will be null for non-authenticated users
      isUserConversion: isAuthenticated // Flag to indicate if this is a USER conversion
    });

    await brandRequest.save();

    // Update user's brandRegistrationStatus if authenticated
    if (isAuthenticated && existingUserAccount) {
      await userAuth.findByIdAndUpdate(userId, {
        brandRegistrationStatus: 'PENDING'
      });
    }

    // Update user's brandRegistrationStatus if authenticated
    if (isAuthenticated && existingUserAccount) {
      await userAuth.findByIdAndUpdate(userId, {
        brandRegistrationStatus: 'PENDING'
      });
    }

    // Send confirmation email
    const emailMessage = isAuthenticated 
      ? `We've received your request to convert your account to a Brand account for <strong>${company_name}</strong>. 
         Our team will review your application and get back to you within 24-48 hours.`
      : `We've received your brand registration request for <strong>${company_name}</strong>. 
         Our team will review your application and get back to you within 24-48 hours.`;

    const additionalInfo = isAuthenticated
      ? `<p style="color: #666; font-size: 16px;">
           Once approved, your account will be converted to a Brand account and you can use your existing login credentials.
         </p>`
      : `<p style="color: #666; font-size: 16px;">
           Once approved, you'll receive an email with instructions to verify your account and start using Phyo.
         </p>`;

    // Send confirmation email to the brand
    await sendEmailSafely(
      contact.email,
      'Brand Registration Submitted - Phyo',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Thank you for your interest in ${isAuthenticated ? 'registering' : 'joining Phyo'} as a Brand!</h2>
        <p style="color: #666; font-size: 16px;">Hi ${contact.first_name},</p>
        <p style="color: #666; font-size: 16px;">
          ${emailMessage}
        </p>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Submitted Details:</h3>
          <p style="margin: 5px 0; color: #666;"><strong>Company:</strong> ${company_name}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Industry:</strong> ${industry}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Website:</strong> ${website_url}</p>
          ${company_type ? `<p style="margin: 5px 0; color: #666;"><strong>Company Type:</strong> ${company_type}</p>` : ''}
          ${company_size ? `<p style="margin: 5px 0; color: #666;"><strong>Company Size:</strong> ${company_size}</p>` : ''}
        </div>
        ${additionalInfo}
        <p style="color: #666; font-size: 14px;">
          If you have any questions, please don't hesitate to contact our support team.
        </p>
      </div>
      `
    );

    res.status(200).json({
      message: 'Brand registration submitted successfully! We will review your application and confirm by email within 24-48 hours.',
      request_id: brandRequest._id,
      is_conversion: isAuthenticated
    });

  } catch (error) {
    console.error('Brand registration submission error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
};

// Admin: Get all brand requests
export const getAllBrandRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    
    const query: any = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { company_name: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } },
        { 'contact.first_name': { $regex: search, $options: 'i' } },
        { 'contact.last_name': { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const requests = await BrandRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await BrandRequest.countDocuments(query);

    res.status(200).json({
      requests,
      pagination: {
        current_page: parseInt(page as string),
        total_pages: Math.ceil(total / parseInt(limit as string)),
        total_requests: total,
        limit: parseInt(limit as string)
      }
    });

  } catch (error) {
    console.error('Get brand requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: Get single brand request
export const getBrandRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const brandRequest = await BrandRequest.findById(id);
    if (!brandRequest) {
      res.status(404).json({ message: 'Brand request not found' });
      return;
    }

    res.status(200).json({ request: brandRequest });

  } catch (error) {
    console.error('Get brand request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: Approve brand request
export const approveBrandRequest = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    
    const brandRequest = await BrandRequest.findById(id);
    if (!brandRequest) {
      res.status(404).json({ message: 'Brand request not found' });
      return;
    }

    if (brandRequest.status !== 'PENDING') {
      res.status(400).json({ message: 'Brand request has already been reviewed' });
      return;
    }

    let newBrandId;

    // Check if this is a USER to BRAND conversion
    if (brandRequest.isUserConversion && brandRequest.userId) {
      // Convert existing USER to BRAND
      const existingUser = await user.findById(brandRequest.userId);
      
      if (!existingUser) {
        res.status(404).json({ message: 'User account not found' });
        return;
      }

      if (existingUser.type === 'BRAND') {
        res.status(400).json({ message: 'User is already a BRAND' });
        return;
      }

      const convertUserToBrand = async (session?: mongoose.ClientSession) => {
        const userData = existingUser.toObject();
        
        // Delete the old USER document
        if (session) {
          await userAuth.findByIdAndDelete(brandRequest.userId, { session });
        } else {
          await userAuth.findByIdAndDelete(brandRequest.userId);
        }
        
        // Create new BRAND document with same _id and credentials
        const convertedBrand = new brand({
          _id: existingUser._id,
          email: existingUser.email,
          password: existingUser.password,
          type: 'BRAND',
          companyName: brandRequest.company_name,
          industry: brandRequest.industry,
          website: brandRequest.website_url,
          description: brandRequest.company_description,
          company_type: brandRequest.company_type,
          company_size: brandRequest.company_size,
          location: brandRequest.location,
          country: brandRequest.country,
          company_logo: brandRequest.company_logo,
          brand_images: brandRequest.brand_images,
          social_media: brandRequest.social_media,
          brand_story: brandRequest.brand_story,
          verification_documents: brandRequest.verification_documents,
          billing_info: brandRequest.billing_info,
          payment_method: brandRequest.payment_method,
          subscription_plan: brandRequest.subscription_plan || 'BRONZE',
          team_members: brandRequest.team_members,
          preferences: brandRequest.preferences,
          contact: brandRequest.contact,
          signup_method: brandRequest.account.signup_method,
          isEmailVerified: existingUser.isEmailVerified,
          isOAuthUser: existingUser.isOAuthUser,
          googleId: existingUser.googleId,
          googleEmail: existingUser.googleEmail,
          googleName: existingUser.googleName,
          googlePicture: existingUser.googlePicture,
          currentPlan: existingUser.currentPlan,
          subscriptionId: existingUser.subscriptionId,
          subscriptionStatus: existingUser.subscriptionStatus,
          creditsRemaining: existingUser.creditsRemaining,
          trialCreditsGiven: existingUser.trialCreditsGiven,
          lastPlanUpdate: existingUser.lastPlanUpdate,
          createdAt: (userData as any).createdAt,
          updatedAt: new Date()
        });

        if (session) {
          await convertedBrand.save({ session });
        } else {
          await convertedBrand.save();
        }
        newBrandId = convertedBrand._id;

        // Update brand request status
        brandRequest.status = 'APPROVED';
        brandRequest.admin_notes = admin_notes;
        brandRequest.reviewed_by = req.admin?.email || 'Admin';
        brandRequest.reviewed_at = new Date();
        if (session) {
          await brandRequest.save({ session });
        } else {
          await brandRequest.save();
        }

        return convertedBrand;
      };

      const session = await mongoose.startSession();
      let usedTransaction = false;

      try {
        session.startTransaction();
        usedTransaction = true;
        await convertUserToBrand(session);
        await session.commitTransaction();
      } catch (error) {
        if (usedTransaction) {
          await session.abortTransaction().catch(() => {});
        }

        const isStandaloneMongoTransactionError =
          error instanceof Error &&
          error.message.includes('Transaction numbers are only allowed on a replica set member or mongos');

        if (!isStandaloneMongoTransactionError) {
          throw error;
        }

        // Local standalone MongoDB does not support transactions, so retry without one.
        await convertUserToBrand();
      } finally {
        session.endSession();
      }

      try {
        // Send approval email WITHOUT credentials (user uses existing ones)
        await sendEmailSafely(
          brandRequest.contact.email,
          'Congratulations! Your Account Has Been Converted to Brand - Phyo',
          `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Phyo as a Brand</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header with gradient -->
              <div style="background: linear-gradient(135deg, #064e3b 0%, #10b981 100%); padding: 40px 30px; text-align: center;">
                <div style="background-color: white; width: 80px; height: 80px; margin: 0 auto 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                  <span style="font-size: 48px;">🎉</span>
                </div>
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Congratulations!</h1>
              </div>

              <!-- Content -->
              <div style="padding: 40px 30px;">
                <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hi ${brandRequest.contact.first_name},</p>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                  Great news! Your account has been successfully converted to a Brand account for <strong style="color: #10b981;">${brandRequest.company_name}</strong>!
                </p>

                <!-- Info Box -->
                <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
                  <h2 style="color: #065f46; margin: 0 0 16px; font-size: 18px; font-weight: 700; display: flex; align-items: center;">
                    <span style="margin-right: 8px;">ℹ️</span> Important Information
                  </h2>
                  <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6;">
                    You can continue using your <strong>existing login credentials</strong>. No need to remember new passwords! 
                    Just log in with your usual email and password.
                  </p>
                </div>

                <!-- What's Next Section -->
                <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin: 0 0 30px;">
                  <h3 style="color: #1f2937; margin: 0 0 16px; font-size: 18px; font-weight: 700;">What's Next?</h3>
                  <ul style="margin: 0; padding: 0 0 0 20px; color: #4b5563; font-size: 15px; line-height: 2;">
                    <li>Login to your account using your existing credentials</li>
                    <li>Complete your brand profile</li>
                    <li>Start creating campaigns</li>
                    <li>Connect with influencers</li>
                    <li>Access all brand features and tools!</li>
                  </ul>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 0 0 30px;">
                  <a href="${process.env.CLIENT_URL || 'https://phyo.ai'}/login" 
                     style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
                    Login Now
                  </a>
                </div>

                <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0; text-align: center;">
                  If you have any questions or need assistance, our support team is here to help!
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
                  Welcome to the Phyo Brand community!
                </p>
                <p style="color: #9ca3af; font-size: 13px; margin: 8px 0 0; text-align: center;">
                  © ${new Date().getFullYear()} Phyo. All rights reserved.
                </p>
              </div>

            </div>
          </body>
          </html>
          `
        );

        res.status(200).json({
          message: 'User account successfully converted to Brand. User can continue using their existing credentials.',
          brand_id: newBrandId
        });
      } catch (error) {
        throw error;
      }

    } else {
      // Create NEW brand account with generated password (original flow)
      const generatedPassword = generateSecurePassword();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(generatedPassword, salt);

      // Create the brand account with email already verified
      const newBrand = new brand({
        email: brandRequest.contact.email,
        password: hashedPassword,
        type: 'BRAND',
        companyName: brandRequest.company_name,
        industry: brandRequest.industry,
        website: brandRequest.website_url,
        description: brandRequest.company_description,
        company_type: brandRequest.company_type,
        company_size: brandRequest.company_size,
        location: brandRequest.location,
        country: brandRequest.country,
        company_logo: brandRequest.company_logo,
        brand_images: brandRequest.brand_images,
        social_media: brandRequest.social_media,
        brand_story: brandRequest.brand_story,
        verification_documents: brandRequest.verification_documents,
        billing_info: brandRequest.billing_info,
        payment_method: brandRequest.payment_method,
        subscription_plan: brandRequest.subscription_plan || 'BRONZE',
        team_members: brandRequest.team_members,
        preferences: brandRequest.preferences,
        contact: brandRequest.contact,
        signup_method: brandRequest.account.signup_method,
        isEmailVerified: true, // Email is pre-verified by admin approval
        currentPlan: 'BRONZE',
        creditsRemaining: FIRST_SIGNUP_CREDITS,
        trialCreditsGiven: true,
        subscriptionStatus: 'ACTIVE',
        lastPlanUpdate: new Date()
      });

      await newBrand.save();
      newBrandId = newBrand._id;

      // Update brand request status
      brandRequest.status = 'APPROVED';
      brandRequest.admin_notes = admin_notes;
      brandRequest.reviewed_by = req.admin?.email || 'Admin';
      brandRequest.reviewed_at = new Date();
      await brandRequest.save();

      // Send approval email WITH login credentials (original flow)
      await sendEmailSafely(
        brandRequest.contact.email,
        'Brand Account Approved - Welcome to Phyo!',
        `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Phyo</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header with gradient -->
            <div style="background: linear-gradient(135deg, #064e3b 0%, #10b981 100%); padding: 40px 30px; text-align: center;">
              <div style="background-color: white; width: 80px; height: 80px; margin: 0 auto 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                <span style="font-size: 48px;">🎉</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Welcome to Phyo!</h1>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hi ${brandRequest.contact.first_name},</p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Great news! Your brand account for <strong style="color: #10b981;">${brandRequest.company_name}</strong> has been approved!
              </p>

              <!-- Login Credentials Box -->
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
                <h2 style="color: #065f46; margin: 0 0 16px; font-size: 18px; font-weight: 700; display: flex; align-items: center;">
                  <span style="margin-right: 8px;">🔐</span> Your Login Credentials
                </h2>
                <div style="background-color: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                  <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Email:</p>
                  <p style="margin: 0; color: #1f2937; font-size: 15px; font-weight: 500;">${brandRequest.contact.email}</p>
                </div>
                <div style="background-color: #ffffff; border-radius: 8px; padding: 16px;">
                  <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Password:</p>
                  <p style="margin: 0; color: #dc2626; font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px;">${generatedPassword}</p>
                </div>
              </div>

              <!-- Important Warning -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 0 0 30px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong style="font-weight: 700;">⚠️ Important:</strong> For security reasons, please change your password after your first login.
                </p>
              </div>

              <!-- What's Next Section -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin: 0 0 30px;">
                <h3 style="color: #1f2937; margin: 0 0 16px; font-size: 18px; font-weight: 700;">What's Next?</h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #4b5563; font-size: 15px; line-height: 2;">
                  <li>Login to your account using the credentials above</li>
                  <li>Complete your brand profile</li>
                  <li>Start creating campaigns</li>
                  <li>Connect with influencers</li>
                  <li>You have <strong style="color: #10b981;">${FIRST_SIGNUP_CREDITS} free trial credits</strong> to get started!</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 0 0 30px;">
                <a href="${process.env.CLIENT_URL || 'https://phyo.ai'}/login" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
                  Login Now
                </a>
              </div>

              <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0; text-align: center;">
                If you have any questions or need assistance, our support team is here to help!
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
                This email contains sensitive information. Please do not share your password with anyone.
              </p>
              <p style="color: #9ca3af; font-size: 13px; margin: 8px 0 0; text-align: center;">
                © ${new Date().getFullYear()} Phyo. All rights reserved.
              </p>
            </div>

          </div>
        </body>
        </html>
        `
      );

      res.status(200).json({
        message: 'Brand request approved successfully. Login credentials sent to the brand.',
        brand_id: newBrandId
      });
    }

  } catch (error) {
    console.error('Approve brand request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: Reject brand request
export const rejectBrandRequest = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_notes, rejection_reason } = req.body;
    
    const brandRequest = await BrandRequest.findById(id);
    if (!brandRequest) {
      res.status(404).json({ message: 'Brand request not found' });
      return;
    }

    if (brandRequest.status !== 'PENDING') {
      res.status(400).json({ message: 'Brand request has already been reviewed' });
      return;
    }

    // Update brand request status
    brandRequest.status = 'REJECTED';
    brandRequest.admin_notes = admin_notes;
    brandRequest.reviewed_by = req.admin?.email || 'Admin';
    brandRequest.reviewed_at = new Date();
    await brandRequest.save();

    // Update user's brandRegistrationStatus if this was a conversion request
    if (brandRequest.isUserConversion && brandRequest.userId) {
      await userAuth.findByIdAndUpdate(brandRequest.userId, {
        brandRegistrationStatus: 'DECLINED'
      });
    }

    // Determine email message based on whether it's a conversion or new brand
    const message = brandRequest.isUserConversion
      ? `Thank you for your interest in converting your account to a Brand account. After reviewing your application for <strong>${brandRequest.company_name}</strong>, 
         we are unable to approve your request at this time.`
      : `Thank you for your interest in Phyo. After reviewing your application for <strong>${brandRequest.company_name}</strong>, 
         we are unable to approve your registration at this time.`;

    const additionalMessage = brandRequest.isUserConversion
      ? `<p style="color: #666; font-size: 16px;">
           You can continue using your account as a regular user. If you believe this decision was made in error or if you have additional information to share, 
           please feel free to contact our support team.
         </p>`
      : `<p style="color: #666; font-size: 16px;">
           If you believe this decision was made in error or if you have additional information to share, 
           please feel free to contact our support team.
         </p>`;

    // Send rejection email
    await sendEmailSafely(
      brandRequest.contact.email,
      'Brand Registration Update - Phyo',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Brand Registration Update</h2>
        <p style="color: #666; font-size: 16px;">Hi ${brandRequest.contact.first_name},</p>
        <p style="color: #666; font-size: 16px;">
          ${message}
        </p>
        ${rejection_reason ? `
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="margin: 0 0 10px 0; color: #856404;">Reason:</h3>
          <p style="margin: 0; color: #856404;">${rejection_reason}</p>
        </div>
        ` : ''}
        ${additionalMessage}
        <p style="color: #666; font-size: 14px;">
          You're welcome to submit a new application in the future if your circumstances change.
        </p>
      </div>
      `
    );

    res.status(200).json({
      message: 'Brand request rejected successfully. Notification email sent to the brand.'
    });

  } catch (error) {
    console.error('Reject brand request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get brand request statistics for admin dashboard
export const getBrandRequestStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await BrandRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalRequests = await BrandRequest.countDocuments();
    const todayRequests = await BrandRequest.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    const formattedStats = {
      total: totalRequests,
      today: todayRequests,
      pending: stats.find(s => s._id === 'PENDING')?.count || 0,
      approved: stats.find(s => s._id === 'APPROVED')?.count || 0,
      rejected: stats.find(s => s._id === 'REJECTED')?.count || 0
    };

    res.status(200).json({ stats: formattedStats });

  } catch (error) {
    console.error('Get brand request stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Brand: Update brand profile (for brands to update their details after approval)
export const updateBrandProfile = async (
  req: AuthenticatedRequest<{}, {}, Partial<BrandSubmissionRequest>>, 
  res: Response
): Promise<void> => {
  try {
    // Ensure user is authenticated and is a BRAND
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized. Please login.' });
      return;
    }

    const brandId = req.user.id;
    const brandAccount = await brand.findById(brandId);

    if (!brandAccount) {
      res.status(404).json({ message: 'Brand account not found' });
      return;
    }

    if (brandAccount.type !== 'BRAND') {
      res.status(403).json({ message: 'Only brand accounts can update brand profile' });
      return;
    }

    // Extract file URLs if any files were uploaded
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const userEmail = brandAccount.email;
    const fileUrls = await extractFileUrls(files, userEmail);

    // Parse nested JSON payloads if they arrive as strings (common with FormData)
    req.body.contact = parseJSONField(req.body.contact) || req.body.contact;
    req.body.social_media = parseJSONField(req.body.social_media) || req.body.social_media;
    req.body.verification_documents = parseJSONField(req.body.verification_documents) || req.body.verification_documents;
    req.body.billing_info = parseJSONField(req.body.billing_info) || req.body.billing_info;
    req.body.payment_method = parseJSONField(req.body.payment_method) || req.body.payment_method;
    req.body.subscription_plan = parseJSONField(req.body.subscription_plan) || req.body.subscription_plan;
    req.body.team_members = parseJSONField(req.body.team_members) || req.body.team_members;
    req.body.preferences = parseJSONField(req.body.preferences) || req.body.preferences;

    const {
      company_name,
      website_url,
      industry,
      company_type,
      company_size,
      company_description,
      location,
      country,
      social_media,
      brand_story,
      verification_documents,
      billing_info,
      payment_method,
      subscription_plan,
      team_members,
      preferences,
      contact
    } = req.body;

    // Build update object with only provided fields
    const updateData: any = {};

    // Step 1: Company Information
    if (company_name) updateData.companyName = company_name;
    if (website_url) updateData.website = website_url;
    if (industry) updateData.industry = industry;
    if (company_type) updateData.company_type = company_type;
    if (company_size) updateData.company_size = company_size;
    if (company_description) updateData.description = company_description;
    if (location) updateData.location = location;
    if (country) updateData.country = country;

    // Step 2: Brand Identity
    if (fileUrls.company_logo) {
      updateData.company_logo = fileUrls.company_logo;
    }
    
    if (fileUrls.brand_images && fileUrls.brand_images.length > 0) {
      // Append new images to existing ones
      const existingImages = brandAccount.brand_images || [];
      updateData.brand_images = [...existingImages, ...fileUrls.brand_images];
    }
    
    if (social_media) updateData.social_media = social_media;
    if (brand_story) updateData.brand_story = brand_story;

    // Step 3: Verification Documents
    if (verification_documents || fileUrls.business_registration || fileUrls.authorization_letter) {
      const existingDocs = brandAccount.verification_documents || {};
      updateData.verification_documents = {
        ...existingDocs,
        ...(verification_documents || {}),
        ...(fileUrls.business_registration && { business_registration: fileUrls.business_registration }),
        ...(fileUrls.authorization_letter && { authorization_letter: fileUrls.authorization_letter })
      };
    }

    // Step 4: Billing Information
    if (billing_info) updateData.billing_info = billing_info;

    // Step 5: Payment Method
    if (payment_method) updateData.payment_method = payment_method;

    // Step 6: Subscription Plan
    if (subscription_plan) updateData.subscription_plan = subscription_plan;

    // Step 7: Team Setup
    if (team_members !== undefined) updateData.team_members = team_members;

    // Step 8: Preferences
    if (preferences) updateData.preferences = preferences;

    // Contact information
    if (contact) updateData.contact = contact;

    // Update the brand account
    const updatedBrand = await brand.findByIdAndUpdate(
      brandId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationOTP -emailVerificationExpires');

    res.status(200).json({
      message: 'Brand profile updated successfully',
      brand: updatedBrand,
      uploaded_files: Object.keys(fileUrls).length > 0 ? fileUrls : undefined
    });

  } catch (error) {
    console.error('Update brand profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
};

// Brand: Get own brand profile
export const getBrandProfile = async (
  req: AuthenticatedRequest, 
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized. Please login.' });
      return;
    }

    const brandId = req.user.id;
    const brandAccount = await brand.findById(brandId)
      .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationOTP -emailVerificationExpires');

    if (!brandAccount) {
      res.status(404).json({ message: 'Brand account not found' });
      return;
    }

    if (brandAccount.type !== 'BRAND') {
      res.status(403).json({ message: 'Only brand accounts can access brand profile' });
      return;
    }

    res.status(200).json({
      brand: brandAccount
    });

  } catch (error) {
    console.error('Get brand profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
};
