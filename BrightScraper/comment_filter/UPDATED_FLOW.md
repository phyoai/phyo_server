# 🔄 Updated System Flow with RapidAPI

## Complete Data Flow (Step by Step)

```
┌──────────────────────────────────────────────────────────────┐
│                    USER BROWSER INPUT                        │
│  • Username: "yashwanth_shettyy"                            │
│  • Max Posts: 6                                              │
│  • Max Comments: 100                                         │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────────┐
│              FLASK SERVER (filter_app.py)                    │
│  Receives POST /filter request                               │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    ↓
        ┌───────────┴───────────┐
        │                       │
        ↓                       ↓
┌──────────────────┐   ┌──────────────────┐
│   STEP 1 & 2:    │   │                  │
│   BRIGHTDATA     │   │  Used For:       │
│   API            │   │  • Profile info  │
│                  │   │  • Posts list    │
│  audience_       │   │  • Post URLs     │
│  analytics.py    │   │                  │
└────────┬─────────┘   └──────────────────┘
         │
         │ Returns:
         │ {
         │   "username": "yashwanth_shettyy",
         │   "full_name": "Yashwanth M K",
         │   "followers": 50000,
         │   "posts": [
         │     {"url": "https://instagram.com/p/ABC123/", "likes": 500},
         │     {"url": "https://instagram.com/p/DEF456/", "likes": 300},
         │     ... (6 total)
         │   ]
         │ }
         ↓
┌──────────────────────────────────────────────────────────────┐
│              EXTRACT POST URLS                               │
│  post_urls = [                                               │
│    "https://instagram.com/p/ABC123/",                        │
│    "https://instagram.com/p/DEF456/",                        │
│    ... (6 urls)                                              │
│  ]                                                           │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────────┐
│              STEP 3: RAPIDAPI FOR COMMENTS                   │
│              (rapidapi_scraper.py)                           │
│                                                              │
│  For EACH post URL (6 posts):                               │
│    ├─ Extract code: "ABC123"                                │
│    ├─ Call RapidAPI                                         │
│    ├─ Get page 1 (14 comments + token)                      │
│    ├─ Get page 2 (14 comments + token)                      │
│    ├─ Get page 3 (14 comments + token)                      │
│    ├─ ... continue pagination ...                           │
│    └─ Until 72+ comments or max reached                     │
│                                                              │
│  Result per post: 72+ comments                              │
│  Total: 432+ comments (72 × 6 posts)                        │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    │ Returns:
                    │ [
                    │   {
                    │     "username": "user1",
                    │     "text": "Great post!",
                    │     "timestamp": 1740420393,
                    │     "like_count": 10,
                    │     "post_url": "https://instagram.com/p/ABC123/"
                    │   },
                    │   ... (432+ comments)
                    │ ]
                    ↓
┌──────────────────────────────────────────────────────────────┐
│         STEP 4: ML SPAM DETECTION                            │
│         (spam_detector.py)                                   │
│                                                              │
│  For EACH comment (432 comments):                           │
│    │                                                         │
│    ├─ METHOD 1: Machine Learning (60%)                      │
│    │   ├─ TF-IDF vectorization                              │
│    │   ├─ Logistic Regression: 0.85 spam                    │
│    │   └─ Naive Bayes: 0.78 spam                            │
│    │       → Average: 0.815 (81.5% spam)                    │
│    │                                                         │
│    ├─ METHOD 2: Heuristics (40%)                            │
│    │   ├─ Check spam keywords                               │
│    │   ├─ Check URLs/emails/phones                          │
│    │   ├─ Check patterns                                    │
│    │   └─ Score: 0.60 (60% spam)                            │
│    │                                                         │
│    └─ METHOD 3: Ensemble                                    │
│        → (0.815 × 0.6) + (0.60 × 0.4) = 0.729              │
│        → If ≥ 0.5 = SPAM ❌                                 │
│                                                              │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    │ Returns:
                    │ {
                    │   "summary": {
                    │     "total_comments": 432,
                    │     "clean_comments": 380,
                    │     "spam_comments": 52,
                    │     "spam_percentage": 12.04
                    │   },
                    │   "clean_comments": [...],
                    │   "spam_comments": [...]
                    │ }
                    ↓
┌──────────────────────────────────────────────────────────────┐
│         STEP 5: SAVE RESULTS                                 │
│         (spam_detector.py)                                   │
│                                                              │
│  File: output/yashwanth_shettyy_filtered_20251114.json      │
│  Contains:                                                   │
│    • All clean comments                                     │
│    • All spam comments (with reasons)                       │
│    • Statistics and breakdown                               │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────────┐
│         STEP 6: RETURN TO USER                               │
│         (filter_app.py → Browser)                            │
│                                                              │
│  Browser displays:                                           │
│    ✅ Total Comments: 432                                    │
│    ✅ Clean Comments: 380 (87.96%)                           │
│    ❌ Spam Filtered: 52 (12.04%)                             │
│                                                              │
│    Spam Breakdown:                                           │
│    • Promotional: 30                                         │
│    • Abusive: 10                                             │
│    • URL/Link: 8                                             │
│    • Contact Info: 4                                         │
│                                                              │
│    📁 Saved to: output/yashwanth_shettyy_filtered...json    │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Components

### 1. **BrightData API** (Profile + Posts)
- **File:** `audience_analytics.py`
- **Purpose:** Get profile info and post URLs
- **Output:** Profile data + 6 post URLs
- **Time:** ~10 seconds (cached) or ~30 seconds (fresh)

### 2. **RapidAPI** (Comments)
- **File:** `rapidapi_scraper.py`
- **Purpose:** Get ALL comments from each post
- **Output:** 72+ comments per post
- **Time:** ~1-2 seconds per post

### 3. **ML Spam Detector** (Filtering)
- **File:** `spam_detector.py`
- **Purpose:** Classify comments as spam/clean
- **Output:** Filtered comments + statistics
- **Time:** <1 second for 432 comments

---

## 📊 Data Transformation

### Input → BrightData → RapidAPI → ML → Output

```
INPUT:
"yashwanth_shettyy"

