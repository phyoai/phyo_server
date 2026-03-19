const axios = require('axios');
const smsConfig = require('../config/smsConfig');

/**
 * SMS Service
 * Handles all SMS sending via MSG91 API with BSNL DLT compliance
 */

class SMSService {
    constructor() {
        this.apiUrl = smsConfig.msg91.apiUrl;
        this.authKey = smsConfig.msg91.authKey;
        this.senderId = smsConfig.msg91.senderId;
        this.maxRetries = smsConfig.settings.maxRetries || 3;
        this.timeout = smsConfig.settings.timeout || 10000;
    }

    /**
     * Check if SMS is properly configured
     */
    isConfigured() {
        return this.authKey &&
               this.authKey !== 'YOUR_MSG91_AUTH_KEY' &&
               smsConfig.dlt.entityId &&
               smsConfig.dlt.entityId !== 'YOUR_DLT_ENTITY_ID';
    }

    /**
     * Get DLT principal based on message type
     */
    getDLTPrincipal(messageType) {
        const messageConfig = smsConfig.messageTypes[messageType];
        if (!messageConfig) return smsConfig.dlt.principals.transactional;

        if (messageType === 'PROMOTIONAL') {
            return smsConfig.dlt.principals.promotional;
        }
        return smsConfig.dlt.principals.transactional;
    }

