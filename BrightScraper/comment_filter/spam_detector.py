"""
Advanced Spam & Abuse Comment Detector
Filters out spam, misleading, abusive, and unwanted comments from Instagram posts

Uses Multiple Detection Methods:
1. Machine Learning (TF-IDF + Logistic Regression)
2. Naive Bayes Classifier
3. Pattern-based heuristics
4. Ensemble voting system
"""
import re
import json
from datetime import datetime
from typing import List, Dict, Tuple
import string
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import pickle
import os


class SpamCommentDetector:
    """
    Multi-layered spam detection system using:
    1. Machine Learning (TF-IDF + Logistic Regression)
    2. Naive Bayes Classifier
    3. Keyword matching
    4. Pattern detection
    5. URL/Link detection
    6. Repetitive content detection
    7. Suspicious username patterns
    8. Ensemble voting for final decision
    """
    
    def __init__(self):
        # Initialize ML models
        self._initialize_ml_models()
        
        # Train models with sample data
        self._train_models()
        # Spam keywords (common spam phrases)
        self.spam_keywords = [
            'dm me', 'dm for', 'check dm', 'inbox me', 'message me',
            'whatsapp', 'telegram', 'snapchat', 'kik',
            'click here', 'link in bio', 'check my bio', 'visit my profile',
            'follow for follow', 'follow back', 'f4f', 'l4l', 'like for like',
            'free followers', 'get followers', 'buy followers',
            'earn money', 'make money', 'get paid', 'work from home',
            'click link', 'tap link', 'swipe up',
            'limited offer', 'limited time', 'act now', 'hurry up',
            'congratulations', 'you won', 'claim now',
            'investment', 'crypto', 'bitcoin', 'forex', 'trading signal',
            'weight loss', 'lose weight', 'get slim',
            'dating', 'hookup', 'meet singles',
            'viagra', 'pills', 'supplement',
            'lottery', 'prize', 'winner',
            'urgent', 'verify account', 'suspended account',
        ]
        
        # Abusive/harassment keywords
        self.abusive_keywords = [
            'idiot', 'stupid', 'dumb', 'moron', 'fool',
            'hate', 'ugly', 'disgusting', 'gross',
            'kill yourself', 'die', 'death',
            'slut', 'whore', 'bitch',
            'racist', 'sexist',
        ]
        
        # Misleading/scam keywords
        self.misleading_keywords = [
            'hack', 'hacked', 'password', 'login',
            'verify', 'verification required', 'confirm identity',
            'account suspended', 'account blocked',
            'security alert', 'unusual activity',
            'click to verify', 'verify now',
            'paypal', 'venmo', 'cashapp', 'zelle',
            'send money', 'wire transfer',
            'giveaway', 'free gift', 'free iphone',
        ]
        
        # Suspicious patterns
        self.url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_pattern = re.compile(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')
        self.emoji_spam_pattern = re.compile(r'[\U0001F300-\U0001F9FF]{5,}')  # 5+ emojis in a row
    
    def _initialize_ml_models(self):
        """Initialize machine learning models"""
        # TF-IDF Vectorizer for text feature extraction
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 2),  # Unigrams and bigrams
            min_df=1,
            stop_words='english'
        )
        
        # Logistic Regression classifier
        self.lr_classifier = LogisticRegression(
            random_state=42,
            max_iter=1000,
            class_weight='balanced'
        )
        
        # Naive Bayes classifier
        self.nb_classifier = MultinomialNB(alpha=1.0)
        
        self.models_trained = False
    
    def _train_models(self):
        """Train ML models with labeled training data"""
        # Training data: (text, label) where 1=spam, 0=not spam
        training_data = [
            # Spam examples
            ("DM me for amazing offers", 1),
            ("Click here to win free followers", 1),
            ("Follow for follow F4F L4L", 1),
            ("Check my bio for exclusive content", 1),
            ("WhatsApp me at +1234567890", 1),
            ("Make money from home click link", 1),
            ("Earn $1000 daily visit my profile", 1),
            ("Free iPhone giveaway link in bio", 1),
            ("Investment opportunity DM for details", 1),
            ("Get followers fast check bio", 1),
            ("Crypto trading signals DM me", 1),
            ("Weight loss pills click here", 1),
            ("Dating site link in profile", 1),
            ("Verify your account now click", 1),
            ("FOLLOW BACK NOW!!!", 1),
            ("🔥🔥🔥🔥🔥🔥 DM ME", 1),
            ("Buy followers cheap visit site", 1),
            ("Work from home earn money", 1),
            ("Limited time offer act now", 1),
            ("Congratulations you won prize", 1),
            ("Urgent verify account suspended", 1),
            ("http://spam-site.com/offer", 1),
            ("Contact me: spam@email.com", 1),
            ("Text me 555-123-4567", 1),
            ("!!!! AMAZING DEAL !!!!!", 1),
            
            # Abusive examples
            ("You are so stupid idiot", 1),
            ("Ugly and disgusting", 1),
            ("I hate you so much", 1),
            ("Kill yourself loser", 1),
            ("You're a moron fool", 1),
            
            # Clean/legitimate comments
            ("Love this post! Great content", 0),
            ("This is amazing! Keep it up", 0),
            ("Beautiful photo! 😍", 0),
            ("So inspiring! Thank you for sharing", 0),
            ("Great work! Really enjoyed this", 0),
            ("This made my day! ❤️", 0),
            ("Incredible! Can't wait for more", 0),
            ("Awesome content! Very informative", 0),
            ("Thanks for this! Really helpful", 0),
            ("Nice! Love your style", 0),
            ("Perfect! Exactly what I needed", 0),
            ("Wonderful post! Keep creating", 0),
            ("So good! Thanks for sharing", 0),
            ("Amazing work! Very creative", 0),
            ("Love it! Great job", 0),
            ("This is fantastic! Well done", 0),
            ("Really appreciate this content", 0),
            ("Brilliant! Love your work", 0),
            ("Outstanding! Keep going", 0),
            ("Excellent post! Very helpful", 0),
            ("Great tips! Thanks", 0),
            ("Nice shot! Beautiful", 0),
            ("Cool! Love this", 0),
            ("Awesome! Great content", 0),
            ("Perfect timing! Thanks", 0),
        ]
        
        texts = [text for text, _ in training_data]
        labels = [label for _, label in training_data]
        
        try:
            # Train TF-IDF vectorizer
            X = self.tfidf_vectorizer.fit_transform(texts)
            
            # Train Logistic Regression
            self.lr_classifier.fit(X, labels)
            
            # Train Naive Bayes
            self.nb_classifier.fit(X, labels)
            
            self.models_trained = True
            print("✓ ML models trained successfully")
        except Exception as e:
            print(f"⚠ Warning: ML model training failed: {e}")
            self.models_trained = False
    
    def _ml_predict(self, text: str) -> Tuple[float, str]:
        """
        Use machine learning to predict spam probability
        
        Returns:
            Tuple of (spam_probability, method_name)
        """
        if not self.models_trained or not text:
            return 0.0, "ML (not available)"
        
        try:
            # Transform text to TF-IDF features
            X = self.tfidf_vectorizer.transform([text])
            
            # Get predictions from both models
            lr_proba = self.lr_classifier.predict_proba(X)[0][1]  # Probability of spam
            nb_proba = self.nb_classifier.predict_proba(X)[0][1]
            
            # Average the probabilities
            avg_proba = (lr_proba + nb_proba) / 2
            
            return avg_proba, "ML (LR+NB)"
        except Exception as e:
            return 0.0, f"ML (error: {str(e)[:20]})"
        
    def detect_spam(self, comment: Dict) -> Tuple[bool, List[str], float]:
        """
        Detect if a comment is spam using ensemble approach
        
        Uses multiple detection methods:
        1. Machine Learning prediction
        2. Rule-based heuristics
        3. Ensemble voting
        
        Args:
            comment: Dictionary with 'text', 'username', etc.
        
        Returns:
            Tuple of (is_spam, reasons, confidence_score)
        """
        text = comment.get('text', '').lower()
        original_text = comment.get('text', '')
        username = comment.get('username', '').lower()
        reasons = []
        
        if not text or len(text.strip()) == 0:
            return True, ['Empty comment'], 1.0
        
        # === METHOD 1: MACHINE LEARNING ===
        ml_spam_prob, ml_method = self._ml_predict(original_text)
        ml_is_spam = ml_spam_prob > 0.6
        
        if ml_is_spam:
            reasons.append(f'{ml_method} detected spam ({ml_spam_prob:.2f})')
        
        # === METHOD 2: RULE-BASED HEURISTICS ===
        heuristic_score = 0.0
        
        # 1. Check spam keywords
        spam_keyword_count = sum(1 for keyword in self.spam_keywords if keyword in text)
        if spam_keyword_count > 0:
            reasons.append(f'Contains spam keywords ({spam_keyword_count})')
            heuristic_score += spam_keyword_count * 0.3
        
        # 2. Check abusive keywords
        abusive_count = sum(1 for keyword in self.abusive_keywords if keyword in text)
        if abusive_count > 0:
            reasons.append(f'Contains abusive language ({abusive_count})')
            heuristic_score += abusive_count * 0.4
        
        # 3. Check misleading keywords
        misleading_count = sum(1 for keyword in self.misleading_keywords if keyword in text)
        if misleading_count > 0:
            reasons.append(f'Contains misleading phrases ({misleading_count})')
            heuristic_score += misleading_count * 0.35
        
        # 4. Check for URLs
        urls = self.url_pattern.findall(original_text)
        if urls:
            reasons.append(f'Contains URLs ({len(urls)})')
            heuristic_score += len(urls) * 0.5
        
        # 5. Check for emails
        emails = self.email_pattern.findall(text)
        if emails:
            reasons.append(f'Contains email addresses ({len(emails)})')
            heuristic_score += len(emails) * 0.4
        
        # 6. Check for phone numbers
        phones = self.phone_pattern.findall(original_text)
        if phones:
            reasons.append(f'Contains phone numbers ({len(phones)})')
            heuristic_score += len(phones) * 0.4
        
        # 7. Check for excessive emojis
        emoji_spam = self.emoji_spam_pattern.findall(original_text)
        if emoji_spam:
            reasons.append('Excessive emoji spam')
            heuristic_score += 0.3
        
        # 8. Check for all caps (shouting)
        if len(original_text) > 10:
            caps_ratio = sum(1 for c in original_text if c.isupper()) / len(original_text)
            if caps_ratio > 0.7:
                reasons.append('Excessive caps (shouting)')
                heuristic_score += 0.2
        
        # 9. Check for repetitive characters
        if re.search(r'(.)\1{4,}', text):  # Same character 5+ times
            reasons.append('Repetitive characters')
            heuristic_score += 0.2
        
        # 10. Check for very short comments (often spam)
        if len(text.strip()) < 3:
            reasons.append('Very short comment')
            heuristic_score += 0.1
        
        # 11. Check username for spam patterns
        suspicious_username_patterns = ['official', 'verified', 'admin', 'support', 'help']
        if any(pattern in username for pattern in suspicious_username_patterns):
            reasons.append('Suspicious username pattern')
            heuristic_score += 0.3
        
        # 12. Check for excessive punctuation
        punct_ratio = sum(1 for c in original_text if c in string.punctuation) / max(len(original_text), 1)
        if punct_ratio > 0.3:
            reasons.append('Excessive punctuation')
            heuristic_score += 0.2
        
        # Normalize heuristic score to 0-1 range
        heuristic_score = min(heuristic_score, 1.0)
        heuristic_is_spam = heuristic_score >= 0.5
        
        # === METHOD 3: ENSEMBLE VOTING ===
        # Combine ML and heuristic predictions
        # Weight: ML=60%, Heuristics=40% (ML is generally more accurate)
        ml_weight = 0.6
        heuristic_weight = 0.4
        
        ensemble_score = (ml_spam_prob * ml_weight) + (heuristic_score * heuristic_weight)
        
        # Final decision: Use ensemble score with threshold
        is_spam = ensemble_score >= 0.5
        
        # Add ensemble info to reasons
        if is_spam:
            reasons.append(f'Ensemble score: {ensemble_score:.3f} (ML: {ml_spam_prob:.2f}, Heuristic: {heuristic_score:.2f})')
        
        return is_spam, reasons, ensemble_score
    
    def filter_comments(self, comments: List[Dict]) -> Dict:
        """
        Filter a list of comments and return clean vs spam
        
        Args:
            comments: List of comment dictionaries
        
        Returns:
            Dictionary with filtered results and statistics
        """
        clean_comments = []
        spam_comments = []
        
        for comment in comments:
            is_spam, reasons, confidence = self.detect_spam(comment)
            
            # Convert numpy types to Python native types for JSON serialization
            comment_with_analysis = {
                **comment,
                'spam_detected': bool(is_spam),  # Convert to native Python bool
                'spam_reasons': reasons,
                'spam_confidence': round(float(confidence), 3)  # Convert to native Python float
            }
            
            if is_spam:
                spam_comments.append(comment_with_analysis)
            else:
                clean_comments.append(comment_with_analysis)
        
        # Calculate statistics
        total_comments = len(comments)
        spam_count = len(spam_comments)
        clean_count = len(clean_comments)
        spam_percentage = (spam_count / total_comments * 100) if total_comments > 0 else 0
        
        # Categorize spam types
        spam_categories = {
            'spam_promotional': 0,
            'abusive': 0,
            'misleading_scam': 0,
            'url_link': 0,
            'contact_info': 0,
            'other': 0
        }
        
        for spam in spam_comments:
            reasons = spam.get('spam_reasons', [])
            if any('abusive' in r.lower() for r in reasons):
                spam_categories['abusive'] += 1
            elif any('misleading' in r.lower() for r in reasons):
                spam_categories['misleading_scam'] += 1
            elif any('url' in r.lower() for r in reasons):
                spam_categories['url_link'] += 1
            elif any('email' in r.lower() or 'phone' in r.lower() for r in reasons):
                spam_categories['contact_info'] += 1
            elif any('spam keyword' in r.lower() for r in reasons):
                spam_categories['spam_promotional'] += 1
            else:
                spam_categories['other'] += 1
        
        return {
            'summary': {
                'total_comments': int(total_comments),
                'clean_comments': int(clean_count),
                'spam_comments': int(spam_count),
                'spam_percentage': round(float(spam_percentage), 2),
                'spam_categories': {k: int(v) for k, v in spam_categories.items()}
            },
            'clean_comments': clean_comments,
            'spam_comments': spam_comments
        }


