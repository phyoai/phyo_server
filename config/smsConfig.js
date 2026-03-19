/**
 * SMS Configuration
 * MSG91 API for SMS delivery via BSNL DLT
 */

module.exports = {
    // MSG91 API Configuration
    msg91: {
        authKey: process.env.MSG91_AUTH_KEY || 'YOUR_MSG91_AUTH_KEY',
        apiUrl: 'https://api.msg91.com/apiv5',
        senderId: process.env.MSG91_SENDER_ID || 'PHYO',
        route: process.env.MSG91_ROUTE || '4',  // 1=Transactional, 4=OTP, 5=Promotional

        // Template IDs (Register these on MSG91 Dashboard)
        templates: {
            OTP: process.env.MSG91_OTP_TEMPLATE_ID || '60da7c9ed6fc0536ec122e01',
            WELCOME: process.env.MSG91_WELCOME_TEMPLATE_ID || '60da7d2ed6fc0536ec122e02',
            CAMPAIGN_ALERT: process.env.MSG91_CAMPAIGN_TEMPLATE_ID || '60da7d5ed6fc0536ec122e03',
            PAYMENT_CONFIRMATION: process.env.MSG91_PAYMENT_TEMPLATE_ID || '60da7d8ed6fc0536ec122e04',
            SUBSCRIPTION_UPDATE: process.env.MSG91_SUBSCRIPTION_TEMPLATE_ID || '60da7dbed6fc0536ec122e05'
        }
    },

    // BSNL DLT Configuration (via MSG91)
    dlt: {
        enabled: true,
        entityId: process.env.DLT_ENTITY_ID || 'YOUR_DLT_ENTITY_ID',
        principals: {
            // Register principal IDs on BSNL portal
            transactional: process.env.DLT_PRINCIPAL_TRANSACTIONAL || 'YOUR_PRINCIPAL_ID_1',
            promotional: process.env.DLT_PRINCIPAL_PROMOTIONAL || 'YOUR_PRINCIPAL_ID_2'
        }
    },

    // SMS Settings
    settings: {
        enabled: true,
        maxRetries: 3,
        timeout: 10000,
        batchSize: 50,
        rateLimit: {
            enabled: true,
            maxPerDay: 100,
            maxPerHour: 20,
            maxPerMinute: 5
        }
    },

    // Message Types
    messageTypes: {
        OTP: {
            type: 4,  // OTP route
            priority: 'high',
            expiryMinutes: 10,
            retryAttempts: 2
        },
        TRANSACTIONAL: {
            type: 1,  // Transactional route
            priority: 'high',
            expiryMinutes: 60,
            retryAttempts: 3
        },
        PROMOTIONAL: {
            type: 5,  // Promotional route
            priority: 'low',
            expiryMinutes: 1440,
            retryAttempts: 1
        },
        ALERT: {
            type: 1,  // Transactional route
            priority: 'high',
            expiryMinutes: 60,
            retryAttempts: 2
        }
    },

    // Message Templates
    templates: {
        emailVerificationOTP: (otp, name) => {
            return `Hi ${name}, Your Phyo email verification OTP is ${otp}. Valid for 10 minutes. Do not share with anyone. -Phyo`;
        },
        phoneVerificationOTP: (otp, name) => {
            return `Hi ${name}, Your Phyo phone verification OTP is ${otp}. Valid for 10 minutes. -Phyo`;
        },
        loginOTP: (otp, name) => {
            return `Hi ${name}, Your Phyo login OTP is ${otp}. Valid for 10 minutes. -Phyo`;
        },
        welcomeMessage: (name) => {
            return `Welcome to Phyo, ${name}! Start growing your influence today. Visit app.phyo.ai -Phyo`;
        },
        campaignAlert: (campaignName) => {
            return `New campaign "${campaignName}" matches your profile. Apply now to earn! Visit Phyo app. -Phyo`;
        },
        paymentConfirmation: (amount, transactionId) => {
            return `Payment of ₹${amount} received. Ref: ${transactionId}. Thank you! -Phyo`;
        },
        subscriptionUpgrade: (planName) => {
            return `Welcome to ${planName} plan! Enjoy premium features. Contact support: help@phyo.ai -Phyo`;
        },
        subscriptionPaused: (duration) => {
            return `Your Phyo subscription is paused for ${duration}. Resume anytime from settings. -Phyo`;
        },
        subscriptionResumed: () => {
            return `Your Phyo subscription is now active. Enjoy all features! -Phyo`;
        },
        subscriptionCancelled: () => {
            return `Your Phyo subscription has been cancelled. We hope to see you again! -Phyo`;
        },
        collaborationRequest: (senderName) => {
            return `${senderName} sent you a collaboration request on Phyo! Check it now. -Phyo`;
        },
        applicationUpdate: (status) => {
            return `Your campaign application status updated to: ${status}. Check details in app. -Phyo`;
        }
    }
};
