const express = require('express');
const router = express.Router();
const smsService = require('../controllers/smsService');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * SMS Service Routes
 * Base URL: /api/sms
 */

// All SMS routes require authentication
router.use(authMiddleware);

/**
 * POST /api/sms/send-otp
 * Send OTP to phone
 */
router.post('/send-otp', async (req, res) => {
    try {
        const { phone, type = 'email' } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Send OTP
        const result = await smsService.sendOTP(phone, otp, type);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: `OTP sent to ${phone}`,
                data: {
                    phone: phone,
                    expiresIn: '10 minutes',
                    type: type
                }
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Failed to send OTP',
                error: result.error
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error sending OTP',
            error: error.message
        });
    }
});

/**
 * POST /api/sms/send-login-otp
 * Send login OTP
 */
router.post('/send-login-otp', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Send OTP
        const result = await smsService.sendLoginOTP(phone, otp);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: `Login OTP sent to ${phone}`,
                data: {
                    phone: phone,
                    expiresIn: '10 minutes'
                }
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Failed to send login OTP',
                error: result.error
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error sending login OTP',
            error: error.message
        });
    }
});

/**
 * POST /api/sms/send-welcome
 * Send welcome message
 */
router.post('/send-welcome', async (req, res) => {
    try {
        const { phone, userName } = req.body;

        if (!phone || !userName) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and userName are required'
            });
        }

        const result = await smsService.sendWelcomeMessage(phone, userName);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Welcome message sent',
                data: result
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Failed to send welcome message',
                error: result.error
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error sending welcome message',
            error: error.message
        });
    }
});

/**
 * POST /api/sms/send-campaign-alert
 * Send campaign alert
 */
router.post('/send-campaign-alert', async (req, res) => {
    try {
        const { phone, campaignName } = req.body;

        if (!phone || !campaignName) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and campaignName are required'
            });
        }

        const result = await smsService.sendCampaignAlert(phone, campaignName);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Campaign alert sent',
                data: result
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Failed to send campaign alert',
                error: result.error
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error sending campaign alert',
            error: error.message
        });
    }
});

/**
 * POST /api/sms/send-payment-confirmation
 * Send payment confirmation
 */
router.post('/send-payment-confirmation', async (req, res) => {
    try {
        const { phone, amount, transactionId } = req.body;

        if (!phone || !amount || !transactionId) {
            return res.status(400).json({
                success: false,
                message: 'Phone number, amount, and transactionId are required'
            });
        }

        const result = await smsService.sendPaymentConfirmation(phone, amount, transactionId);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Payment confirmation sent',
                data: result
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Failed to send payment confirmation',
                error: result.error
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error sending payment confirmation',
            error: error.message
        });
    }
});

/**
 * POST /api/sms/send-subscription-update
 * Send subscription update
 */
router.post('/send-subscription-update', async (req, res) => {
    try {
        const { phone, updateType, details } = req.body;

        if (!phone || !updateType) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and updateType are required'
            });
        }

        const result = await smsService.sendSubscriptionUpdate(phone, updateType, details);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Subscription update sent',
                data: result
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Failed to send subscription update',
                error: result.error
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error sending subscription update',
            error: error.message
        });
    }
});

/**
 * POST /api/sms/send-custom
 * Send custom SMS message
 */
router.post('/send-custom', async (req, res) => {
    try {
        const { phone, message, messageType = 'TRANSACTIONAL', templateId } = req.body;

        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and message are required'
            });
        }

        const result = await smsService.sendCustomMessage(phone, message, messageType, templateId);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Message sent',
                data: result
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Failed to send message',
                error: result.error
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error sending message',
            error: error.message
        });
    }
});

/**
 * GET /api/sms/status/:messageId
 * Check SMS delivery status
 */
router.get('/status/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;

        if (!messageId) {
            return res.status(400).json({
                success: false,
                message: 'Message ID is required'
            });
        }

        const result = await smsService.checkDeliveryStatus(messageId);

        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error checking delivery status',
            error: error.message
        });
    }
});

module.exports = router;
