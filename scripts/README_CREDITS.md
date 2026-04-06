# Add Credits Script

This folder contains scripts to manually add credits to user accounts for testing purposes.

## Quick Method: Add 10,000 Credits to Test User

For the test user `sapaye4969@httpsu.com`, simply run:

```powershell
cd c:\Users\Abhishek\Desktop\Phyo\phyo_docker\server
npm run add:test-credits
```

This will automatically add 10,000 credits to the account.

## General Method: Add Credits to Any User

To add credits to any user account:

```powershell
npm run add:credits <email> <credits>
```

**Example:**
```powershell
npm run add:credits sapaye4969@httpsu.com 10000
```

## What the Scripts Do

### `add-test-credits.ts`
- Specifically adds 10,000 credits to `sapaye4969@httpsu.com`
- Quick and simple - no arguments needed
- Perfect for testing

### `add-credits.ts`
- Generic script that works for any user
- Requires email and credit amount as arguments
- Flexible for different scenarios

## Output

The script will show:
```
🔗 Connecting to MongoDB...
✓ Connected to MongoDB

🔍 Looking for user: sapaye4969@httpsu.com
✅ User found!
   📧 Email: sapaye4969@httpsu.com
   👤 Type: BRAND (or USER, INFLUENCER, etc.)
   📦 Current Plan: BRONZE
   💰 Current Credits: 3

🎉 SUCCESS! Credits updated!
   Old Credits: 3
   Added: +10000
   New Credits: 10003

✨ You can now use these 10003 credits for testing!

✓ Disconnected from MongoDB
```

## Troubleshooting

### User Not Found
If you see "User not found", make sure:
1. The email is correct (it's case-insensitive)
2. The user has registered/logged in at least once
3. You're connected to the correct MongoDB database

### MongoDB Connection Error
Check that:
1. `MONGO_URI` is set correctly in `.env`
2. You have internet connection
3. MongoDB Atlas allows your IP address

## Testing the Credits

After adding credits:
1. Log in with the credentials:
   - Email: `sapaye4969@httpsu.com`
   - Password: `Abhi@1234`
2. Make API requests that consume credits
3. Check the remaining credits in your profile/dashboard

## Notes

- Credits are stored in the `creditsRemaining` field in the User model
- The script adds credits, it doesn't replace them
- Negative credits are not allowed (minimum is 0)
- This is for testing only - in production, credits should be managed through subscription plans

---

**Created**: December 4, 2025
