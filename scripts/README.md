# Scripts

This directory contains utility scripts for managing the Phyo Server database.

## Import Influencers

### Prerequisites
- Make sure your `.env` file has the correct `MONGO_URI` 
- Place your `phyo.influencers.json` file in the project root directory

### Usage

#### Import or Update Influencers (keeps existing data)
```bash
npm run import:influencers
```

#### Clear existing data and import fresh
```bash
npm run import:clear
```

### What the script does:
- ✅ Connects to MongoDB using your environment configuration
- ✅ Reads `phyo.influencers.json` from the project root
- ✅ Transforms data to match the Influencer schema
- ✅ Handles null values and sets appropriate defaults
- ✅ Updates existing influencers (by username) or creates new ones
- ✅ Provides detailed progress logs and error reporting
- ✅ Shows final summary with success/error counts

### Data Structure Expected:
The script expects JSON data with the structure:
```json
[
  {
    "name": "influencer_name",
    "user_name": "username",
    "categoryInstagram": "category",
    "categoryYouTube": "category",
    "city": "city",
    "state": "state",
    "language": "language",
    "gender": "Male|Female|Other",
    "instagramData": { ... },
    "youtubeData": { ... }
  }
]
```

### Error Handling:
- Individual influencer import errors won't stop the entire process
- All errors are logged and summarized at the end
- Missing required fields are filled with sensible defaults 