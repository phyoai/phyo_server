"""
RapidAPI Instagram Comments Scraper
Replaces BrightData for comment scraping - gets 72+ comments per post
"""
import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY', '8ba7cc2083msh897e56445af41acp1b633ejsn30179c4356ec')
RAPIDAPI_HOST = 'instagram-social-api.p.rapidapi.com'


def extract_post_code(post_url):
    """
    Extract post code from Instagram URL
    
    Examples:
    https://www.instagram.com/p/DGHx8Sly9hw/ -> DGHx8Sly9hw
    https://www.instagram.com/reel/ABC123xyz/ -> ABC123xyz
    """
    # Remove trailing slash
    post_url = post_url.rstrip('/')
    
    # Extract code from URL
    if '/p/' in post_url:
        code = post_url.split('/p/')[-1].split('/')[0]
    elif '/reel/' in post_url:
        code = post_url.split('/reel/')[-1].split('/')[0]
    elif '/tv/' in post_url:
        code = post_url.split('/tv/')[-1].split('/')[0]
    else:
        # Try to use the URL as-is
        code = post_url.split('/')[-1]
    
    return code


def scrape_comments_rapidapi(post_url, max_comments=None, sort_by='recent'):
    """
    Scrape comments from a post using RapidAPI
    
    Args:
        post_url: Instagram post URL or code
        max_comments: Maximum comments to retrieve (None = all, recommended: 70 per post)
        sort_by: 'recent' or 'popular'
    
    Returns:
        List of comments in the format expected by audience_analytics.py
        Format: [{'username': str, 'text': str, 'timestamp': str, 'post_url': str}, ...]
    """
    print(f'🚀 Using RapidAPI to scrape: {post_url}')
    
    # Extract post code
    post_code = extract_post_code(post_url)
    print(f'   Post code: {post_code}')
    
    all_comments = []
    pagination_token = None
    page = 1
    
    headers = {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY
    }
    
    while True:
        try:
            # Build URL with pagination
            url = f'https://{RAPIDAPI_HOST}/v1/comments'
            params = {
                'code_or_id_or_url': post_code,
                'sort_by': sort_by
            }
            
            if pagination_token:
                params['pagination_token'] = pagination_token
            
            print(f'   Page {page}: Fetching comments...')
            
            response = requests.get(url, headers=headers, params=params, timeout=15)
            
            if response.status_code != 200:
                print(f'   ⚠ API Error: {response.status_code} - {response.text[:200]}')
                break
            
            data = response.json()
            
            # Extract comments from response - actual RapidAPI format
            items = data.get('data', {}).get('items', [])
            total = data.get('data', {}).get('total', 0)
            
            if not items:
                print(f'   ✓ No more comments')
                break
            
            # Add comments to list in the expected format
            for item in items:
                comment_text = item.get('text', '')
                
                # Skip empty comments (some comments might only have media/stickers)
                if not comment_text or not comment_text.strip():
                    continue
                
                # Extract user info (includes full_name!)
                user_data = item.get('user', {})
                
                comment = {
                    'username': user_data.get('username', 'unknown'),
                    'full_name': user_data.get('full_name', ''),  # NEW: Full name for better gender detection!
                    'text': comment_text,
                    'timestamp': str(item.get('created_at', '')),
                    'post_url': post_url,
                    'like_count': item.get('like_count', 0),
                    'comment_id': item.get('id', ''),
                    'is_verified': user_data.get('is_verified', False),
                    'is_private': user_data.get('is_private', False)
                }
                
                all_comments.append(comment)
            
            print(f'   ✓ Got {len([i for i in items if i.get("text", "").strip()])} valid comments (Total collected: {len(all_comments)}/{total})')
            
            # Check if we have enough comments
            if max_comments and len(all_comments) >= max_comments:
                print(f'   ✓ Reached max comments limit: {max_comments}')
                all_comments = all_comments[:max_comments]
                break
            
            # Check for pagination token
            pagination_token = data.get('pagination_token')
            
            if not pagination_token:
                print(f'   ✓ All comments retrieved')
                break
            
            page += 1
            
            # Small delay to avoid rate limits
            time.sleep(0.5)
            
        except Exception as e:
            print(f'   ⚠ Error: {str(e)}')
            break
    
    print(f'✓ Total comments collected: {len(all_comments)}')
    return all_comments


def scrape_multiple_posts_rapidapi(post_urls, max_comments_per_post=12, sort_by='recent'):
    """
    Scrape comments from multiple posts using RapidAPI
    
    Args:
        post_urls: List of Instagram post URLs
        max_comments_per_post: Max comments per post (default: 70)
        sort_by: 'recent' or 'popular'
    
    Returns:
        List of all comments from all posts
    """
    all_comments = []
    
    for i, post_url in enumerate(post_urls):
        print(f'\n[{i+1}/{len(post_urls)}] Scraping: {post_url}')
        
        try:
            comments = scrape_comments_rapidapi(
                post_url,
                max_comments=max_comments_per_post,
                sort_by=sort_by
            )
            
            all_comments.extend(comments)
            print(f'  ✓ Added {len(comments)} comments')
            
        except Exception as e:
            print(f'  ✗ Failed: {str(e)}')
        
        # Delay between posts to avoid rate limits
        if i < len(post_urls) - 1:
            time.sleep(1)
    
    print(f'\n✓ Total comments from all posts: {len(all_comments)}')
    return all_comments


if __name__ == '__main__':
    # Test with a sample post
    test_url = 'https://www.instagram.com/p/DGHx8Sly9hw/'
    
    print('\n' + '='*60)
    print('🧪 TESTING RAPIDAPI COMMENT SCRAPER')
    print('='*60 + '\n')
    
    comments = scrape_comments_rapidapi(test_url, max_comments=10)
    
    print('\n' + '='*60)
    print('SAMPLE COMMENTS:')
    print('='*60)
    
    for i, comment in enumerate(comments[:5], 1):
        print(f'\n{i}. @{comment["username"]}')
        print(f'   "{comment["text"][:80]}..."' if len(comment['text']) > 80 else f'   "{comment["text"]}"')
