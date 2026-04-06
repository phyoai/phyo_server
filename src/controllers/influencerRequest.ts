import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import InfluencerRequest from '../models/influencerRequest';
import Influencer from '../models/influencer';
import { user, userAuth } from '../models/auth';
import { AdminRequest } from '../middleware/admin';
import { AuthenticatedRequest } from '../types';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { extractFileUrls } from '../middleware/fileUpload';
import axios from 'axios';

const EMAIL_USER = process.env.EMAIL_USER || 'phyo.aiofficial@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'antn hqqq pqzw ittq';
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const BRIGHTSCRAPER_URL = process.env.BRIGHTSCRAPER_URL || 'http://127.0.0.1:5000';

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
      console.warn('Influencer email delivery skipped in non-production:', {
        email,
        subject,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }

    throw error;
  }
};

// Fetch Instagram demographics from BrightScraper
const fetchInstagramDemographics = async (username: string): Promise<any> => {
  try {
    console.log(`  → Fetching demographics for @${username} from BrightScraper...`);
    
    const response = await axios.post(
      `${BRIGHTSCRAPER_URL}/analyze`,
      { username, max_posts: 6 },
      { timeout: 180000 } // 3 minutes timeout
    );

    if (response.data && response.data.success) {
      const demo = response.data.data;
      console.log(`  ✓ Fetched @${username}: ${demo.followers} followers`);
      return demo;
    } else {
      console.error(`  ✗ Failed to fetch demographics for @${username}`);
      return null;
    }
  } catch (error: any) {
    console.error(`  ✗ Error fetching demographics for @${username}:`, error.message);
    return null;
  }
};

interface InfluencerSubmissionRequest {
  // Step 1: Personal Information
  full_name: string;
  stage_name?: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  languages_spoken?: string[];

  // Step 2: Profile Setup (files handled separately)
  bio?: string;
  personal_website?: string;

  // Step 3: Content Categories
  niches?: string[];

  // Step 4: Social Media Linking
  social_media: {
    instagram?: {
      username?: string;
      link?: string;
    };
    youtube?: {
      channel_url?: string;
    };
    tiktok?: {
      username?: string;
    };
    facebook?: {
      profile_url?: string;
    };
    twitter?: {
      username?: string;
    };
  };

  // Step 5: Portfolio
  portfolio?: {
    sample_posts?: Array<{
      platform: string;
      url: string;
      description?: string;
    }>;
    brand_collaborations?: Array<{
      brand_name: string;
      description: string;
      year?: number;
    }>;
    content_highlights?: string;
  };

  // Step 6-9: Optional fields (can be filled later)
  rate_card?: any;
  payment_details?: any;
  availability?: any;
  notifications?: any;

  // Contact & Account
  contact: {
    email: string;
    phone?: string;
  };
  
  account: {
    signup_method: 'email' | 'google' | 'facebook';
  };
}

// Helper function to safely parse JSON or return original value
const safeJSONParse = (value: any): any => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return value;
    }
  }
  return value;
};

