const mongoose = require('mongoose');

/**
 * GET /api/help/faqs
 * Get frequently asked questions
 */
exports.getFAQs = async (req, res) => {
    try {
        const { category, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const faqs = [
            {
                id: 1,
                category: 'Getting Started',
                question: 'How do I create an account?',
                answer: 'To create an account, click on Sign Up and fill in your details. For brands, provide company information. For influencers, provide your social media handles.',
                helpful: 245,
                views: 1203
            },
            {
                id: 2,
                category: 'Getting Started',
                question: 'How do I verify my account?',
                answer: 'We send a verification link to your email. Click the link to verify your account. For influencers, we also verify your social media profiles.',
                helpful: 189,
                views: 987
            },
            {
                id: 3,
                category: 'Campaigns',
                question: 'How do I create a campaign?',
                answer: 'Go to Campaigns > Create New. Fill in campaign details like budget, timeline, and requirements. Then invite influencers to apply.',
                helpful: 312,
                views: 1456
            },
            {
                id: 4,
                category: 'Campaigns',
                question: 'Can I edit a campaign after posting?',
                answer: 'Yes, you can edit active campaigns as long as no influencers have applied yet. Once applications start, you cannot modify budget or timeline.',
                helpful: 156,
                views: 678
            },
            {
                id: 5,
                category: 'Payments & Billing',
                question: 'What payment methods do you accept?',
                answer: 'We accept credit cards (Visa, Mastercard, Amex), debit cards, and UPI. All payments are secured through Razorpay.',
                helpful: 401,
                views: 2103
            },
            {
                id: 6,
                category: 'Payments & Billing',
                question: 'What is your refund policy?',
                answer: 'Refunds are processed within 7 business days. Contact support for refund requests. Campaign cancellations may have different terms.',
                helpful: 234,
                views: 1089
            },
            {
                id: 7,
                category: 'Safety & Support',
                question: 'Is my data secure?',
                answer: 'Yes, we use industry-standard encryption and security measures. Your data is never shared with third parties without consent.',
                helpful: 567,
                views: 3402
            },
            {
                id: 8,
                category: 'Safety & Support',
                question: 'How do I report abuse?',
                answer: 'Use the Report button on any user profile or campaign. Our safety team reviews reports within 24 hours.',
                helpful: 178,
                views: 834
            }
        ];

        let filteredFAQs = faqs;
        if (category) {
            filteredFAQs = faqs.filter(faq => faq.category.toLowerCase() === category.toLowerCase());
        }

        const total = filteredFAQs.length;
        const paginatedFAQs = filteredFAQs.slice(skip, skip + parseInt(limit));

        return res.status(200).json({
            success: true,
            data: paginatedFAQs,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) || 1 }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching FAQs', error: error.message });
    }
};

/**
 * GET /api/help/languages
 * Get supported languages
 */
exports.getSupportedLanguages = async (req, res) => {
    try {
        const languages = [
            {
                code: 'en',
                name: 'English',
                native: 'English',
                isDefault: true,
                speakers: 'Native speakers worldwide'
            },
            {
                code: 'hi',
                name: 'Hindi',
                native: 'हिंदी',
                isDefault: false,
                speakers: 'India, Nepal'
            },
            {
                code: 'es',
                name: 'Spanish',
                native: 'Español',
                isDefault: false,
                speakers: 'Spain, Latin America'
            },
            {
                code: 'fr',
                name: 'French',
                native: 'Français',
                isDefault: false,
                speakers: 'France, Africa'
            },
            {
                code: 'de',
                name: 'German',
                native: 'Deutsch',
                isDefault: false,
                speakers: 'Germany, Austria'
            },
            {
                code: 'zh',
                name: 'Chinese',
                native: '中文',
                isDefault: false,
                speakers: 'China, Taiwan, Hong Kong'
            },
            {
                code: 'ja',
                name: 'Japanese',
                native: '日本語',
                isDefault: false,
                speakers: 'Japan'
            },
            {
                code: 'pt',
                name: 'Portuguese',
                native: 'Português',
                isDefault: false,
                speakers: 'Brazil, Portugal'
            }
        ];

        return res.status(200).json({
            success: true,
            data: languages
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching languages', error: error.message });
    }
};

/**
 * POST /api/help/contact
 * Submit contact/support request
 */
exports.submitContactForm = async (req, res) => {
    try {
        const { name, email, subject, message, category = 'general', attachments } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'name, email, subject, and message are required'
            });
        }

        const contactRequest = {
            id: new mongoose.Types.ObjectId(),
            name,
            email,
            subject,
            message,
            category,
            attachments: attachments || [],
            status: 'NEW',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // In a real scenario, this would save to a database and send an email
        // For now, we'll just return success
        return res.status(201).json({
            success: true,
            message: 'Support request submitted successfully',
            data: {
                ticketId: contactRequest.id,
                status: 'received',
                expectedResponse: '24-48 hours'
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error submitting form', error: error.message });
    }
};

/**
 * GET /api/help/articles/:category
 * Get help articles by category
 */
exports.getHelpArticles = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const articles = {
            'getting-started': [
                {
                    id: 1,
                    title: 'Getting Started with Phyo',
                    slug: 'getting-started-with-phyo',
                    content: 'Learn how to create your account and get started with Phyo...',
                    author: 'Support Team',
                    readTime: 5,
                    views: 2345,
                    helpful: 234,
                    createdAt: new Date('2024-01-15')
                },
                {
                    id: 2,
                    title: 'Profile Setup Guide',
                    slug: 'profile-setup-guide',
                    content: 'Complete guide to setting up your profile...',
                    author: 'Support Team',
                    readTime: 8,
                    views: 1876,
                    helpful: 187,
                    createdAt: new Date('2024-01-20')
                }
            ],
            'campaigns': [
                {
                    id: 3,
                    title: 'Creating Your First Campaign',
                    slug: 'creating-first-campaign',
                    content: 'Step by step guide to create a successful campaign...',
                    author: 'Support Team',
                    readTime: 10,
                    views: 3456,
                    helpful: 456,
                    createdAt: new Date('2024-02-01')
                },
                {
                    id: 4,
                    title: 'Campaign Best Practices',
                    slug: 'campaign-best-practices',
                    content: 'Tips and tricks for running successful campaigns...',
                    author: 'Support Team',
                    readTime: 7,
                    views: 2123,
                    helpful: 234,
                    createdAt: new Date('2024-02-10')
                }
            ],
            'payments': [
                {
                    id: 5,
                    title: 'Payment Methods and Security',
                    slug: 'payment-methods-security',
                    content: 'Understanding payment options and security...',
                    author: 'Support Team',
                    readTime: 6,
                    views: 1234,
                    helpful: 123,
                    createdAt: new Date('2024-02-15')
                }
            ]
        };

        const categoryArticles = articles[category] || [];
        const total = categoryArticles.length;
        const paginatedArticles = categoryArticles.slice(skip, skip + parseInt(limit));

        return res.status(200).json({
            success: true,
            data: paginatedArticles,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) || 1 }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching articles', error: error.message });
    }
};
