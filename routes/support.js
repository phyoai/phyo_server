const express = require('express');
const router = express.Router();
const {
    getFAQs,
    getSupportedLanguages,
    submitContactForm,
    getHelpArticles
} = require('../controllers/supportController');

// FAQs
router.get('/faqs', getFAQs);

// Languages
router.get('/languages', getSupportedLanguages);

// Contact/Support
router.post('/contact', submitContactForm);

// Articles
router.get('/articles/:category', getHelpArticles);

module.exports = router;
