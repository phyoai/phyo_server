# System Flow Diagram - BrightScraper with RapidAPI Integration

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INSTAGRAM AUDIENCE ANALYTICS                     │
│                      BrightData + RapidAPI + ML/AI                       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 1. USER REQUEST                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   POST /analyze                                                          │
│   {                                                                      │
│     "username": "influencer_name",                                       │
│     "max_posts": 6                                                       │
│   }                                                                      │
│                                                                          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. PROFILE & POST URLS (BrightData API)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────┐                                                  │
│   │  audience_       │ ──→ scrape_profile_and_posts(username)           │
│   │  analytics.py    │                                                  │
│   └──────────────────┘     │                                            │
│                            │                                            │
│                            ▼                                            │
│   ┌─────────────────────────────────────────────┐                      │
│   │  BrightData API                              │                      │
│   │  https://api.brightdata.com/datasets/v3     │                      │
│   │                                              │                      │
│   │  Dataset: Instagram Profile + Posts          │                      │
│   │  Endpoint: /trigger + /snapshot              │                      │
│   └─────────────────────────────────────────────┘                      │
│                            │                                            │
│                            ▼                                            │
│   📦 Returns:                                                            │
│   • Username, Full Name, Bio                                            │
│   • Followers, Following, Posts Count                                   │
│   • Post URLs (https://instagram.com/p/CODE/)                           │
│   • Post Metadata (likes, comments_count)                               │
│   • Engagement Rate                                                     │
│                                                                          │
│   ✓ Cached in: api_cache/profile_{hash}.json                           │
│                                                                          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. COMMENT SCRAPING (RapidAPI) 🆕                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────┐                                                  │
│   │  audience_       │ ──→ scrape_all_comments(posts, max_posts=6)      │
│   │  analytics.py    │                                                  │
│   └──────────────────┘     │                                            │
│                            │                                            │
│                            ▼                                            │
│   For each post URL:                                                    │
│   ┌──────────────────┐                                                  │
│   │  rapidapi_       │ ──→ scrape_comments_rapidapi(post_url)           │
│   │  comments.py     │                                                  │
│   └──────────────────┘     │                                            │
│                            │                                            │
│                            ▼                                            │
│   ┌─────────────────────────────────────────────┐                      │
│   │  RapidAPI                                    │                      │
│   │  instagram-social-api.p.rapidapi.com        │                      │
│   │                                              │                      │
│   │  Endpoint: /v1/comments                      │                      │
│   │  • Supports pagination (multiple pages)      │                      │
│   │  • Gets 72+ comments per post                │                      │
│   │  • Sorting: recent / popular                 │                      │
│   └─────────────────────────────────────────────┘                      │
│                            │                                            │
│                            ▼                                            │
│   📦 Returns per comment:                                                │
│   • username                                                            │
│   • text                                                                │
│   • timestamp                                                           │
│   • post_url                                                            │
│                                                                          │
│   ✓ Cached in: api_cache/comments_{hash}.json                          │
│                                                                          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. FEATURE EXTRACTION                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────┐                                                  │
│   │  utils/          │ ──→ extract_comment_features(comment)            │
│   │  feature_        │                                                  │
│   │  extractor.py    │                                                  │
│   └──────────────────┘                                                  │
│                                                                          │
│   For each comment, extract:                                            │
│   ┌─────────────────────────────────────┐                              │
│   │ • Username patterns                  │                              │
│   │ • First name (from username)         │                              │
│   │ • Bot detection (ML-based)           │                              │
│   │ • Emoji analysis & gender hints      │                              │
│   │ • Language detection                 │                              │
│   │ • Location slang                     │                              │
│   │ • Text patterns                      │                              │
│   │ • Gender keywords                    │                              │
│   │ • Timestamp → hour                   │                              │
│   └─────────────────────────────────────┘                              │
│                                                                          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. ML/AI PREDICTIONS                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   OPTION A: AI Predictions (GPT-3.5) [if USE_AI_PREDICTIONS=True]       │
│   ┌──────────────────┐                                                  │
│   │  utils/          │ ──→ analyze_all_commenters(commenters_data)      │
│   │  ai_predictor.py │                                                  │
│   └──────────────────┘                                                  │
│   • Batch analysis using OpenAI GPT-3.5                                 │
│   • Predicts: gender, age, country, city                                │
│                                                                          │
│   OPTION B: ML Predictions (Pattern-Based) [Default]                    │
│   ┌──────────────────┐                                                  │
│   │  utils/          │ ──→ predict_gender(), predict_age(),             │
│   │  ml_predictor.py │     predict_country(), predict_city()            │
│   └──────────────────┘                                                  │
│   • Name-based gender prediction                                        │
│   • Language + timezone → country                                       │
│   • Location slang → city                                               │
│   • Hashtags + emoji → age group                                        │
│                                                                          │
│   📊 Predictions Output:                                                 │
│   • Gender Distribution: {male: %, female: %, unknown: %}               │
│   • Age Distribution: {18-24: %, 25-34: %, 35-44: %, 45+: %}            │
│   • Country Distribution: {India: %, USA: %, ...}                       │
│   • City Distribution: {Delhi: %, Mumbai: %, ...}                       │
│   • Language Distribution: {en: %, hi: %, ...}                          │
│                                                                          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. QUALITY & ENGAGEMENT SCORING                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   • Bot Detection Score                                                 │
│     fake_followers_percent = (bot_count / total_comments) * 100         │
│                                                                          │
│   • Audience Quality Score (0-100)                                      │
│     AQ = (1 - fake_follower_%) * 40 +                                   │
│          (engagement_rate / 10) * 40 +                                  │
│          20                                                              │
│                                                                          │
│   • Engagement Rate                                                     │
│     avg_engagement = (avg_likes + avg_comments) / followers             │
│                                                                          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. FINAL OUTPUT (JSON)                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   {                                                                      │
│     "username": "influencer",                                            │
│     "profile_name": "Full Name",                                         │
│     "followers": 100000,                                                 │
│     "following": 500,                                                    │
│     "posts_count": 150,                                                  │
│     "biography": "...",                                                  │
│     "is_verified": true,                                                 │
│     "is_business": true,                                                 │
│     "avg_engagement": 4.25,                                              │
│                                                                          │
│     // Audience Demographics                                            │
│     "gender_distribution": {...},                                        │
│     "age_distribution": {...},                                           │
│     "country_distribution": {...},                                       │
│     "city_distribution": {...},                                          │
│     "language_distribution": {...},                                      │
│                                                                          │
│     // Quality Metrics                                                  │
│     "audience_quality_score": 85.3,                                      │
│     "fake_followers_percent": 12.5,                                      │
│     "total_comments_analyzed": 432,                                      │
│     "real_users_analyzed": 378                                           │
│   }                                                                      │
│                                                                          │
│   ✓ Saved to: scraped_data/{username}_analysis_{timestamp}.json         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Improvements with RapidAPI

| Feature | Before (BrightData) | After (RapidAPI) |
|---------|---------------------|------------------|
| **Comments per Post** | 10-30 | 72+ |
| **Pagination** | Limited | Full Support |
| **Response Time** | 5-15 seconds | 2-5 seconds |
| **API Calls** | 2 (profile + comments) | 2 (profile + comments) |
| **Comment Quality** | Basic | Detailed (with likes, timestamps) |
| **Rate Limits** | Snapshot-based | Request-based |

## Data Flow Summary

1. **User Request** → Username + Max Posts
2. **BrightData** → Profile + Post URLs (cached)
3. **RapidAPI** → Comments from each post (72+ per post, cached)
4. **Feature Extraction** → Text analysis, patterns, language
5. **ML/AI Predictions** → Demographics (gender, age, location)
6. **Quality Scoring** → Bot detection, engagement metrics
7. **Final Output** → Comprehensive JSON with all insights

## Caching Strategy

```
api_cache/
├── profile_{hash}.json         # BrightData profile data
└── comments_{hash}.json        # RapidAPI comments data
```

- **Cache Key (Profile)**: MD5 hash of username
- **Cache Key (Comments)**: MD5 hash of post URL
- **Cache Duration**: Persistent (manual cleanup)
- **Cache Hit**: Returns immediately without API call
- **Cache Miss**: Fetches from API and saves to cache

## Error Handling Flow

```
Try RapidAPI
    ├─ Success → Return comments
    └─ Failure → Return empty list []
    
Try BrightData
    ├─ Success → Return profile
    └─ Failure → Retry (max 10 times)
    
ML/AI Predictions
    ├─ AI Enabled → Try GPT-3.5
    │   ├─ Success → Use AI results
    │   └─ Failure → Fallback to ML
    └─ ML Only → Use pattern-based predictions
```

## API Rate Limits

| API | Rate Limit | Handling |
|-----|-----------|----------|
| BrightData | Snapshot-based | Built-in delays (2s between posts) |
| RapidAPI | 100 req/day (free) | Built-in delays (0.5s between pages) |
| OpenAI GPT | 3 req/min | Batch processing |

## Performance Metrics

### Typical Analysis Timeline:
```
1. Profile Scraping:         ~5-10 seconds
2. Comment Scraping (6 posts): ~15-30 seconds
3. Feature Extraction:        ~2-5 seconds
4. ML/AI Predictions:         ~3-10 seconds
5. Output Generation:         ~1 second
----------------------------------------
Total:                        ~26-56 seconds
```

### With Caching:
```
1. Profile (cached):          ~0.1 seconds
2. Comments (cached):         ~0.5 seconds
3. Processing:                ~6-16 seconds
----------------------------------------
Total:                        ~6-17 seconds
```

## Module Dependencies

```
app.py (Flask API)
    └── audience_analytics.py (Main Engine)
            ├── rapidapi_comments.py (Comment Scraping) 🆕
            │       └── RapidAPI
            ├── BrightData API (Profile Scraping)
            ├── cache_manager.py (Caching)
            └── utils/
                    ├── feature_extractor.py (Feature Extraction)
                    ├── ml_predictor.py (ML Predictions)
                    └── ai_predictor.py (AI Predictions)
```

## Configuration Files

```
.env
    ├── BRIGHTDATA_API_KEY          # For profiles
    ├── RAPIDAPI_KEY                # For comments 🆕
    ├── OPENAI_API_KEY              # For AI predictions
    ├── USE_CACHE                   # Enable/disable caching
    └── USE_AI_PREDICTIONS          # AI vs ML toggle
```

## Next Steps

1. ✅ Profile scraping with BrightData
2. ✅ Comment scraping with RapidAPI (NEW)
3. ✅ Feature extraction
4. ✅ ML/AI predictions
5. ✅ Audience quality scoring
6. 🔜 Real-time monitoring
7. 🔜 Historical trend analysis
8. 🔜 Competitor comparison

---

**Note**: This system seamlessly combines BrightData's profile scraping with RapidAPI's superior comment scraping to provide the most comprehensive Instagram audience analytics available.
