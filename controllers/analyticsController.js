const Campaign = require('../models/campaign');
const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * GET /api/analytics/dashboard
 * Get user dashboard analytics
 */
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const dashboardData = {
            userType: user.type,
            profile: {
                name: user.name,
                avatar: user.profileImage,
                email: user.email,
                memberSince: user.createdAt
            },
            stats: {
                totalCampaigns: user.type === 'INFLUENCER' ? 0 : 45,
                activeCampaigns: user.type === 'INFLUENCER' ? 0 : 12,
                totalApplications: user.type === 'INFLUENCER' ? 8 : 0,
                acceptedApplications: user.type === 'INFLUENCER' ? 3 : 0
            },
            recentActivity: [
                {
                    action: 'CAMPAIGN_CREATED',
                    description: 'Created new campaign',
                    timestamp: new Date(Date.now() - 86400000)
                },
                {
                    action: 'APPLICATION_RECEIVED',
                    description: 'Received 2 new applications',
                    timestamp: new Date(Date.now() - 172800000)
                }
            ]
        };

        return res.status(200).json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching dashboard', error: error.message });
    }
};

/**
 * GET /api/analytics/influencer-performance
 * Get influencer performance metrics
 */
exports.getInfluencerPerformance = async (req, res) => {
    try {
        const influencerId = req.user.id;
        const { timeRange = '30days' } = req.query;

        const influencer = await User.findById(influencerId);
        if (!influencer || influencer.type !== 'INFLUENCER') {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        const performanceData = {
            period: timeRange,
            followers: {
                instagram: influencer.instagramFollowers || 0,
                youtube: influencer.youtubeFollowers || 0,
                tiktok: influencer.tiktokFollowers || 0,
                growth: {
                    instagram: 2.5, // percentage growth
                    youtube: 1.2,
                    tiktok: 5.8
                }
            },
            engagement: {
                average: influencer.averageEngagement || 0,
                trend: 'upward',
                topPerforming: [
                    {
                        platform: 'Instagram',
                        engagement: 6.2,
                        reach: 15000
                    },
                    {
                        platform: 'YouTube',
                        engagement: 4.5,
                        reach: 8000
                    }
                ]
            },
            campaigns: {
                total: 12,
                active: 2,
                completed: 10,
                averageRating: 4.7
            },
            earnings: {
                thisMonth: 125000,
                totalEarnings: 450000,
                pendingPayouts: 35000,
                growth: 15.5 // percentage
            },
            insights: [
                {
                    title: 'Peak Posting Time',
                    value: '7 PM IST',
                    recommendation: 'Post content at this time for better engagement'
                },
                {
                    title: 'Top Content Type',
                    value: 'Reels',
                    recommendation: 'Focus more on creating reels'
                },
                {
                    title: 'Audience Growth',
                    value: '+2,500 this month',
                    recommendation: 'Maintain current posting frequency'
                }
            ]
        };

        return res.status(200).json({
            success: true,
            data: performanceData
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching performance', error: error.message });
    }
};

/**
 * GET /api/analytics/campaign-performance/:campaignId
 * Get campaign performance metrics
 */
exports.getCampaignPerformance = async (req, res) => {
    try {
        const { campaignId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const performanceData = {
            campaignId,
            title: campaign.title,
            status: campaign.status,
            metrics: {
                reach: 450000,
                impressions: 1200000,
                clicks: 25000,
                conversions: 3200,
                engagementRate: 5.2,
                clickThroughRate: 2.08
            },
            influencers: {
                total: campaign.selectedInfluencersCount || 0,
                active: campaign.selectedInfluencersCount || 0,
                topPerformers: [
                    {
                        name: 'Sara Patel',
                        engagement: 6.8,
                        reach: 125000,
                        conversions: 800
                    },
                    {
                        name: 'Raj Kumar',
                        engagement: 5.2,
                        reach: 98000,
                        conversions: 450
                    }
                ]
            },
            timeline: {
                created: campaign.createdAt,
                started: new Date(),
                ending: campaign.duration?.endDate,
                daysRemaining: 15
            },
            roi: {
                totalSpend: campaign.budget,
                revenue: 450000,
                roiPercentage: 50,
                costPerConversion: 156.25
            }
        };

        return res.status(200).json({
            success: true,
            data: performanceData
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching campaign performance', error: error.message });
    }
};

/**
 * GET /api/analytics/reports
 * Generate custom reports
 */
exports.generateReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = 'monthly', startDate, endDate } = req.query;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const reportData = {
            type,
            period: `${startDate || 'Start'} to ${endDate || 'Today'}`,
            generatedAt: new Date(),
            userType: user.type,
            summary: {
                totalCampaigns: 45,
                totalApplications: 156,
                successRate: 78.5,
                averageEngagement: 5.8
            },
            monthlyBreakdown: [
                {
                    month: 'March 2026',
                    campaigns: 8,
                    applications: 32,
                    revenue: 125000
                },
                {
                    month: 'February 2026',
                    campaigns: 7,
                    applications: 28,
                    revenue: 98000
                },
                {
                    month: 'January 2026',
                    campaigns: 6,
                    applications: 25,
                    revenue: 87000
                }
            ],
            topPerforming: [
                {
                    name: 'Summer Collection Campaign',
                    engagement: 6.8,
                    revenue: 45000
                },
                {
                    name: 'Festival Season Sale',
                    engagement: 5.9,
                    revenue: 38000
                }
            ]
        };

        return res.status(200).json({
            success: true,
            data: reportData,
            exportUrl: '/api/analytics/reports/export'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error generating report', error: error.message });
    }
};

/**
 * GET /api/analytics/earnings
 * Get earnings analytics
 */
exports.getEarnings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { timeRange = '30days' } = req.query;

        const earningsData = {
            period: timeRange,
            summary: {
                totalEarnings: 450000,
                thisMonth: 125000,
                thisWeek: 28500,
                pendingPayouts: 35000,
                paidOut: 415000
            },
            breakdown: {
                campaigns: 380000,
                sponsorships: 50000,
                bonuses: 20000
            },
            monthlyEarnings: [
                { month: 'March', earnings: 125000 },
                { month: 'February', earnings: 98000 },
                { month: 'January', earnings: 87000 },
                { month: 'December', earnings: 115000 }
            ],
            payoutHistory: [
                {
                    id: 'payout_1',
                    amount: 50000,
                    date: new Date(Date.now() - 86400000),
                    status: 'COMPLETED'
                },
                {
                    id: 'payout_2',
                    amount: 45000,
                    date: new Date(Date.now() - 604800000),
                    status: 'COMPLETED'
                }
            ],
            nextPayoutDate: new Date(Date.now() + 604800000)
        };

        return res.status(200).json({
            success: true,
            data: earningsData
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching earnings', error: error.message });
    }
};
