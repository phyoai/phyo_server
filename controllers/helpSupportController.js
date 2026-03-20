const FAQ = require('../models/faq');
const HelpArticle = require('../models/helpArticle');
const SupportTicket = require('../models/supportTicket');
const User = require('../models/auth');

/**
 * GET /api/help/faqs
 * Get all FAQs with optional category filter
 */
exports.getFAQs = async (req, res) => {
    try {
        const { category, search } = req.query;

        let filter = { isPublished: true };
        if (category) filter.category = category;

        if (search) {
            filter.$or = [
                { question: { $regex: search, $options: 'i' } },
                { answer: { $regex: search, $options: 'i' } }
            ];
        }

        const faqs = await FAQ.find(filter)
            .sort({ order: 1, createdAt: -1 })
            .lean();

        const categories = await FAQ.distinct('category', { isPublished: true });

        return res.status(200).json({
            success: true,
            data: faqs,
            categories
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching FAQs',
            error: error.message
        });
    }
};

/**
 * GET /api/help/faqs/:category
 * Get FAQs by category
 */
exports.getFAQsByCategory = async (req, res) => {
    try {
        const { category } = req.params;

        const faqs = await FAQ.find({
            category,
            isPublished: true
        })
            .sort({ order: 1 })
            .lean();

        if (faqs.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No FAQs found for category: ${category}`
            });
        }

        return res.status(200).json({
            success: true,
            data: faqs,
            category
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching FAQs',
            error: error.message
        });
    }
};

/**
 * GET /api/help/articles/:slug
 * Get help article by slug
 */
exports.getArticle = async (req, res) => {
    try {
        const { slug } = req.params;

        const article = await HelpArticle.findOne({
            slug,
            isPublished: true
        }).lean();

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        }

        // Get related articles
        const related = await HelpArticle.find({
            category: article.category,
            slug: { $ne: slug },
            isPublished: true
        })
            .limit(3)
            .lean();

        return res.status(200).json({
            success: true,
            data: {
                ...article,
                related
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching article',
            error: error.message
        });
    }
};

/**
 * GET /api/help/articles
 * Get all help articles
 */
exports.getArticles = async (req, res) => {
    try {
        const { category, search } = req.query;

        let filter = { isPublished: true };
        if (category) filter.category = category;

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        const articles = await HelpArticle.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        const categories = await HelpArticle.distinct('category', { isPublished: true });

        return res.status(200).json({
            success: true,
            data: articles,
            categories
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching articles',
            error: error.message
        });
    }
};

/**
 * POST /api/help/contact
 * Submit contact form
 */
exports.submitContactForm = async (req, res) => {
    try {
        const { name, email, subject, message, category } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'name, email, subject, and message are required'
            });
        }

        const ticket = new SupportTicket({
            name,
            email,
            subject,
            message,
            category: category || 'general',
            status: 'open',
            priority: 'normal',
            createdAt: new Date()
        });

        await ticket.save();

        // TODO: Send email notification to support team

        return res.status(201).json({
            success: true,
            message: 'Thank you for contacting us. We will get back to you soon.',
            data: {
                ticketId: ticket._id,
                status: ticket.status
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error submitting contact form',
            error: error.message
        });
    }
};

/**
 * POST /api/help/tickets
 * Create support ticket
 */
exports.createSupportTicket = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { subject, description, category, priority, attachments } = req.body;

        if (!subject || !description) {
            return res.status(400).json({
                success: false,
                message: 'subject and description are required'
            });
        }

        const ticket = new SupportTicket({
            userId: userId || null,
            subject,
            description,
            category: category || 'general',
            priority: priority || 'normal',
            status: 'open',
            attachments: attachments || [],
            createdAt: new Date()
        });

        await ticket.save();

        return res.status(201).json({
            success: true,
            data: ticket
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error creating support ticket',
            error: error.message
        });
    }
};

/**
 * GET /api/help/tickets
 * Get user's support tickets
 */
exports.getMyTickets = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { page = 1, limit = 20, status } = req.query;
        const skip = (page - 1) * limit;

        const filter = { userId };
        if (status) filter.status = status;

        const tickets = await SupportTicket.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await SupportTicket.countDocuments(filter);

        return res.status(200).json({
            success: true,
            data: tickets,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                count: tickets.length,
                total_items: total
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching tickets',
            error: error.message
        });
    }
};

/**
 * GET /api/help/tickets/:id
 * Get support ticket detail
 */
exports.getTicketDetail = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        const ticket = await SupportTicket.findOne({
            _id: id,
            userId: userId
        }).lean();

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: ticket
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching ticket',
            error: error.message
        });
    }
};
