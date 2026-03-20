const FAQ = require('../models/faq');
const { connectToMongo } = require('../connections/db');

const faqData = [
    // General FAQs
    {
        question: "What is Phyo?",
        answer: "Phyo is a comprehensive influencer marketing platform that connects brands with influencers to create authentic campaigns and grow their reach.",
        category: "general",
        order: 1,
        tags: ["platform", "overview"]
    },
    {
        question: "How do I get started?",
        answer: "Sign up for an account, complete your profile, and start exploring influencers or campaigns based on your needs. Brands can create campaigns while influencers can apply to campaigns.",
        category: "general",
        order: 2,
        tags: ["onboarding", "signup"]
    },
    {
        question: "Is there a free trial?",
        answer: "Yes, we offer a 14-day free trial for all new users. You can explore the platform and test features without providing payment information.",
        category: "general",
        order: 3,
        tags: ["trial", "free"]
    },
    // Campaign FAQs
    {
        question: "How do I create a campaign?",
        answer: "As a brand, go to 'Campaigns' > 'Create Campaign'. Fill in campaign details, set budget, select influencer criteria, and launch. You'll then receive applications from interested influencers.",
        category: "campaigns",
        order: 1,
        tags: ["campaign-creation"]
    },
    {
        question: "Can I edit my campaign after posting?",
        answer: "Yes, you can edit campaign details until you have accepted influencers. Once influencers are accepted, major details are locked to avoid confusion.",
        category: "campaigns",
        order: 2,
        tags: ["campaign-management", "editing"]
    },
    // Billing FAQs
    {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards (Visa, MasterCard, American Express), bank transfers, and PayPal. All transactions are secure and encrypted.",
        category: "billing",
        order: 1,
        tags: ["payment", "methods"]
    },
    {
        question: "When will I be charged?",
        answer: "You're charged when you publish a campaign. Influencer payments are processed when deliverables are approved. Monthly subscriptions are charged on the same date each month.",
        category: "billing",
        order: 2,
        tags: ["payment-timing"]
    },
    // Account FAQs
    {
        question: "How do I change my password?",
        answer: "Go to Settings > Security > Change Password. You'll need to enter your current password and then your new password twice for confirmation.",
        category: "account",
        order: 1,
        tags: ["security", "password"]
    },
    // Influencer FAQs
    {
        question: "How much can I earn as an influencer?",
        answer: "Earnings depend on your follower count, engagement rate, and campaign complexity. Influencers typically earn $100-$5,000+ per campaign.",
        category: "influencers",
        order: 1,
        tags: ["earnings"]
    }
];

async function seedFAQs() {
    try {
        await connectToMongo(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        await FAQ.deleteMany({});
        console.log('Cleared existing FAQs');

        const inserted = await FAQ.insertMany(faqData);
        console.log(`✅ Seeded ${inserted.length} FAQs successfully`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding FAQs:', error);
        process.exit(1);
    }
}

seedFAQs();
