"""
Apify Instagram Comments Scraper
Replaces RapidAPI for comment scraping - better results, no pagination issues
"""
import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

APIFY_TOKEN = os.getenv('APIFY_TOKEN')
ACTOR_ID = os.getenv('APIFY_ACTOR_ID')

# ⚙️ CONFIGURATION - Change this to adjust max comments per post
# Can be overridden by MAX_COMMENTS_PER_POST in .env file
# This is the DEFAULT, but will be dynamically adjusted based on follower count
MAX_COMMENTS_PER_POST = int(os.getenv('MAX_COMMENTS_PER_POST', '50'))  # Default: 50 comments per post


def scrape_comments_apify(post_url, max_comments=None, timeout=600):
    """
    Scrape comments from a post using Apify
    
    Args:
        post_url: Instagram post URL
        max_comments: Maximum comments to retrieve (None = use MAX_COMMENTS_PER_POST constant)
        timeout: Maximum wait time in seconds (default: 600 = 10 minutes)
    
    Returns:
        List of comments in the format expected by audience_analytics.py
        Format: [{'username': str, 'text': str, 'timestamp': str, 'post_url': str, 'full_name': str, 'profile_pic_url': str}, ...]
    """
    # Use the global constant if max_comments is not specified
    if max_comments is None:
        max_comments = MAX_COMMENTS_PER_POST
    
    print(f'🚀 Using Apify to scrape: {post_url} (max: {max_comments} comments)')
    
    # Prepare input for Apify Actor
    input_data = {
        "directUrls": [post_url],  # Instagram URLs
        "resultsType": "comments",  # Scrape comments
    }
    
    # Add max results if specified
    if max_comments:
        input_data["resultsLimit"] = max_comments
    
    headers = {"Authorization": f"Bearer {APIFY_TOKEN}"}
    
    try:
        # Start Apify run
        run_response = requests.post(
            f"https://api.apify.com/v2/acts/{ACTOR_ID}/runs",
            headers=headers,
            json=input_data,
            timeout=30
        )
        
        if run_response.status_code != 201:
            print(f'   ⚠ Failed to start Apify run: {run_response.text}')
            return []
        
        run_data = run_response.json()
        run_id = run_data["data"]["id"]
        default_dataset_id = run_data["data"]["defaultDatasetId"]
        
        print(f'   Run started! Run ID: {run_id}')
        
        # Wait for completion
        start_time = time.time()
        
        while True:
            if time.time() - start_time > timeout:
                print(f'   ⚠ Timeout waiting for Apify run')
                return []
            
            status_response = requests.get(
                f"https://api.apify.com/v2/actor-runs/{run_id}",
                headers=headers,
                timeout=30
            )
            
            if status_response.status_code != 200:
                print(f'   ⚠ Failed to get run status: {status_response.text}')
                return []
            
            run_info = status_response.json()["data"]
            status = run_info["status"]
            
            if status in ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]:
                break
            
            # Wait before checking again
            time.sleep(5)
        
        if status != "SUCCEEDED":
            print(f'   ⚠ Apify run {status.lower()}')
            return []
        
        # Get results from dataset
        print(f'   Fetching results from dataset: {default_dataset_id}')
        
        dataset_response = requests.get(
            f"https://api.apify.com/v2/datasets/{default_dataset_id}/items",
            headers=headers,
            timeout=30
        )
        
        if dataset_response.status_code != 200:
            print(f'   ⚠ Failed to get results: {dataset_response.text}')
            return []
        
        results = dataset_response.json()
        print(f'   Got {len(results)} raw comments')
        
        # Transform Apify format to expected format
        transformed_comments = []
        
        for item in results:
            # Extract owner info
            owner = item.get('owner', {})
            
            # Get comment text
            comment_text = item.get('text', '')
            
            # Skip empty comments
            if not comment_text or not comment_text.strip():
                continue
            
            # Transform to expected format
            comment = {
                'username': owner.get('username', item.get('ownerUsername', 'unknown')),
                'full_name': owner.get('full_name', ''),
                'profile_pic_url': owner.get('profile_pic_url', item.get('ownerProfilePicUrl', '')),
                'text': comment_text,
                'timestamp': item.get('timestamp', ''),
                'post_url': post_url,
                'like_count': item.get('likesCount', 0),
                'comment_id': item.get('id', ''),
                'is_verified': owner.get('is_verified', False),
                'is_private': owner.get('is_private', False),
                'replies_count': item.get('repliesCount', 0)
            }
            
            transformed_comments.append(comment)
        
        print(f'   ✓ Total valid comments: {len(transformed_comments)}')
        return transformed_comments
        
    except requests.exceptions.Timeout:
        print(f'   ⚠ Request timeout')
        return []
    except Exception as e:
        print(f'   ⚠ Error: {str(e)}')
        return []


def scrape_multiple_posts_apify(post_urls, max_comments_per_post=None, timeout=600):
    """
    Scrape comments from multiple posts using Apify
    
    Args:
        post_urls: List of Instagram post URLs
        max_comments_per_post: Max comments per post (None = use MAX_COMMENTS_PER_POST constant)
        timeout: Maximum wait time per post in seconds
    
    Returns:
        List of all comments from all posts
    """
    # Use the global constant if max_comments_per_post is not specified
    if max_comments_per_post is None:
        max_comments_per_post = MAX_COMMENTS_PER_POST
    
    all_comments = []
    
    for i, post_url in enumerate(post_urls):
        print(f'\n[{i+1}/{len(post_urls)}] Scraping: {post_url}')
        
        try:
            comments = scrape_comments_apify(
                post_url,
                max_comments=max_comments_per_post,
                timeout=timeout
            )
            
            all_comments.extend(comments)
            print(f'  ✓ Added {len(comments)} comments')
            
        except Exception as e:
            print(f'  ✗ Failed: {str(e)}')
        
        # Delay between posts to avoid overwhelming the API
        if i < len(post_urls) - 1:
            time.sleep(2)
    
    print(f'\n✓ Total comments from all posts: {len(all_comments)}')
    return all_comments


if __name__ == '__main__':
    # Test with a sample post
    test_url = 'https://www.instagram.com/p/DRmw6M4ifan/'
    
    print('\n' + '='*60)
    print('🧪 TESTING APIFY COMMENT SCRAPER')
    print('='*60 + '\n')
    
    comments = scrape_comments_apify(test_url, max_comments=10)
    
    print('\n' + '='*60)
    print('SAMPLE COMMENTS:')
    print('='*60)
    
    for i, comment in enumerate(comments[:5], 1):
        print(f'\n{i}. @{comment["username"]} ({comment.get("full_name", "N/A")})')
        print(f'   "{comment["text"][:80]}..."' if len(comment['text']) > 80 else f'   "{comment["text"]}"')
        print(f'   Likes: {comment.get("like_count", 0)} | Verified: {comment.get("is_verified", False)}')
