const HelpArticle = require('../models/helpArticle');
const { connectToMongo } = require('../connections/db');

const helpArticleData = [
    {
        title: "Getting Started with Phyo",
        slug: "getting-started-with-phyo",
        content: "Welcome to Phyo! This guide will help you get started. First, create your account by visiting our signup page. Select your role (Brand or Influencer) and complete your profile. For Brands: You can immediately create campaigns and connect with influencers. For Influencers: Build your profile with portfolio samples to attract brand partnerships.",
        category: "getting-started",
        author: "Phyo Support",
        tags: ["onboarding", "profile"]
    },
    {
        title: "How to Create Your First Campaign",
        slug: "create-first-campaign",
        content: "Step 1: Click 'New Campaign' from your dashboard. Step 2: Enter campaign name, description, and goals. Step 3: Set your budget and timeline. Step 4: Specify influencer criteria (followers, engagement, niche). Step 5: Add deliverables (posts, stories, videos). Step 6: Review and launch. Once live, influencers can apply to your campaign.",
        category: "campaigns",
        author: "Phyo Support",
        tags: ["campaign-creation", "tutorial"]
    },
    {
        title: "Managing Your Influencer Applications",
        slug: "manage-applications",
        content: "After launching your campaign, you'll receive applications from interested influencers. Review each application: Check their profile and previous work. View their audience demographics. Read their proposal. Accept: Influencer becomes part of your campaign team. Reject: Politely decline (influencer receives notification). Negotiate: Counter-offer with different terms if needed.",
        category: "campaigns",
        author: "Phyo Support",
        tags: ["applications", "selection"]
    },
    {
        title: "Understanding Payment Processing",
        slug: "payment-processing",
        content: "Payments work as follows: Campaign Launch: You pay Phyo the campaign budget (held in escrow). Deliverable Submission: Influencers submit their content. Your Approval: You review and approve deliverables. Payment Release: Once approved, funds are released to influencers. Phyo Commission: We charge 10-15% commission on all transactions. Refunds: Available within 7 days of campaign launch if no influencers accepted.",
        category: "billing",
        author: "Phyo Support",
        tags: ["billing", "payments"]
    },
    {
        title: "Optimizing Your Influencer Profile",
        slug: "optimize-profile",
        content: "To attract more brand partnerships: Add Professional Photo: Use a clear, professional headshot. Complete Your Bio: Write compelling description of your niche and audience. Link Social Accounts: Connect Instagram, TikTok, YouTube, etc. Add Portfolio: Upload your best previous work. Update Rate Card: Be clear about your pricing and deliverables. Enable Notifications: Get alerts when matching campaigns are posted.",
        category: "getting-started",
        author: "Phyo Support",
        tags: ["profile", "influencer"]
    },
    {
        title: "How to Submit Deliverables",
        slug: "submit-deliverables",
        content: "After accepting a campaign: Review Requirements: Check campaign brief and deliverable specifications. Create Content: Produce the agreed deliverables (posts, videos, stories). Submit: Upload content through the platform. Wait for Approval: Brand reviews your submission. Revisions: If requested, update content. Payment: Once approved, get paid to your account.",
        category: "campaigns",
        author: "Phyo Support",
        tags: ["deliverables", "influencer"]
    },
    {
        title: "Billing and Account FAQ",
        slug: "billing-account-faq",
        content: "Common questions about billing: Minimum Campaign Budget: $500 (some plans higher). Payment Methods: Credit cards, bank transfer, PayPal. Subscription Plans: Free (limited), Pro ($99/month), Agency ($499/month). Billing Cycle: Monthly subscriptions renew same date each month. Invoices: Available in Account > Billing. Transaction History: All payments tracked in Transactions tab.",
        category: "billing",
        author: "Phyo Support",
        tags: ["billing", "account"]
    },
    {
        title: "Security and Privacy at Phyo",
        slug: "security-privacy",
        content: "Your security is our priority: Data Encryption: All data encrypted in transit and at rest using SSL/TLS. Payment Security: PCI-DSS compliant, never store card details. Privacy: GDPR and CCPA compliant. Two-Factor Authentication: Available in Settings > Security. Never Share: We never share your data with third parties without permission. Report Issues: Contact security@phyo.ai for security concerns.",
        category: "technical-support",
        author: "Phyo Support",
        tags: ["security", "privacy"]
    },
    {
        title: "Troubleshooting Common Issues",
        slug: "troubleshooting",
        content: "Can't login: Clear browser cache, try Forgot Password, or contact support. Campaign not showing: Refresh page, check if it's in draft status. Notification issues: Go to Settings > Notifications and enable required channels. Payment failed: Try different payment method, check card details, or contact support. Performance slow: Clear cache, use updated browser, check internet speed.",
        category: "technical-support",
        author: "Phyo Support",
        tags: ["troubleshooting", "support"]
    }
];

async function seedHelpArticles() {
    try {
        await connectToMongo(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        await HelpArticle.deleteMany({});
        console.log('Cleared existing help articles');

        const inserted = await HelpArticle.insertMany(helpArticleData);
        console.log(`✅ Seeded ${inserted.length} help articles successfully`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding help articles:', error);
        process.exit(1);
    }
}

seedHelpArticles();
