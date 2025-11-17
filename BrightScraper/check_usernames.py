"""
Quick script to see all comment usernames
"""
import json
import os

cache_dir = 'api_cache'
files = [f for f in os.listdir(cache_dir) if f.startswith('comments_')]

all_usernames = []

for file in files:
    filepath = os.path.join(cache_dir, file)
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        comments = data.get('data', [])
        for comment in comments:
            username = comment.get('comment_user', 'unknown')
            all_usernames.append(username)
            print(f"  {username}")

print(f"\nTotal: {len(all_usernames)} usernames")
print(f"Unique: {len(set(all_usernames))} unique users")
