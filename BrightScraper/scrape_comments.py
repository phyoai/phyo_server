"""
Comments Scraper for Instagram Posts
This scrapes actual comments from Instagram posts
"""
import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

BRIGHTDATA_API_KEY = os.getenv('BRIGHTDATA_API_KEY')
BRIGHTDATA_BASE_URL = 'https://api.brightdata.com/datasets/v3'

# This dataset ID is for Instagram Post scraping (which includes comments)
# You may need to verify this or get the correct one from BrightData
INSTAGRAM_POST_DATASET_ID = 'gd_l1vikfch901nx3by4'


def scrape_post_comments(post_url, max_retries=10, retry_delay=5):
    """
    Scrape comments from a single Instagram post
    
    Args:
        post_url: Instagram post URL (e.g., https://www.instagram.com/p/ABC123/)
        max_retries: Max retry attempts
        retry_delay: Delay between retries in seconds
    
    Returns:
        List of comments with username, text, timestamp
    """
    
    # Trigger scraping
    trigger_url = f'{BRIGHTDATA_BASE_URL}/trigger?dataset_id={INSTAGRAM_POST_DATASET_ID}&include_errors=true&type=discover_new&discover_by=url'
    
    headers = {
        'Authorization': f'Bearer {BRIGHTDATA_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    # BrightData expects array format
    payload = [{
        'url': post_url
    }]
    
    print(f'Triggering comment scrape for: {post_url}')
    
    try:
        response = requests.post(
            trigger_url,
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            print(f'Error: {response.status_code} - {response.text}')
            return []
        
        result = response.json()
        snapshot_id = result.get('snapshot_id')
        
        if not snapshot_id:
            print('Failed to get snapshot ID')
            return []
        
        print(f'Snapshot ID: {snapshot_id}')
        
        # Wait for snapshot to be ready
        time.sleep(2)
        
        retries = 0
        while retries < max_retries:
            # Check snapshot status
            status_url = f'{BRIGHTDATA_BASE_URL}/snapshot/{snapshot_id}?format=json'
            
            try:
                status_response = requests.get(status_url, headers=headers, timeout=15)
                status_response.raise_for_status()
                
                data = status_response.json()
                
                # If it's already a list, return it
                if isinstance(data, list):
                    print(f'Got data! Posts found: {len(data)}')
                    return extract_comments_from_posts(data)
                
                # Check status
                status = data.get('status', 'unknown')
                print(f'Status: {status}')
                
                if status in ['ready', 'success', 'complete']:
                    print('Data is ready!')
                    if 'data' in data:
                        return extract_comments_from_posts(data['data'])
                    return extract_comments_from_posts(data)
                
                elif status == 'running':
                    print(f'Still running... Retry {retries + 1}/{max_retries}')
                    time.sleep(retry_delay)
                    retries += 1
                else:
                    print(f'Unexpected status: {status}')
                    return []
                    
            except Exception as e:
                print(f'Error checking status: {str(e)}')
                retries += 1
                time.sleep(retry_delay)
        
        print('Max retries reached')
        return []
        
    except Exception as e:
        print(f'Error scraping comments: {str(e)}')
        return []


def extract_comments_from_posts(posts_data):
    """
    Extract comments from BrightData posts response
    
    The data structure depends on what BrightData returns.
    This function needs to be adjusted based on actual response.
    """
    all_comments = []
    
    if not isinstance(posts_data, list):
        posts_data = [posts_data]
    
    for post in posts_data:
        # Check if 'comments' field exists and has comment data
        if 'comments' in post:
            comments = post.get('comments', [])
            
            # If comments is a list of comment objects
            if isinstance(comments, list):
                for comment in comments:
                    if isinstance(comment, dict):
                        all_comments.append({
                            'username': comment.get('username', comment.get('user', {}).get('username', 'unknown')),
                            'text': comment.get('text', comment.get('comment', '')),
                            'timestamp': comment.get('timestamp', comment.get('created_at', '')),
                            'likes': comment.get('likes', 0)
                        })
        
        # Alternative: check if 'comment_data' or similar field exists
        if 'comment_data' in post:
            comment_data = post.get('comment_data', [])
            for comment in comment_data:
                all_comments.append({
                    'username': comment.get('username', 'unknown'),
                    'text': comment.get('text', ''),
                    'timestamp': comment.get('timestamp', ''),
                    'likes': comment.get('likes', 0)
                })
    
    print(f'Extracted {len(all_comments)} comments')
    return all_comments


def scrape_multiple_posts_comments(post_urls, max_comments_per_post=100):
    """
    Scrape comments from multiple posts
    
    Args:
        post_urls: List of Instagram post URLs
        max_comments_per_post: Max comments to scrape per post
    
    Returns:
        List of all comments from all posts
    """
    all_comments = []
    
    for i, post_url in enumerate(post_urls):
        print(f'\n[{i+1}/{len(post_urls)}] Scraping: {post_url}')
        comments = scrape_post_comments(post_url)
        
        if comments:
            # Limit comments per post
            all_comments.extend(comments[:max_comments_per_post])
            print(f'  Added {len(comments[:max_comments_per_post])} comments')
        else:
            print(f'  No comments found')
        
        # Small delay between posts
        if i < len(post_urls) - 1:
            time.sleep(2)
    
    print(f'\nTotal comments collected: {len(all_comments)}')
    return all_comments


def scrape_influencer_comments(influencer_username, max_posts=10, max_comments_per_post=100):
    """
    Full workflow: Get influencer's posts, then scrape comments from those posts
    
    Args:
        influencer_username: Instagram username
        max_posts: Max number of posts to analyze
        max_comments_per_post: Max comments per post
    
    Returns:
        {
            'profile': profile_data,
            'posts': posts_data,
            'comments': comments_data
        }
    """
    print(f'\n{"="*60}')
    print(f'SCRAPING COMMENTS FOR: @{influencer_username}')
    print(f'{"="*60}\n')
    
    # Step 1: Get profile + posts (we already have this working)
    print('Step 1: Getting profile and posts...')
    
    trigger_url = f'{BRIGHTDATA_BASE_URL}/trigger?dataset_id={INSTAGRAM_POST_DATASET_ID}&include_errors=true&type=discover_new&discover_by=user_name'
    
    headers = {
        'Authorization': f'Bearer {BRIGHTDATA_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    payload = [{
        'user_name': influencer_username
    }]
    
    try:
        response = requests.post(trigger_url, json=payload, headers=headers, timeout=10)
        
        if response.status_code != 200:
            print(f'Error: {response.text}')
            return None
        
        result = response.json()
        snapshot_id = result.get('snapshot_id')
        print(f'Snapshot ID: {snapshot_id}')
        
        # Wait for data
        time.sleep(3)
        
        # Get profile data
        data_url = f'{BRIGHTDATA_BASE_URL}/snapshot/{snapshot_id}?format=json'
        data_response = requests.get(data_url, headers=headers, timeout=15)
        
        profile_data = data_response.json()
        
        if not isinstance(profile_data, list) or len(profile_data) == 0:
            print('No profile data found')
            return None
        
        profile = profile_data[0]
        posts = profile.get('posts', [])
        
        print(f'✓ Profile found: {profile.get("full_name")}')
        print(f'✓ Posts found: {len(posts)}')
        
        # Step 2: Get post URLs
        print(f'\nStep 2: Extracting post URLs (max {max_posts})...')
        post_urls = [post['url'] for post in posts[:max_posts] if 'url' in post]
        print(f'✓ Got {len(post_urls)} post URLs')
        
        # Step 3: Scrape comments from posts
        print(f'\nStep 3: Scraping comments from posts...')
        all_comments = scrape_multiple_posts_comments(post_urls, max_comments_per_post)
        
        return {
            'profile': profile,
            'posts': posts[:max_posts],
            'comments': all_comments,
            'total_comments': len(all_comments)
        }
        
    except Exception as e:
        print(f'Error: {str(e)}')
        return None


if __name__ == '__main__':
    # Test with your username
    username = 'codebitabhi'
    
    result = scrape_influencer_comments(
        username,
        max_posts=3,  # Analyze top 3 posts
        max_comments_per_post=50  # Get 50 comments per post
    )
    
    if result:
        print(f'\n{"="*60}')
        print('SCRAPING COMPLETE!')
        print(f'{"="*60}')
        print(f'Profile: {result["profile"].get("full_name")}')
        print(f'Posts analyzed: {len(result["posts"])}')
        print(f'Total comments: {result["total_comments"]}')
        print(f'{"="*60}')
        
        # Show sample comments
        if result['comments']:
            print('\nSample comments:')
            for i, comment in enumerate(result['comments'][:5]):
                print(f'\n{i+1}. @{comment["username"]}:')
                print(f'   "{comment["text"]}"')
