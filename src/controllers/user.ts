import { Request, Response } from 'express';
import { user } from '../models/auth';
import { AuthenticatedRequest, UserType } from '../types';
import { sendSuccess } from '../utils/http';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface UpdateProfileBody {
  email?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  profilePicture?: string;
  about?: string;
  gender?: 'Male' | 'Female' | 'Other';
  phoneNumber?: string;
  phone?: string;
  companyName?: string;
  industry?: string;
  website?: string;
  description?: string;
  company_type?: string;
  company_size?: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';
  location?: string;
  country?: string;
  company_logo?: string;
  brand_images?: string[];
  brandImages?: string[];
  categories?: string[];
  social_media?: Record<string, unknown>;
  socialMedia?: Record<string, unknown>;
  brand_story?: string;
  verification_documents?: Record<string, unknown>;
  billing_info?: Record<string, unknown>;
  billingAddress?: string;
  financeEmail?: string;
  payment_method?: Record<string, unknown>;
  team_members?: Array<Record<string, unknown>>;
  preferences?: Record<string, unknown>;
  contact?: Record<string, unknown>;
  services?: string[];
  [key: string]: any;
}

interface VerifyEmailChangeBody {
  otp?: string;
  code?: string;
}

const PROFILE_SAFE_SELECT =
  '-password -resetPasswordToken -resetPasswordExpires -emailVerificationOTP -emailVerificationExpires -pendingEmailVerificationOTP -pendingEmailVerificationExpires';
const PROFILE_OWNER_SELECT = `${PROFILE_SAFE_SELECT} +pendingEmail +pendingEmailRequestedAt`;
const PROFILE_MUTATION_SELECT = '+pendingEmail +pendingEmailVerificationOTP +pendingEmailVerificationExpires +pendingEmailRequestedAt';
const EMAIL_CHANGE_OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_PATTERN = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST;
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

const STRUCTURED_PROFILE_FIELDS = [
  'brand_images',
  'brandImages',
  'categories',
  'social_media',
  'socialMedia',
  'verification_documents',
  'billing_info',
  'payment_method',
  'team_members',
  'preferences',
  'contact',
  'services'
] as const;

const BASE_PROFILE_UPDATE_FIELDS = ['about', 'email'] as const;

const PROFILE_UPDATE_FIELDS_BY_TYPE: Record<UserType, readonly string[]> = {
  USER: ['name', 'username', 'bio', 'profilePicture', 'gender', 'phoneNumber'],
  INFLUENCER: ['name', 'username', 'bio', 'profilePicture'],
  BRAND: [
    'companyName',
    'industry',
    'website',
    'description',
    'company_type',
    'company_size',
    'location',
    'country',
    'company_logo',
    'brand_images',
    'categories',
    'social_media',
    'brand_story',
    'verification_documents',
    'billing_info',
    'payment_method',
    'team_members',
    'preferences',
    'contact'
  ],
  SERVICE_PROVIDER: ['companyName', 'services', 'description']
};

const parseJSONField = <T>(value: unknown): T | undefined => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }

  return value as T;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : '';
};

const normalizeEmail = (value: unknown): string | undefined => {
  const normalizedValue = normalizeString(value);
  return normalizedValue === undefined ? undefined : normalizedValue.toLowerCase();
};

const isValidEmail = (value: string): boolean => EMAIL_PATTERN.test(value);

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const parsedValue = parseJSONField<unknown>(value);
    if (parsedValue !== undefined && parsedValue !== value) {
      return normalizeStringArray(parsedValue);
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
};

const mergeNestedObject = (
  payload: Record<string, unknown>,
  field: string,
  value: Record<string, unknown>
): void => {
  if (Object.keys(value).length === 0) {
    return;
  }

  const existingValue = payload[field];
  payload[field] = {
    ...(isPlainObject(existingValue) ? existingValue : {}),
    ...value
  };
};