↓ BrightData API

PROFILE + POSTS:
{
  "username": "yashwanth_shettyy",
  "posts": [
    "https://instagram.com/p/ABC123/",
    "https://instagram.com/p/DEF456/",
    ...
  ]
}

↓ RapidAPI

RAW COMMENTS:
[
  {"user": "user1", "text": "Great!"},
  {"user": "spammer", "text": "DM me for followers"},
  ... (432 comments)
]

↓ ML Processing

ANALYZED COMMENTS:
[
  {
    "username": "user1",
    "text": "Great!",
    "spam_detected": false,
    "spam_confidence": 0.05
  },
  {
    "username": "spammer",
    "text": "DM me for followers",
    "spam_detected": true,
    "spam_reasons": ["ML detected (0.85)", "Keywords (2)"],
    "spam_confidence": 0.78
  }
]

↓ Categorization

FINAL OUTPUT:
{
  "clean": 380 comments,
  "spam": 52 comments,
  "categories": {
    "promotional": 30,
    "abusive": 10,
    ...
  }
}
```

---

## ⚡ Performance Metrics

| Stage | Time | Output |
|-------|------|--------|
| User Input | instant | username |
| BrightData (profile) | 10-30s | 1 profile + 6 URLs |
| RapidAPI (comments) | 6-12s | 432+ comments |
| ML Processing | <1s | filtered data |
| Save & Display | <1s | JSON + browser view |
| **TOTAL** | **~20-45s** | **Complete analysis** |

---

## 🎯 Why This Flow?

### ✅ **Optimized for Speed**
- BrightData: Only for what it's best at (profile data)
- RapidAPI: Fast comments retrieval
- No redundant API calls

### ✅ **Optimized for Data Quality**
- BrightData: Reliable profile/posts data
- RapidAPI: More comments (72+ vs 15)
- ML: Accurate spam detection

### ✅ **Optimized for Cost**
- Minimal BrightData calls (cached)
- RapidAPI only when needed
- No wasted API credits

---

## 🔧 Configuration

```python
# filter_app.py

# Step 1: BrightData for profile
analytics = AudienceAnalytics(use_ai=False)
profile = analytics.scrape_profile_and_posts(username)

# Step 2: Extract post URLs
post_urls = [post['url'] for post in posts[:max_posts]]

# Step 3: RapidAPI for comments
comments = scrape_multiple_posts_rapidapi(
    post_urls,
    max_comments_per_post=100,  # or None for unlimited
    sort_by='recent'
)

# Step 4: ML filtering
detector = SpamCommentDetector()
filtered = detector.filter_comments(comments)
```

---

Made with 🧠 + 💻 = 🚀