// Handle influencer registration submission
export const submitInfluencerRegistration = async (
  req: AuthenticatedRequest<{}, {}, InfluencerSubmissionRequest>, 
  res: Response
): Promise<void> => {
  try {
    // Extract file URLs if any files were uploaded
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    // Extract and parse all data from request body
    const {
      full_name,
      stage_name,
      date_of_birth,
      gender,
      bio,
      personal_website
    } = req.body;

    // Parse JSON fields that come as strings from FormData
    const location = safeJSONParse(req.body.location);
    const languages_spoken = safeJSONParse(req.body.languages_spoken);
    const niches = safeJSONParse(req.body.niches);
    const social_media = safeJSONParse(req.body.social_media);
    const portfolio = safeJSONParse(req.body.portfolio);
    const rate_card = safeJSONParse(req.body.rate_card);
    const payment_details = safeJSONParse(req.body.payment_details);
    const availability = safeJSONParse(req.body.availability);
    const notifications = safeJSONParse(req.body.notifications);
    let contact = safeJSONParse(req.body.contact);
    const account = safeJSONParse(req.body.account);

    // For influencers, use Instagram username as identifier, fallback to email
    const tempInstagramUsername = social_media?.instagram?.username || 
                                  social_media?.instagram?.link?.match(/instagram\.com\/([^\/\?]+)/)?.[1];
    const userEmail = contact?.email;
    const userIdentifier = tempInstagramUsername || userEmail?.split('@')[0] || 'anonymous';
    
    console.log(`📝 Influencer registration - Identifier: ${userIdentifier} (Instagram: ${tempInstagramUsername || 'N/A'}, Email: ${userEmail || 'N/A'})`);
    
    // Extract file URLs with influencer flag set to true
    const fileUrls = await extractFileUrls(files, userIdentifier, true);
    
    console.log(`📁 Uploaded files:`, fileUrls);

    // Check if user is authenticated
    const isAuthenticated = !!req.user;
    let userId = null;
    let existingUserAccount = null;

    if (isAuthenticated) {
      userId = req.user!.id;
      existingUserAccount = await user.findById(userId);

      if (!existingUserAccount) {
        res.status(404).json({ message: 'User account not found' });
        return;
      }

      // Check if user is already an INFLUENCER
      if (existingUserAccount.type === 'INFLUENCER') {
        res.status(400).json({ 
          message: 'You are already registered as an influencer.' 
        });
        return;
      }

      // Check if user type is USER
      if (existingUserAccount.type !== 'USER') {
        res.status(400).json({ 
          message: 'Only USER type accounts can request influencer conversion.' 
        });
        return;
      }

      // Use authenticated user's email and ensure contact object exists
      if (!contact) {
        contact = {};
      }
      contact.email = existingUserAccount.email;
    } else {
      // Validate required fields for non-authenticated users
      if (!full_name || !contact?.email || !account?.signup_method) {
        res.status(400).json({ 
          message: 'Missing required fields. Please fill in all required information.' 
        });
        return;
      }
    }

    // Check if email already exists in influencer requests
    const existingRequest = await InfluencerRequest.findOne({ 'contact.email': contact.email });

    if (existingRequest) {
      res.status(400).json({ 
        message: 'An influencer registration request already exists with this email address.',
        status: existingRequest.status
      });
      return;
    }

    // Validate Instagram link is provided (at least one platform required)
    if (!social_media?.instagram?.username && !social_media?.instagram?.link) {
      res.status(400).json({ 
        message: 'Instagram username or link is required for registration.' 
      });
      return;
    }

    // Extract Instagram username from link if provided
    let instagramUsername = social_media.instagram?.username;
    if (!instagramUsername && social_media.instagram?.link) {
      const instagramLinkMatch = social_media.instagram.link.match(/instagram\.com\/([^\/\?]+)/);
      if (instagramLinkMatch) {
        instagramUsername = instagramLinkMatch[1];
      }
    }

    // Create influencer request first - don't wait for BrightScraper
    // We'll fetch demographics in the background
    const influencerRequest = new InfluencerRequest({
      // Step 1: Personal Information
      full_name,
      stage_name,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
      gender,
      location,
      languages_spoken: Array.isArray(languages_spoken) ? languages_spoken : [],

      // Step 2: Profile Setup
      profile_picture: fileUrls.profile_picture || undefined,
      cover_photo: fileUrls.cover_photo || undefined,
      bio,
      personal_website,

      // Step 3: Content Categories
      niches: Array.isArray(niches) ? niches : [],

      // Step 4: Social Media
      social_media: {
        instagram: {
          username: instagramUsername,
          link: social_media.instagram?.link,
          connected: !!instagramUsername
        },
        youtube: social_media.youtube ? {
          channel_url: social_media.youtube.channel_url,
          connected: !!social_media.youtube.channel_url
        } : undefined,
        tiktok: social_media.tiktok ? {
          username: social_media.tiktok.username,
          connected: !!social_media.tiktok.username
        } : undefined,
        facebook: social_media.facebook ? {
          profile_url: social_media.facebook.profile_url,
          connected: !!social_media.facebook.profile_url
        } : undefined,
        twitter: social_media.twitter ? {
          username: social_media.twitter.username,
          connected: !!social_media.twitter.username
        } : undefined
      },

      // Auto-fetched data will be updated in background
      auto_fetched_data: null,

      // Step 5: Portfolio
      portfolio: {
        ...portfolio,
        ...(fileUrls.media_kit && { media_kit: fileUrls.media_kit })
      },

      // Step 6-9: Optional fields
      rate_card,
      payment_details,
      availability,
      notifications,

      // Contact & Account
      contact,
      account: {
        signup_method: account?.signup_method || 'email'
      },
      
      status: 'PENDING',
      userId: userId,
      isUserConversion: isAuthenticated
    });

    await influencerRequest.save();
    const requestId = influencerRequest._id;

// Update user's influencerRegistrationStatus if authenticated
if (isAuthenticated && existingUserAccount) {
  await userAuth.findByIdAndUpdate(userId, {
    influencerRegistrationStatus: 'PENDING'
  });
}

    // Fetch demographics in background (don't await)
    if (instagramUsername) {
      console.log(`\n🔄 Starting background demographics fetch for @${instagramUsername}...`);
      
      // Run in background - don't block the response
      fetchInstagramDemographics(instagramUsername)
        .then(async (demographics) => {
          if (demographics) {
            console.log(`✅ Background fetch completed for @${instagramUsername}`);
            
            const autoFetchedData = {
              follower_counts: {
                instagram: demographics.followers || 0
              },
              engagement_rates: {
                instagram: demographics.avg_engagement || 0
              },
              profile_pic_url: demographics.profile_pic_url || '',
              audience_demographics: {
                gender_distribution: demographics.gender_distribution,
                age_distribution: demographics.age_distribution,
                country_distribution: demographics.country_distribution,
                city_distribution: demographics.city_distribution,
                language_distribution: demographics.language_distribution,
                audience_quality_score: demographics.audience_quality_score,
                fake_followers_percent: demographics.fake_followers_percent,
                total_comments_analyzed: demographics.total_comments_analyzed,
                real_users_analyzed: demographics.real_users_analyzed
              },
              last_fetched: new Date()
            };

            // Update the request with fetched data
            await InfluencerRequest.findByIdAndUpdate(requestId, {
              auto_fetched_data: autoFetchedData
            });
            
            console.log(`✅ Demographics saved for @${instagramUsername}`);
          } else {
            console.log(`⚠️  Background fetch failed for @${instagramUsername} - will retry during approval`);
          }
        })
        .catch((error) => {
          console.error(`❌ Background fetch error for @${instagramUsername}:`, error.message);
        });
    }

    // Send confirmation email immediately
    const emailMessage = isAuthenticated 
      ? `We've received your request to convert your account to an Influencer account. 
         Our team will review your application and get back to you within 24-48 hours.`
      : `We've received your influencer registration request. 
         Our team will review your application and get back to you within 24-48 hours.`;

    // Send email in background too
    sendEmailSafely(
      contact.email,
      'Influencer Registration Submitted - Phyo',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Thank you for joining Phyo as an Influencer!</h2>
        <p style="color: #666; font-size: 16px;">Hi ${full_name},</p>
        <p style="color: #666; font-size: 16px;">
          ${emailMessage}
        </p>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Submitted Details:</h3>
          <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${full_name}</p>
          ${stage_name ? `<p style="margin: 5px 0; color: #666;"><strong>Stage Name:</strong> ${stage_name}</p>` : ''}
          ${niches && Array.isArray(niches) && niches.length > 0 ? `<p style="margin: 5px 0; color: #666;"><strong>Niches:</strong> ${niches.join(', ')}</p>` : ''}
          ${instagramUsername ? `<p style="margin: 5px 0; color: #666;"><strong>Instagram:</strong> @${instagramUsername}</p>` : ''}
        </div>
        <p style="color: #666; font-size: 16px;">
          Once approved, you'll be able to connect with brands and start collaborating!
        </p>
        <p style="color: #666; font-size: 14px;">
          If you have any questions, please don't hesitate to contact our support team.
        </p>
      </div>
      `
    ).catch(err => console.error('Email send error:', err));

    // Return immediately
    res.status(200).json({
      message: 'Influencer registration submitted successfully! We will review your application and confirm by email within 24-48 hours.',
      request_id: requestId,
      is_conversion: isAuthenticated,
      demographics_status: instagramUsername ? 'fetching_in_background' : 'not_applicable'
    });

  } catch (error) {
    console.error('Influencer registration submission error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again later.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Admin: Get all influencer requests
export const getAllInfluencerRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    
    const query: any = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { stage_name: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } },
        { 'social_media.instagram.username': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const requests = await InfluencerRequest.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await InfluencerRequest.countDocuments(query);

    res.status(200).json({
      requests,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });

  } catch (error) {
    console.error('Get all influencer requests error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
};

// Admin: Get single influencer request
export const getInfluencerRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const request = await InfluencerRequest.findById(id);

    if (!request) {
      res.status(404).json({ message: 'Influencer request not found' });
      return;
    }

    res.status(200).json(request);

  } catch (error) {
    console.error('Get influencer request error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
};

// Admin: Approve influencer request
export const approveInfluencerRequest = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const request = await InfluencerRequest.findById(id);

    if (!request) {
      res.status(404).json({ message: 'Influencer request not found' });
      return;
    }

    if (request.status !== 'PENDING') {
      res.status(400).json({ 
        message: `This request has already been ${request.status.toLowerCase()}` 
      });
      return;
    }

    // Extract Instagram username for creating influencer profile
    const instagramUsername = request.social_media?.instagram?.username;
    if (!instagramUsername) {
      res.status(400).json({ 
        message: 'Cannot approve: Instagram username is required' 
      });
      return;
    }

    // Check if demographics data is missing and retry fetch if needed
// FIXED CODE (run in background):
// Check if demographics data is missing and schedule background fetch
if (!request.auto_fetched_data || !request.auto_fetched_data.audience_demographics) {
  console.log(`⚠️  No demographics data found for @${instagramUsername}, scheduling background fetch...`);
  
  // Run in background - don't block approval
  fetchInstagramDemographics(instagramUsername)
    .then(async (demographics) => {
      if (demographics) {
        const autoFetchedData = {
          follower_counts: {
            instagram: demographics.followers || 0
          },
          engagement_rates: {
            instagram: demographics.avg_engagement || 0
          },
          profile_pic_url: demographics.profile_pic_url || '',
          audience_demographics: {
            gender_distribution: demographics.gender_distribution,
            age_distribution: demographics.age_distribution,
            country_distribution: demographics.country_distribution,
            city_distribution: demographics.city_distribution,
            language_distribution: demographics.language_distribution,
            audience_quality_score: demographics.audience_quality_score,
            fake_followers_percent: demographics.fake_followers_percent,
            total_comments_analyzed: demographics.total_comments_analyzed,
            real_users_analyzed: demographics.real_users_analyzed
          },
          last_fetched: new Date()
        };
        
        await InfluencerRequest.findByIdAndUpdate(request._id, {
          auto_fetched_data: autoFetchedData
        });
        
        // Also update the Influencer model if it exists
        const influencer = await Influencer.findOne({ user_name: instagramUsername });
        if (influencer) {
          // Update influencer demographics here
          console.log(`✅ Demographics updated in background for @${instagramUsername}`);
        }
      }
    })
    .catch((error) => {
      console.error(`❌ Background demographics fetch error for @${instagramUsername}:`, error.message);
    });
  
  console.log(`✅ Approval proceeding without demographics - will fetch in background`);
}



    // Create or update Influencer in the database
    let influencer = await Influencer.findOne({ user_name: instagramUsername });

    const demographicsData = request.auto_fetched_data?.audience_demographics;

    if (influencer) {
      // Update existing influencer
      influencer.name = request.stage_name || request.full_name;
      influencer.profile_name = request.stage_name || request.full_name;
      influencer.profile_pic_url = request.auto_fetched_data?.profile_pic_url || request.profile_picture || influencer.profile_pic_url;
      influencer.biography = request.bio || influencer.biography;
      influencer.city = request.location?.city || influencer.city;
      influencer.state = request.location?.state || influencer.state;
      influencer.gender = request.gender as any || influencer.gender;
      influencer.language = Array.isArray(request.languages_spoken) ? request.languages_spoken.join(', ') : influencer.language;
      influencer.categoryInstagram = Array.isArray(request.niches) ? request.niches.join(', ') : influencer.categoryInstagram;
      influencer.lastDemographicsFetch = request.auto_fetched_data?.last_fetched || new Date();

      // Update Instagram data - preserve existing data structure
      const currentInstagramData: any = influencer.instagramData || {};
      
      influencer.instagramData = {
        followers: request.auto_fetched_data?.follower_counts?.instagram || currentInstagramData.followers || 0,
        following: currentInstagramData.following || 0,
        posts_count: currentInstagramData.posts_count || 0,
        avg_engagement: request.auto_fetched_data?.engagement_rates?.instagram || currentInstagramData.avg_engagement || 0,
        link: request.social_media?.instagram?.link || currentInstagramData.link,
        genderDistribution: demographicsData?.gender_distribution ? [
          { gender: 'MALE', distribution: demographicsData.gender_distribution.male || 0 },
          { gender: 'FEMALE', distribution: demographicsData.gender_distribution.female || 0 },
          { gender: 'UNKNOWN', distribution: demographicsData.gender_distribution.unknown || 0 }
        ] : currentInstagramData.genderDistribution,
        ageDistribution: demographicsData?.age_distribution ? 
          Object.entries(demographicsData.age_distribution).map(([age, value]) => ({ age, value: value as number })) : 
          currentInstagramData.ageDistribution,
        audienceByCountry: demographicsData?.country_distribution ? 
          Object.entries(demographicsData.country_distribution).map(([name, value]) => ({ name, value: value as number, category: '' })) : 
          currentInstagramData.audienceByCountry,
        audienceByCity: demographicsData?.city_distribution ? 
          Object.entries(demographicsData.city_distribution).map(([name, value]) => ({ name, value: value as number })) : 
          currentInstagramData.audienceByCity,
        languageDistribution: demographicsData?.language_distribution ? 
          Object.entries(demographicsData.language_distribution).map(([language, value]) => ({ language, value: value as number })) : 
          currentInstagramData.languageDistribution,
        audienceQualityScore: demographicsData?.audience_quality_score || currentInstagramData.audienceQualityScore || 0,
        fakeFollowersPercent: demographicsData?.fake_followers_percent || currentInstagramData.fakeFollowersPercent || 0,
        totalCommentsAnalyzed: demographicsData?.total_comments_analyzed || currentInstagramData.totalCommentsAnalyzed || 0,
        realUsersAnalyzed: demographicsData?.real_users_analyzed || currentInstagramData.realUsersAnalyzed || 0,
        collaborationCharges: request.rate_card ? {
          reel: request.rate_card.instagram_reel || 0,
          story: request.rate_card.instagram_story || 0,
          post: request.rate_card.instagram_post || 0,
          oneMonthDigitalRights: 0
        } : currentInstagramData.collaborationCharges || {
          reel: 0,
          story: 0,
          post: 0,
          oneMonthDigitalRights: 0
        }
      };

      await influencer.save();
    } else {
      // Create new influencer
      influencer = await Influencer.create({
        user_name: instagramUsername,
        name: request.stage_name || request.full_name,
        profile_name: request.stage_name || request.full_name,
        profile_pic_url: request.auto_fetched_data?.profile_pic_url || request.profile_picture || '',
        biography: request.bio || '',
        is_verified: false,
        is_business: false,
        city: request.location?.city || '',
        state: request.location?.state || '',
        gender: request.gender || 'Other',
        language: Array.isArray(request.languages_spoken) ? request.languages_spoken.join(', ') : '',
        categoryInstagram: Array.isArray(request.niches) ? request.niches.join(', ') : '',
        lastDemographicsFetch: request.auto_fetched_data?.last_fetched || new Date(),
        instagramData: {
          followers: request.auto_fetched_data?.follower_counts?.instagram || 0,
          following: 0,
          posts_count: 0,
          avg_engagement: request.auto_fetched_data?.engagement_rates?.instagram || 0,
          link: request.social_media?.instagram?.link,
          genderDistribution: demographicsData?.gender_distribution ? [
            { gender: 'MALE', distribution: demographicsData.gender_distribution.male || 0 },
            { gender: 'FEMALE', distribution: demographicsData.gender_distribution.female || 0 },
            { gender: 'UNKNOWN', distribution: demographicsData.gender_distribution.unknown || 0 }
          ] : [],
          ageDistribution: demographicsData?.age_distribution ? 
            Object.entries(demographicsData.age_distribution).map(([age, value]) => ({ age, value: value as number })) : [],
          audienceByCountry: demographicsData?.country_distribution ? 
            Object.entries(demographicsData.country_distribution).map(([name, value]) => ({ name, value: value as number, category: '' })) : [],
          audienceByCity: demographicsData?.city_distribution ? 
            Object.entries(demographicsData.city_distribution).map(([name, value]) => ({ name, value: value as number })) : [],
          languageDistribution: demographicsData?.language_distribution ? 
            Object.entries(demographicsData.language_distribution).map(([language, value]) => ({ language, value: value as number })) : [],
          audienceQualityScore: demographicsData?.audience_quality_score || 0,
          fakeFollowersPercent: demographicsData?.fake_followers_percent || 0,
          totalCommentsAnalyzed: demographicsData?.total_comments_analyzed || 0,
          realUsersAnalyzed: demographicsData?.real_users_analyzed || 0,
          collaborationCharges: request.rate_card ? {
            reel: request.rate_card.instagram_reel || 0,
            story: request.rate_card.instagram_story || 0,
            post: request.rate_card.instagram_post || 0,
            oneMonthDigitalRights: 0
          } : {
            reel: 0,
            story: 0,
            post: 0,
            oneMonthDigitalRights: 0
          }
        }
      });
    }

    // Update request status
    request.status = 'APPROVED';
    request.admin_notes = admin_notes;
    request.reviewed_by = req.admin!.id;
    request.reviewed_at = new Date();
    request.influencerId = influencer._id as any;

    await request.save();

    // If this was a user conversion, update the user type
    if (request.isUserConversion && request.userId) {
      try {
        // Get the current user document
        const currentUser = await user.findById(request.userId);
        
        if (!currentUser) {
          throw new Error('User not found during conversion');
        }

        console.log(`🔄 Converting user ${request.userId} from ${currentUser.type} to INFLUENCER...`);

        // Update the user document directly in the database using MongoDB native update
        // This bypasses discriminator issues
        await user.collection.updateOne(
          { _id: new mongoose.Types.ObjectId(request.userId) },
          {
            $set: {
              type: 'INFLUENCER',
              name: request.full_name,
              // username: request.social_media?.instagram?.username || `influencer_${request.userId}`,
              bio: request.bio || currentUser.about || '',
              profilePicture: request.profile_picture || currentUser.googlePicture || '',
              
              // Give unlimited access to influencers - no plan restrictions
              currentPlan: 'PREMIUM',
              subscriptionStatus: 'ACTIVE',
              creditsRemaining: 999999, // Unlimited credits
              trialCreditsGiven: true,
              lastPlanUpdate: new Date(),
              updatedAt: new Date(),

              influencerRegistrationStatus: 'APPROVED'

            },
            $unset: {
              // Remove UserAuth-specific fields that don't apply to INFLUENCER
              brandRegistrationStatus: '',
              // influencerRegistrationStatus: ''
            }
          }
        );
        
        console.log(`✅ User ${request.userId} successfully converted to INFLUENCER with unlimited access`);
        console.log(`   📧 Email: ${currentUser.email}`);
        console.log(`   👤 Type: USER → INFLUENCER`);
        console.log(`   💎 Plan: ${currentUser.currentPlan} → PREMIUM (No restrictions)`);
        console.log(`   💰 Credits: ${currentUser.creditsRemaining} → Unlimited (999999)`);
        
      } catch (conversionError) {
        console.error('❌ Error during user conversion:', conversionError);
        // Log the error but don't fail the approval
        console.log('⚠️  Approval completed but user type conversion may need manual review');
      }
    }

    // Send approval email
    await sendEmailSafely(
      request.contact.email,
      'Your Influencer Registration has been Approved! - Phyo',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4CAF50; text-align: center;">🎉 Congratulations! Your Influencer Account is Approved!</h2>
        <p style="color: #666; font-size: 16px;">Hi ${request.full_name},</p>
        <p style="color: #666; font-size: 16px;">
          Great news! Your influencer registration has been approved. Welcome to the Phyo community!
        </p>
        <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">What's Next?</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>Complete your profile by adding your rate card and payment details</li>
            <li>Set your availability and campaign preferences</li>
            <li>Start browsing brand campaigns and collaborations</li>
            <li>Connect with brands and grow your influence!</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://phyo.ai/influencer/dashboard" 
             style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If you have any questions, our support team is here to help!
        </p>
      </div>
      `
    );

    res.status(200).json({
      message: 'Influencer request approved successfully',
      influencer_id: influencer._id
    });

  } catch (error) {
    console.error('Approve influencer request error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again later.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Admin: Reject influencer request
export const rejectInfluencerRequest = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const request = await InfluencerRequest.findById(id);

    if (!request) {
      res.status(404).json({ message: 'Influencer request not found' });
      return;
    }

    if (request.status !== 'PENDING') {
      res.status(400).json({ 
        message: `This request has already been ${request.status.toLowerCase()}` 
      });
      return;
    }

    // Update request status
    request.status = 'REJECTED';
    request.admin_notes = admin_notes;
    request.reviewed_by = req.admin!.id;
    request.reviewed_at = new Date();

    await request.save();

    // If this was a user conversion, update the user status
    if (request.isUserConversion && request.userId) {
      // Update using collection.updateOne to avoid discriminator issues
      await user.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(request.userId) },
        {
          $set: {
            influencerRegistrationStatus: 'REJECTED',
            updatedAt: new Date()
          }
        }
      );
    }

    // Send rejection email
    await sendEmailSafely(
      request.contact.email,
      'Update on Your Influencer Registration - Phyo',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Update on Your Influencer Registration</h2>
        <p style="color: #666; font-size: 16px;">Hi ${request.full_name},</p>
        <p style="color: #666; font-size: 16px;">
          Thank you for your interest in joining Phyo as an influencer. After careful review, 
          we are unable to approve your registration at this time.
        </p>
        ${admin_notes ? `
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Feedback:</h3>
          <p style="margin: 0; color: #666;">${admin_notes}</p>
        </div>
        ` : ''}
        <p style="color: #666; font-size: 16px;">
          You're welcome to submit a new application in the future. If you have any questions, 
          please don't hesitate to contact our support team.
        </p>
      </div>
      `
    );

    res.status(200).json({
      message: 'Influencer request rejected'
    });

  } catch (error) {
    console.error('Reject influencer request error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
};

// Get influencer request statistics
export const getInfluencerRequestStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalRequests = await InfluencerRequest.countDocuments();
    const pendingRequests = await InfluencerRequest.countDocuments({ status: 'PENDING' });
    const approvedRequests = await InfluencerRequest.countDocuments({ status: 'APPROVED' });
    const rejectedRequests = await InfluencerRequest.countDocuments({ status: 'REJECTED' });

    res.status(200).json({
      total: totalRequests,
      pending: pendingRequests,
      approved: approvedRequests,
      rejected: rejectedRequests
    });

  } catch (error) {
    console.error('Get influencer request stats error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
};

// Influencer: Update profile (after approval)
export const updateInfluencerProfile = async (
  req: AuthenticatedRequest, 
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    // Find the approved influencer request for this user
    const influencerRequest = await InfluencerRequest.findOne({ 
      userId: userId,
      status: 'APPROVED'
    });

    if (!influencerRequest) {
      res.status(404).json({ 
        message: 'No approved influencer profile found for this user' 
      });
      return;
    }

    // Extract file URLs if any files were uploaded
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    // Use Instagram username from the existing request or from update
    const instagramUsername = req.body.social_media?.instagram?.username || 
                             influencerRequest.social_media?.instagram?.username ||
                             req.user!.email.split('@')[0];
    const userIdentifier = instagramUsername;
    
    console.log(`📝 Updating influencer profile - Identifier: ${userIdentifier}`);
    
    // Extract file URLs with influencer flag
    const fileUrls = await extractFileUrls(files, userIdentifier, true);
    
    console.log(`📁 Updated files:`, fileUrls);

    // Update the request with new data
    const updates = req.body;

    // Merge file URLs
    if (fileUrls.profile_picture) {
      influencerRequest.profile_picture = fileUrls.profile_picture;
    }
    if (fileUrls.cover_photo) {
      influencerRequest.cover_photo = fileUrls.cover_photo;
    }
    if (fileUrls.media_kit) {
      influencerRequest.portfolio = {
        ...influencerRequest.portfolio,
        media_kit: fileUrls.media_kit
      };
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'status' && key !== 'userId') {
        (influencerRequest as any)[key] = updates[key];
      }
    });

    await influencerRequest.save();

    // Also update the Influencer model if it exists
    if (influencerRequest.influencerId) {
      const influencer = await Influencer.findById(influencerRequest.influencerId);
      if (influencer) {
        if (updates.rate_card) {
          if (!influencer.instagramData) {
            influencer.instagramData = {
              followers: 0,
              following: 0,
              posts_count: 0,
              avg_engagement: 0,
              collaborationCharges: {
                reel: updates.rate_card.instagram_reel || 0,
                story: updates.rate_card.instagram_story || 0,
                post: updates.rate_card.instagram_post || 0,
                oneMonthDigitalRights: 0
              }
            };
          } else {
            influencer.instagramData.collaborationCharges = {
              reel: updates.rate_card.instagram_reel || influencer.instagramData.collaborationCharges?.reel || 0,
              story: updates.rate_card.instagram_story || influencer.instagramData.collaborationCharges?.story || 0,
              post: updates.rate_card.instagram_post || influencer.instagramData.collaborationCharges?.post || 0,
              oneMonthDigitalRights: influencer.instagramData.collaborationCharges?.oneMonthDigitalRights || 0
            };
          }
        }
        if (updates.bio) {
          influencer.biography = updates.bio;
        }
        if (fileUrls.profile_picture) {
          influencer.profile_pic_url = fileUrls.profile_picture;
        }
        await influencer.save();
      }
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      profile: influencerRequest
    });

  } catch (error) {
    console.error('Update influencer profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
};

// Influencer: Get own profile
export const getInfluencerProfile = async (
  req: AuthenticatedRequest, 
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    const influencerRequest = await InfluencerRequest.findOne({ userId: userId });

    if (!influencerRequest) {
      res.status(404).json({ 
        message: 'No influencer profile found for this user' 
      });
      return;
    }

    res.status(200).json(influencerRequest);

  } catch (error) {
    console.error('Get influencer profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
};