def save_filtered_results(results: Dict, username: str, output_dir: str = 'output'):
    """
    Save filtered results to JSON file
    
    Args:
        results: Filtered results dictionary
        username: Instagram username
        output_dir: Output directory path
    """
    import os
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'{username}_filtered_{timestamp}.json'
    filepath = os.path.join(output_dir, filename)
    
    # Add metadata
    output_data = {
        'metadata': {
            'username': username,
            'timestamp': timestamp,
            'date': datetime.now().isoformat()
        },
        'results': results
    }
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f'\n✓ Results saved to: {filepath}')
    return filepath


if __name__ == '__main__':
    # Test the detector
    print('\n' + '='*60)
    print('🧪 TESTING SPAM DETECTOR WITH MULTIPLE ALGORITHMS')
    print('='*60)
    print('\nInitializing detector and training ML models...\n')
    
    detector = SpamCommentDetector()
    
    test_comments = [
        {'username': 'user1', 'text': 'Great post! Love your content ❤️'},
        {'username': 'user2', 'text': 'DM me for amazing offers! Click here: http://spam.com'},
        {'username': 'user3', 'text': 'You are so stupid and ugly'},
        {'username': 'user4', 'text': 'This is beautiful! 😍'},
        {'username': 'spammer123', 'text': 'FOLLOW FOR FOLLOW!!! F4F L4L'},
        {'username': 'user5', 'text': 'Check my bio for free followers!'},
        {'username': 'legituser', 'text': 'Amazing work! Keep it up 👍'},
        {'username': 'scammer', 'text': 'Win iPhone now! Click link verify account'},
        {'username': 'normal_person', 'text': 'This made my day, thank you!'},
        {'username': 'abuser', 'text': 'You are an idiot and a moron'},
    ]
    
    print('\n' + '-'*60)
    print('ANALYZING INDIVIDUAL COMMENTS:')
    print('-'*60)
    
    for i, comment in enumerate(test_comments, 1):
        is_spam, reasons, confidence = detector.detect_spam(comment)
        status = "🚫 SPAM" if is_spam else "✅ CLEAN"
        print(f"\n{i}. {status} (Confidence: {confidence:.3f})")
        print(f"   Text: \"{comment['text'][:50]}...\"" if len(comment['text']) > 50 else f"   Text: \"{comment['text']}\"")
        if reasons:
            print(f"   Reasons: {', '.join(reasons[:2])}")
    
    print('\n' + '='*60)
    print('OVERALL STATISTICS:')
    print('='*60)
    
    results = detector.filter_comments(test_comments)
    
    print(f"\nTotal Comments: {results['summary']['total_comments']}")
    print(f"Clean Comments: {results['summary']['clean_comments']}")
    print(f"Spam Comments: {results['summary']['spam_comments']}")
    print(f"Spam Percentage: {results['summary']['spam_percentage']}%")
    
    print('\n' + '-'*60)
    print('SPAM BREAKDOWN BY CATEGORY:')
    print('-'*60)
    for category, count in results['summary']['spam_categories'].items():
        if count > 0:
            print(f'  {category.replace("_", " ").title()}: {count}')
    
    print('\n' + '='*60)
    print('✓ Test Complete!')
    print('='*60 + '\n')