    /**
     * Send SMS via MSG91 API with retry logic
     */
    async sendSMS(phone, message, messageType = 'TRANSACTIONAL', templateId = null) {
        // Check configuration
        if (!this.isConfigured()) {
            console.warn('SMS Service not configured. Set MSG91_AUTH_KEY and DLT_ENTITY_ID in environment variables.');
            return {
                success: false,
                message: 'SMS service not configured',
                configured: false
            };
        }

        // Validate phone number
        if (!phone) {
            return {
                success: false,
                message: 'Phone number is required',
                error: 'Invalid phone'
            };
        }

        // Get configuration for message type
        const typeConfig = smsConfig.messageTypes[messageType] || smsConfig.messageTypes.TRANSACTIONAL;
        const route = typeConfig.type || smsConfig.msg91.route;
        const dltPrincipal = this.getDLTPrincipal(messageType);

        // Prepare request payload
        const payload = {
            authkey: this.authKey,
            mobiles: phone.toString(),
            message: message,
            sender: this.senderId,
            route: route,
            country: '91', // India
            DLT_TE_ID: templateId || smsConfig.msg91.templates[messageType] || '',
            DLT_ENTITY_ID: smsConfig.dlt.entityId,
            DLT_PRINCIPAL_ENTITY_ID: dltPrincipal
        };

        // Retry logic
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await axios.post(
                    `${this.apiUrl}/send`,
                    null,
                    {
                        params: payload,
                        timeout: this.timeout,
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                );

                if (response.data && response.data.message && response.data.message[0]) {
                    const msg = response.data.message[0];

                    if (msg.error === 0) {
                        // Success
                        return {
                            success: true,
                            message: 'SMS sent successfully',
                            messageId: msg.messageid,
                            phone: phone,
                            type: messageType,
                            timestamp: new Date()
                        };
                    } else {
                        // API error
                        const errorMsg = this.getErrorMessage(msg.error);
                        throw new Error(`MSG91 Error: ${errorMsg}`);
                    }
                }

                throw new Error('Invalid MSG91 response format');
            } catch (error) {
                const isLastAttempt = attempt === this.maxRetries;

                console.error(`SMS send attempt ${attempt}/${this.maxRetries} failed:`, error.message);

                if (isLastAttempt) {
                    return {
                        success: false,
                        message: 'Failed to send SMS after retries',
                        error: error.message,
                        phone: phone,
                        attempts: attempt
                    };
                }

                // Wait before retry (exponential backoff)
                const waitTime = Math.pow(2, attempt - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    /**
     * Send OTP SMS
     */
    async sendOTP(phone, otp, userType = 'email') {
        const template = userType === 'phone'
            ? smsConfig.templates.phoneVerificationOTP
            : smsConfig.templates.emailVerificationOTP;

        const message = template(otp, 'User');
        const templateId = smsConfig.msg91.templates.OTP;

        return this.sendSMS(phone, message, 'OTP', templateId);
    }

    /**
     * Send login OTP
     */
    async sendLoginOTP(phone, otp) {
        const message = smsConfig.templates.loginOTP(otp, 'User');
        const templateId = smsConfig.msg91.templates.OTP;

        return this.sendSMS(phone, message, 'OTP', templateId);
    }

    /**
     * Send welcome message
     */
    async sendWelcomeMessage(phone, userName) {
        const message = smsConfig.templates.welcomeMessage(userName);
        const templateId = smsConfig.msg91.templates.WELCOME;

        return this.sendSMS(phone, message, 'TRANSACTIONAL', templateId);
    }

    /**
     * Send campaign alert
     */
    async sendCampaignAlert(phone, campaignName) {
        const message = smsConfig.templates.campaignAlert(campaignName);
        const templateId = smsConfig.msg91.templates.CAMPAIGN_ALERT;

        return this.sendSMS(phone, message, 'PROMOTIONAL', templateId);
    }

    /**
     * Send payment confirmation
     */
    async sendPaymentConfirmation(phone, amount, transactionId) {
        const message = smsConfig.templates.paymentConfirmation(amount, transactionId);
        const templateId = smsConfig.msg91.templates.PAYMENT_CONFIRMATION;

        return this.sendSMS(phone, message, 'TRANSACTIONAL', templateId);
    }

    /**
     * Send subscription update
     */
    async sendSubscriptionUpdate(phone, updateType, details) {
        let message;
        const templateId = smsConfig.msg91.templates.SUBSCRIPTION_UPDATE;

        switch (updateType) {
            case 'UPGRADE':
                message = smsConfig.templates.subscriptionUpgrade(details.planName);
                break;
            case 'PAUSE':
                message = smsConfig.templates.subscriptionPaused(details.duration || '7 days');
                break;
            case 'RESUME':
                message = smsConfig.templates.subscriptionResumed();
                break;
            case 'CANCEL':
                message = smsConfig.templates.subscriptionCancelled();
                break;
            default:
                message = `Your subscription status has been updated. ${details || ''}`;
        }

        return this.sendSMS(phone, message, 'TRANSACTIONAL', templateId);
    }

    /**
     * Send collaboration request
     */
    async sendCollaborationRequest(phone, senderName) {
        const message = smsConfig.templates.collaborationRequest(senderName);
        const templateId = smsConfig.msg91.templates.OTP;

        return this.sendSMS(phone, message, 'TRANSACTIONAL', templateId);
    }

    /**
     * Send application update
     */
    async sendApplicationUpdate(phone, status) {
        const message = smsConfig.templates.applicationUpdate(status);
        const templateId = smsConfig.msg91.templates.CAMPAIGN_ALERT;

        return this.sendSMS(phone, message, 'TRANSACTIONAL', templateId);
    }

    /**
     * Send custom message
     */
    async sendCustomMessage(phone, message, messageType = 'TRANSACTIONAL', templateId = null) {
        return this.sendSMS(phone, message, messageType, templateId);
    }

    /**
     * Check SMS delivery status (requires MSG91 integration)
     */
    async checkDeliveryStatus(messageId) {
        try {
            if (!this.isConfigured()) {
                return {
                    success: false,
                    message: 'SMS service not configured'
                };
            }

            const response = await axios.get(
                `${this.apiUrl}/report`,
                {
                    params: {
                        authkey: this.authKey,
                        msgid: messageId
                    },
                    timeout: this.timeout
                }
            );

            return {
                success: true,
                status: response.data,
                messageId: messageId
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error checking delivery status',
                error: error.message
            };
        }
    }

    /**
     * Get error message from error code
     */
    getErrorMessage(errorCode) {
        const errorMessages = {
            1: 'Invalid authentication key',
            2: 'Invalid mobile number',
            3: 'Invalid message type',
            4: 'Invalid DLT parameters',
            5: 'Route not available',
            6: 'Insufficient credits',
            7: 'Invalid sender ID',
            8: 'Invalid template ID',
            9: 'Rate limit exceeded',
            10: 'Message length exceeds limit',
            11: 'Invalid country code',
            12: 'API limit exceeded',
            13: 'Duplicate message',
            14: 'Invalid request format'
        };

        return errorMessages[errorCode] || `Unknown error (${errorCode})`;
    }

    /**
     * Validate phone number format
     */
    isValidPhone(phone) {
        // Remove common formatting characters
        const cleaned = phone.replace(/[\s\-().+]/g, '');

        // Check if it's 10-13 digits (supports international format)
        return /^\d{10,13}$/.test(cleaned);
    }

    /**
     * Format phone number to E.164 format (international)
     */
    formatPhoneNumber(phone) {
        let cleaned = phone.replace(/[\s\-().]/g, '');

        // If it starts with 0, remove it (Indian numbers)
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }

        // If it doesn't start with country code, add India's code
        if (!cleaned.startsWith('91') && cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }

        return cleaned;
    }
}

// Export singleton instance
module.exports = new SMSService();