const splitFullName = (
  fullName: string
): { firstName?: string; lastName?: string } => {
  const normalizedFullName = fullName.trim().replace(/\s+/g, ' ');

  if (!normalizedFullName) {
    return {};
  }

  const [firstName, ...rest] = normalizedFullName.split(' ');
  return {
    firstName,
    lastName: rest.join(' ') || undefined
  };
};

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendEmailChangeOTP = async (email: string, otp: string): Promise<void> => {
  await transporter.sendMail({
    from: EMAIL_USER,
    to: email,
    subject: 'Confirm your new email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Confirm your new email</h2>
        <p style="color: #666; font-size: 16px;">
          Use the verification code below to confirm this email address for your Phyo account.
        </p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p style="color: #666; font-size: 14px;">This code is valid for 10 minutes.</p>
      </div>
    `
  });
};

const trySendEmailChangeOTP = async (
  email: string,
  otp: string
): Promise<{ delivered: boolean; skippedReason?: string }> => {
  try {
    await sendEmailChangeOTP(email, otp);
    return { delivered: true };
  } catch (error) {
    logger.error('Email change OTP delivery failed', {
      email,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    if (!env.isProduction) {
      return {
        delivered: false,
        skippedReason: 'Email delivery skipped in non-production environment'
      };
    }

    throw error;
  }
};

const clearPendingEmailChange = (foundUser: any): void => {
  foundUser.set('pendingEmail', undefined);
  foundUser.set('pendingEmailVerificationOTP', undefined);
  foundUser.set('pendingEmailVerificationExpires', undefined);
  foundUser.set('pendingEmailRequestedAt', undefined);
};

const getOwnerProfile = async (userId: string) => {
  return user.findById(userId).select(PROFILE_OWNER_SELECT);
};

const flattenForSet = (
  input: unknown,
  prefix = '',
  acc: Record<string, unknown> = {}
): Record<string, unknown> => {
  if (
    input === null ||
    Array.isArray(input) ||
    typeof input !== 'object' ||
    input instanceof Date
  ) {
    if (prefix) {
      acc[prefix] = input;
    }

    return acc;
  }

  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenForSet(value, nextPrefix, acc);
  });

  return acc;
};

const sanitizeProfilePatch = (
  payload: UpdateProfileBody,
  accountType: UserType
): Record<string, unknown> => {
  const normalizedPayload: Record<string, unknown> = { ...payload };

  STRUCTURED_PROFILE_FIELDS.forEach((field) => {
    if (normalizedPayload[field] !== undefined) {
      const parsedValue = parseJSONField(normalizedPayload[field]);
      if (parsedValue !== undefined) {
        normalizedPayload[field] = parsedValue;
      }
    }
  });

  const normalizedBrandImages = normalizeStringArray(
    normalizedPayload.brandImages ?? normalizedPayload.brand_images
  );
  if (normalizedBrandImages !== undefined) {
    normalizedPayload.brand_images = normalizedBrandImages;
  }

  const normalizedCategories = normalizeStringArray(normalizedPayload.categories);
  if (normalizedCategories !== undefined) {
    normalizedPayload.categories = normalizedCategories;
  }

  const normalizedServices = normalizeStringArray(normalizedPayload.services);
  if (normalizedServices !== undefined) {
    normalizedPayload.services = normalizedServices;
  }

  if (normalizedPayload.socialMedia !== undefined && normalizedPayload.social_media === undefined) {
    normalizedPayload.social_media = normalizedPayload.socialMedia;
  }

  const normalizedEmail = normalizeEmail(normalizedPayload.email);
  if (normalizedEmail !== undefined) {
    normalizedPayload.email = normalizedEmail;
  }

  const directName = normalizeString(normalizedPayload.name);
  const directFullName = normalizeString(normalizedPayload.fullName);
  const firstName = normalizeString(normalizedPayload.firstName);
  const lastName = normalizeString(normalizedPayload.lastName);
  const phone = normalizeString(normalizedPayload.phone ?? normalizedPayload.phoneNumber);
  const billingAddress = normalizeString(normalizedPayload.billingAddress);
  const financeEmail = normalizeEmail(normalizedPayload.financeEmail);

  if (accountType === 'BRAND') {
    const contactPatch: Record<string, unknown> = {};
    const nameToSplit = directFullName ?? directName;

    if (nameToSplit && !firstName && !lastName) {
      const splitName = splitFullName(nameToSplit);
      if (splitName.firstName !== undefined) {
        contactPatch.first_name = splitName.firstName;
      }
      if (splitName.lastName !== undefined) {
        contactPatch.last_name = splitName.lastName;
      }
    }

    if (firstName !== undefined) {
      contactPatch.first_name = firstName;
    }

    if (lastName !== undefined) {
      contactPatch.last_name = lastName;
    }

    if (phone !== undefined) {
      contactPatch.phone = phone;
    }

    mergeNestedObject(normalizedPayload, 'contact', contactPatch);

    const billingInfoPatch: Record<string, unknown> = {};
    if (billingAddress !== undefined) {
      billingInfoPatch.billing_address = billingAddress;
    }
    if (financeEmail !== undefined) {
      billingInfoPatch.finance_email = financeEmail;
    }

    mergeNestedObject(normalizedPayload, 'billing_info', billingInfoPatch);
  } else {
    const composedName = [firstName, lastName]
      .filter((part): part is string => Boolean(part))
      .join(' ')
      .trim();
    const normalizedFullName = directFullName ?? (composedName || undefined);

    if (normalizedFullName !== undefined) {
      normalizedPayload.name = normalizedFullName;
    }

    if (phone !== undefined) {
      normalizedPayload.phoneNumber = phone;
    }
  }

  const allowedFields = new Set([
    ...BASE_PROFILE_UPDATE_FIELDS,
    ...PROFILE_UPDATE_FIELDS_BY_TYPE[accountType]
  ]);

  return Object.entries(normalizedPayload).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (allowedFields.has(key) && value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const foundUser = await getOwnerProfile(userId);
    if (!foundUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    sendSuccess(res, 'User profile retrieved successfully', foundUser);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateUserProfile = async (req: AuthenticatedRequest<{}, {}, UpdateProfileBody>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({ message: 'A JSON object payload is required' });
      return;
    }

    const existingUser = await user.findById(userId).select(PROFILE_MUTATION_SELECT);
    if (!existingUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const sanitizedUpdateData = sanitizeProfilePatch(
      req.body,
      existingUser.type as UserType
    );
    const requestedEmail =
      typeof sanitizedUpdateData.email === 'string' ? sanitizedUpdateData.email : undefined;
    const currentEmail = existingUser.get('email') as string;
    const shouldInitiateEmailChange =
      requestedEmail !== undefined && requestedEmail !== currentEmail;

    delete sanitizedUpdateData.email;

    const flatUpdateData = flattenForSet(sanitizedUpdateData);

    if (!shouldInitiateEmailChange && Object.keys(flatUpdateData).length === 0) {
      res.status(400).json({
        message: 'No valid profile fields provided for update'
      });
      return;
    }

    if (shouldInitiateEmailChange && requestedEmail && !isValidEmail(requestedEmail)) {
      res.status(400).json({
        message: 'Please provide a valid email address'
      });
      return;
    }

    if (shouldInitiateEmailChange && requestedEmail) {
      const conflictingEmailUser = await user.findOne({
        _id: { $ne: userId },
        $or: [{ email: requestedEmail }, { pendingEmail: requestedEmail }]
      }).select('+pendingEmail');

      if (conflictingEmailUser) {
        res.status(409).json({
          message: 'Email is already in use'
        });
        return;
      }
    }

    const nextUsername = sanitizedUpdateData.username;
    if (
      typeof nextUsername === 'string' &&
      nextUsername !== existingUser.get('username')
    ) {
      const conflictingUsernameUser = await user.findOne({
        _id: { $ne: userId },
        username: nextUsername
      });

      if (conflictingUsernameUser) {
        res.status(409).json({
          message: 'Username is already in use'
        });
        return;
      }
    }

    Object.entries(flatUpdateData).forEach(([path, value]) => {
      existingUser.set(path, value);
    });

    let emailChangeDelivery: { delivered: boolean; skippedReason?: string } | undefined;
    if (shouldInitiateEmailChange && requestedEmail) {
      const otp = generateOTP();
      existingUser.set('pendingEmail', requestedEmail);
      existingUser.set('pendingEmailVerificationOTP', otp);
      existingUser.set('pendingEmailVerificationExpires', Date.now() + EMAIL_CHANGE_OTP_TTL_MS);
      existingUser.set('pendingEmailRequestedAt', new Date());
      await existingUser.save();
      emailChangeDelivery = await trySendEmailChangeOTP(requestedEmail, otp);
    } else {
      await existingUser.save();
    }

    const updatedUser = await getOwnerProfile(userId);
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found after update' });
      return;
    }

    const hasOtherProfileUpdates = Object.keys(flatUpdateData).length > 0;
    const message = shouldInitiateEmailChange
      ? hasOtherProfileUpdates
        ? 'User profile updated successfully. Verify the OTP sent to your new email to complete the email change.'
        : 'Email change initiated. Verify the OTP sent to your new email to complete the update.'
      : 'User profile updated successfully';

    res.json({
      message,
      data: updatedUser,
      ...(emailChangeDelivery && !emailChangeDelivery.delivered
        ? { emailChangeDelivery }
        : {})
    });
  } catch (error) {
    console.error('Update user profile error:', error);

    if ((error as any)?.code === 11000) {
      const duplicateField = Object.keys((error as any)?.keyPattern || (error as any)?.keyValue || {})[0];
      res.status(409).json({
        message: duplicateField === 'username' ? 'Username is already in use' : 'Email is already in use'
      });
      return;
    }

    if ((error as any)?.name === 'ValidationError' || (error as any)?.name === 'CastError') {
      res.status(400).json({
        message: 'Validation failed',
        error: error instanceof Error ? error.message : 'Unknown validation error'
      });
      return;
    }

    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const verifyPendingEmailChange = async (
  req: AuthenticatedRequest<{}, {}, VerifyEmailChangeBody>,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const otp = normalizeString(req.body?.otp ?? req.body?.code);
    if (!otp) {
      res.status(400).json({ message: 'OTP is required' });
      return;
    }

    const existingUser = await user.findById(userId).select(PROFILE_MUTATION_SELECT);
    if (!existingUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const pendingEmail = existingUser.get('pendingEmail') as string | undefined;
    const pendingOtp = existingUser.get('pendingEmailVerificationOTP') as string | undefined;
    const pendingOtpExpiry = existingUser.get('pendingEmailVerificationExpires') as number | undefined;

    if (!pendingEmail || !pendingOtp || !pendingOtpExpiry) {
      res.status(400).json({ message: 'No email change is pending verification' });
      return;
    }

    if (pendingOtpExpiry <= Date.now()) {
      res.status(400).json({ message: 'The email change OTP has expired. Request a new code.' });
      return;
    }

    if (pendingOtp !== otp) {
      res.status(400).json({ message: 'Invalid OTP' });
      return;
    }

    const conflictingEmailUser = await user.findOne({
      _id: { $ne: userId },
      $or: [{ email: pendingEmail }, { pendingEmail }]
    }).select('+pendingEmail');

    if (conflictingEmailUser) {
      res.status(409).json({ message: 'Email is already in use' });
      return;
    }

    existingUser.set('email', pendingEmail);
    existingUser.set('isEmailVerified', true);
    clearPendingEmailChange(existingUser);
    await existingUser.save();

    const updatedUser = await getOwnerProfile(userId);
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found after email verification' });
      return;
    }

    res.json({
      message: 'Email address updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Verify pending email change error:', error);

    if ((error as any)?.code === 11000) {
      res.status(409).json({ message: 'Email is already in use' });
      return;
    }

    if ((error as any)?.name === 'ValidationError' || (error as any)?.name === 'CastError') {
      res.status(400).json({
        message: 'Validation failed',
        error: error instanceof Error ? error.message : 'Unknown validation error'
      });
      return;
    }

    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const resendPendingEmailChangeOTP = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const existingUser = await user.findById(userId).select(PROFILE_MUTATION_SELECT);
    if (!existingUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const pendingEmail = existingUser.get('pendingEmail') as string | undefined;
    if (!pendingEmail) {
      res.status(400).json({ message: 'No email change is pending verification' });
      return;
    }

    const otp = generateOTP();
    existingUser.set('pendingEmailVerificationOTP', otp);
    existingUser.set('pendingEmailVerificationExpires', Date.now() + EMAIL_CHANGE_OTP_TTL_MS);
    existingUser.set('pendingEmailRequestedAt', new Date());
    await existingUser.save();

    const emailChangeDelivery = await trySendEmailChangeOTP(pendingEmail, otp);
    const updatedUser = await getOwnerProfile(userId);
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found after OTP resend' });
      return;
    }

    res.json({
      message: 'A new OTP has been sent to your pending email address',
      data: updatedUser,
      ...(emailChangeDelivery.delivered ? {} : { emailChangeDelivery })
    });
  } catch (error) {
    console.error('Resend pending email change OTP error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getUserById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const foundUser = await user.findById(id, { password: 0, resetPasswordToken: 0, resetPasswordExpires: 0 });
    if (!foundUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'User retrieved successfully',
      data: foundUser
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const searchUsers = async (req: Request<{}, {}, {}, { q?: string; type?: string; page?: string; limit?: string }>, res: Response): Promise<void> => {
  try {
    const { q = '', type, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50); // Max 50 results per page
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    // Search by name, username, or email
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    // Filter by user type
    if (type && ['BRAND', 'INFLUENCER', 'SERVICE_PROVIDER'].includes(type.toUpperCase())) {
      query.type = type.toUpperCase();
    }

    const users = await user.find(query, { 
      password: 0, 
      resetPasswordToken: 0, 
      resetPasswordExpires: 0,
      isCodeVerified: 0
    })
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .lean();

    const totalUsers = await user.countDocuments(query);

    res.json({
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalUsers / limitNum),
          totalUsers,
          hasMore: skip + users.length < totalUsers
        }
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const deletedUser = await user.findByIdAndDelete(userId);
    if (!deletedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'User account deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      return;
    }

    const foundUser = await user.findById(userId);
    if (!foundUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (!foundUser.password) {
      res.status(400).json({ success: false, message: 'Password login is not configured for this user' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, foundUser.password);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current password is incorrect' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.findByIdAndUpdate(userId, { password: hashedPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const uploadAvatar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // If using multer/S3, the file URL would be in req.file or req.body.avatarUrl
    const avatarUrl = (req as any).file?.location || req.body.avatarUrl;

    if (!avatarUrl) {
      res.status(400).json({ success: false, message: 'No avatar file provided' });
      return;
    }

    await user.findByIdAndUpdate(userId, { $set: { profilePicture: avatarUrl } });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatarUrl }
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type as string;

    const filter: any = {};
    if (type) filter.type = type.toUpperCase();

    const [users, total] = await Promise.all([
      user.find(filter, {
        password: 0,
        resetPasswordToken: 0,
        resetPasswordExpires: 0,
        emailVerificationOTP: 0
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      user.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const updateUserLocation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { location, country } = req.body;

    const updateData: any = {};
    if (location !== undefined) updateData.location = location;
    if (country !== undefined) updateData.country = country;

    await user.findByIdAndUpdate(userId, { $set: updateData });

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: updateData
    });
  } catch (error) {
    console.error('Update user location error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
}; 
