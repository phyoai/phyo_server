"""
Import existing scraped data into cache system
This allows you to use already-scraped data for testing
"""
import json
import os
from cache_manager import save_to_cache

print("="*70)
print("IMPORT SCRAPED DATA INTO CACHE")
print("="*70)

# Find all scraped JSON files
scraped_dir = 'scraped_data'
if not os.path.exists(scraped_dir):
    print(f"❌ Directory not found: {scraped_dir}")
    exit(1)

files = [f for f in os.listdir(scraped_dir) if f.endswith('.json')]
print(f"\n📂 Found {len(files)} scraped files")

imported_count = 0

for filename in files:
    filepath = os.path.join(scraped_dir, filename)
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract username and profile data
        username = data.get('username')
        profile_data = data.get('data')
        
        if not username or not profile_data:
            print(f"⚠️  Skipping {filename} - missing username or data")
            continue
        
        # Save to cache
        save_to_cache('profile', username, profile_data)
        imported_count += 1
        
    except Exception as e:
        print(f"❌ Error processing {filename}: {e}")

print(f"\n✅ Successfully imported {imported_count} profiles into cache")
print("\nNow you can run tests without API calls:")
print("  python test_full_system.py")
print("  python manage_cache.py list")
