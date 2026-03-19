import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests
import time
import json
from datetime import datetime
from audience_analytics import AudienceAnalytics

# Load environment variables
load_dotenv()

# DISABLED: File storage to save disk space
# Since we're using this as an API, we don't need to persist data
DATA_DIR = 'scraped_data'
ENABLE_FILE_STORAGE = os.getenv('ENABLE_FILE_STORAGE', 'false').lower() == 'true'

# Only create directory if file storage is enabled
if ENABLE_FILE_STORAGE and not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False  # Allow UTF-8 in JSON responses
CORS(app)

# BrightData Configuration
BRIGHTDATA_API_KEY = os.getenv('BRIGHTDATA_API_KEY')
BRIGHTDATA_DATASET_ID = os.getenv('BRIGHTDATA_DATASET_ID', 'gd_l1vikfch901nx3by4')
BRIGHTDATA_BASE_URL = 'https://api.brightdata.com/datasets/v3'

# Initialize analytics engine
analytics_engine = AudienceAnalytics()

def get_snapshot_data(snapshot_id, max_retries=10, retry_delay=5):
    """
    Fetch snapshot data from BrightData API with retry logic
    
    Args:
        snapshot_id: The snapshot ID to fetch
        max_retries: Maximum number of retry attempts
        retry_delay: Delay between retries in seconds
    
    Returns:
        List of scraped data
    """
    if not snapshot_id:
        raise ValueError('Snapshot ID is required')
    
    # Initial delay before first attempt
    time.sleep(2)
    
    retries = 0
    
    while retries < max_retries:
        try:
            url = f'{BRIGHTDATA_BASE_URL}/snapshot/{snapshot_id}?format=json'
            headers = {
                'Authorization': f'Bearer {BRIGHTDATA_API_KEY}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            
            # Debug: Print the type and structure
            print(f'Response type: {type(data)}')
            if isinstance(data, dict):
                print(f'Response keys: {data.keys()}')
            
            # If data is already available as array
            if isinstance(data, list):
                print('Snapshot data received directly')
                return data
            
            # Check snapshot status
            status = data.get('status', 'unknown')
            print(f'Snapshot status: {status}')
            
            if status == 'running':
                if retries >= max_retries - 1:
                    raise Exception('Maximum retries reached while waiting for snapshot')
                
                print(f'Retry {retries + 1}/{max_retries}: Snapshot not ready, retrying in {retry_delay}s...')
                time.sleep(retry_delay)
                retries += 1
                
            elif status in ['success', 'complete', 'ready']:
                print('Snapshot is ready, data received')
                # If status is success but data is dict, it might have a 'data' key
                if isinstance(data, dict):
                    # Try to get data from common response keys
                    if 'data' in data:
                        return data['data']
                    elif 'results' in data:
                        return data['results']
                    else:
                        # If no nested data, return empty list
                        print('Warning: Snapshot marked as complete but no data found')
                        return []
                return data if isinstance(data, list) else []
                
            else:
                raise Exception(f'Unexpected snapshot status: {status}')
                
        except requests.exceptions.RequestException as e:
            print(f'Error fetching snapshot {snapshot_id}: {str(e)}')
            
            if retries >= max_retries - 1:
                raise Exception(f'Failed to fetch snapshot after {max_retries} attempts: {str(e)}')
            
            print(f'Retry {retries + 1}/{max_retries}: Error occurred, retrying in {retry_delay}s...')
            time.sleep(retry_delay)
            retries += 1
    
    raise Exception(f'Failed to fetch snapshot after {max_retries} attempts')


def save_to_json(username, data):
    """
    Save scraped data to a JSON file (DISABLED by default to save storage)
    
    Args:
        username: Instagram username
        data: Profile data to save
    
    Returns:
        filepath if saved, None if storage is disabled
    """
    # Skip file storage if disabled (default)
    if not ENABLE_FILE_STORAGE:
        print(f'⚠️  File storage disabled for {username} - data returned via API only')
        return None
    
    try:
        # Create filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'{username}_{timestamp}.json'
        filepath = os.path.join(DATA_DIR, filename)
        
        # Add metadata
        data_with_meta = {
            'scraped_at': datetime.now().isoformat(),
            'username': username,
            'data': data
        }
        
        # Save to file
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data_with_meta, f, indent=2, ensure_ascii=False)
        
        print(f'Data saved to: {filepath}')
        return filepath
    except Exception as e:
        print(f'Error saving to JSON: {str(e)}')
        return None


@app.route('/')
def home():
    return jsonify({
        'success': True,
        'message': 'Instagram Audience Analytics API - Like Modash/HypeAuditor',
        'endpoints': {
            '/scrape': 'POST - Scrape Instagram user profile (basic)',
            '/analyze': 'POST - Full audience analytics (gender, age, country, city, bots)',
            '/scrape/multiple': 'POST - Scrape multiple Instagram profiles',
            '/saved-data': 'GET - List all saved analyses',
            '/health': 'GET - Check API health'
        }
    })


@app.route('/health')
def health():
    """Health check endpoint"""
    # Count saved files only if storage is enabled
    saved_files_count = 0
    if ENABLE_FILE_STORAGE and os.path.exists(DATA_DIR):
        saved_files_count = len([f for f in os.listdir(DATA_DIR) if f.endswith('.json')])
    
    return jsonify({
        'success': True,
        'status': 'healthy',
        'brightdata_configured': bool(BRIGHTDATA_API_KEY),
        'file_storage_enabled': ENABLE_FILE_STORAGE,
        'data_directory': DATA_DIR if ENABLE_FILE_STORAGE else None,
        'saved_profiles': saved_files_count
    })


@app.route('/saved-data')
def list_saved_data():
    """List all saved JSON files"""
    try:
        files = []
        if os.path.exists(DATA_DIR):
            for filename in os.listdir(DATA_DIR):
                if filename.endswith('.json'):
                    filepath = os.path.join(DATA_DIR, filename)
                    file_stats = os.stat(filepath)
                    files.append({
                        'filename': filename,
                        'size': file_stats.st_size,
                        'created': datetime.fromtimestamp(file_stats.st_ctime).isoformat()
                    })
        
        return jsonify({
            'success': True,
            'total_files': len(files),
            'files': sorted(files, key=lambda x: x['created'], reverse=True)
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/saved-data/<username>')
def get_saved_data(username):
    """Get saved data for a specific username"""
    try:
        if not os.path.exists(DATA_DIR):
            return jsonify({
                'success': False,
                'message': 'No saved data found'
            }), 404
        
        # Find files matching the username
        matching_files = [f for f in os.listdir(DATA_DIR) if f.startswith(f'{username}_') and f.endswith('.json')]
        
        if not matching_files:
            return jsonify({
                'success': False,
                'message': f'No saved data found for username: {username}'
            }), 404
        
        # Get the most recent file
        latest_file = sorted(matching_files)[-1]
        filepath = os.path.join(DATA_DIR, latest_file)
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return jsonify({
            'success': True,
            'filename': latest_file,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/scrape', methods=['POST'])
def scrape_instagram_user():
    """
    Scrape a single Instagram user profile
    
    Request body:
    {
        "username": "instagram_username"
    }
    """
    try:
        data = request.get_json()
        username = data.get('username')
        
        if not username:
            return jsonify({
                'success': False,
                'message': 'Username is required'
            }), 400
        
        if not BRIGHTDATA_API_KEY:
            return jsonify({
                'success': False,
                'message': 'BrightData API key not configured'
            }), 500
        
        # Trigger BrightData scraping
        trigger_url = f'{BRIGHTDATA_BASE_URL}/trigger?dataset_id={BRIGHTDATA_DATASET_ID}&include_errors=true'
        headers = {
            'Authorization': f'Bearer {BRIGHTDATA_API_KEY}',
            'Content-Type': 'application/json'
        }
        # BrightData expects an array of objects with 'url' key
        payload = [{
            'url': f'https://www.instagram.com/{username}/'
        }]
        
        print(f'Triggering scrape for username: {username}')
        print(f'Payload: {payload}')
        
        response = requests.post(
            trigger_url,
            json=payload,
            headers=headers,
            timeout=10
        )
        
        # Check for errors before raising
        if response.status_code != 200:
            error_detail = response.text
            print(f'BrightData API Error: {error_detail}')
            return jsonify({
                'success': False,
                'message': f'BrightData API error: {response.status_code}',
                'detail': error_detail
            }), 500
        
        result = response.json()
        snapshot_id = result.get('snapshot_id')
        
        if not snapshot_id:
            return jsonify({
                'success': False,
                'message': 'Failed to get snapshot ID from BrightData'
            }), 500
        
        print(f'Snapshot ID: {snapshot_id}')
        
        # Wait for and fetch the snapshot data
        snapshot_data = get_snapshot_data(snapshot_id, max_retries=10, retry_delay=5)
        
        if not snapshot_data or len(snapshot_data) == 0:
            return jsonify({
                'success': False,
                'message': 'No data found for this user'
            }), 404
        
        # Extract the first profile data
        profile_data = snapshot_data[0]
        
        # Calculate engagement metrics
        posts = profile_data.get('posts', [])
        total_likes = sum(post.get('likes', 0) for post in posts)
        total_comments = sum(post.get('comments', 0) for post in posts)
        total_views = sum(post.get('views', 0) for post in posts)
        
        avg_likes = total_likes / len(posts) if posts else 0
        avg_comments = total_comments / len(posts) if posts else 0
        avg_views = total_views / len(posts) if posts else 0
        
        # Format response with comprehensive data
        formatted_data = {
            'username': profile_data.get('username'),
            'profile_name': profile_data.get('profile_name'),
            'biography': profile_data.get('biography'),
            'profile_image': profile_data.get('profile_image_link'),
            'is_verified': profile_data.get('is_verified'),
            'is_private': profile_data.get('is_private'),
            'is_business': profile_data.get('is_business'),
            'followers': profile_data.get('followers'),
            'following': profile_data.get('following'),
            'posts_count': profile_data.get('posts_count'),
            'category': profile_data.get('category'),
            'website': profile_data.get('website'),
            'email': profile_data.get('email'),
            'phone': profile_data.get('phone'),
            'engagement': {
                'avg_likes': round(avg_likes, 2),
                'avg_comments': round(avg_comments, 2),
                'avg_views': round(avg_views, 2),
                'avg_engagement': profile_data.get('avg_engagement', 0),
                'engagement_rate': profile_data.get('engagement_rate', 0)
            },
            'posts': posts[:20],  # Return up to 20 posts
            'total_posts_scraped': len(posts),
            'audience_data': {
                'age_distribution': profile_data.get('age_distribution', []),
                'gender_distribution': profile_data.get('gender_distribution', []),
                'top_countries': profile_data.get('top_countries', []),
                'top_cities': profile_data.get('top_cities', [])
            },
            'raw_data': profile_data  # Include full raw data
        }
        
        # Save to JSON file
        saved_file = save_to_json(username, formatted_data)
        
        response_data = {
            'success': True,
            'data': formatted_data,
            'saved_to_file': saved_file
        }
        
        return jsonify(response_data), 200
        
    except requests.exceptions.RequestException as e:
        print(f'Request error: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'Request error: {str(e)}'
        }), 500
        
    except Exception as e:
        print(f'Error in scrape endpoint: {str(e)}')
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/scrape/multiple', methods=['POST'])
def scrape_multiple_users():
    """
    Scrape multiple Instagram user profiles
    
    Request body:
    {
        "usernames": ["username1", "username2", "username3"]
    }
    """
    try:
        data = request.get_json()
        usernames = data.get('usernames', [])
        
        if not usernames or not isinstance(usernames, list):
            return jsonify({
                'success': False,
                'message': 'usernames array is required'
            }), 400
        
        if not BRIGHTDATA_API_KEY:
            return jsonify({
                'success': False,
                'message': 'BrightData API key not configured'
            }), 500
        
        # Prepare URLs for multiple profiles
        urls = [{'url': f'https://www.instagram.com/{username}/'} for username in usernames]
        
        # Trigger BrightData scraping for multiple URLs
        trigger_url = f'{BRIGHTDATA_BASE_URL}/trigger?dataset_id={BRIGHTDATA_DATASET_ID}&include_errors=true'
        headers = {
            'Authorization': f'Bearer {BRIGHTDATA_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        print(f'Triggering scrape for {len(usernames)} usernames')
        print(f'Payload: {urls}')
        
        response = requests.post(
            trigger_url,
            json=urls,
            headers=headers,
            timeout=10
        )
        
        # Check for errors before raising
        if response.status_code != 200:
            error_detail = response.text
            print(f'BrightData API Error: {error_detail}')
            return jsonify({
                'success': False,
                'message': f'BrightData API error: {response.status_code}',
                'detail': error_detail
            }), 500
        
        result = response.json()
        snapshot_id = result.get('snapshot_id')
        
        if not snapshot_id:
            return jsonify({
                'success': False,
                'message': 'Failed to get snapshot ID from BrightData'
            }), 500
        
        print(f'Snapshot ID: {snapshot_id}')
        
        # Wait for and fetch the snapshot data
        snapshot_data = get_snapshot_data(snapshot_id, max_retries=15, retry_delay=6)
        
        if not snapshot_data:
            return jsonify({
                'success': False,
                'message': 'No data found'
            }), 404
        
        # Process all profiles
        processed_profiles = []
        saved_files = []
        
        for profile in snapshot_data:
            posts = profile.get('posts', [])
            total_likes = sum(post.get('likes', 0) for post in posts)
            total_comments = sum(post.get('comments', 0) for post in posts)
            
            avg_likes = total_likes / len(posts) if posts else 0
            avg_comments = total_comments / len(posts) if posts else 0
            
            profile_summary = {
                'username': profile.get('username'),
                'profile_name': profile.get('profile_name'),
                'profile_image': profile.get('profile_image_link'),
                'followers': profile.get('followers'),
                'following': profile.get('following'),
                'posts_count': profile.get('posts_count'),
                'is_verified': profile.get('is_verified'),
                'avg_likes': round(avg_likes, 2),
                'avg_comments': round(avg_comments, 2),
                'avg_engagement': profile.get('avg_engagement', 0),
                'raw_data': profile  # Include full raw data
            }
            
            processed_profiles.append(profile_summary)
            
            # Save each profile to individual JSON file
            username = profile.get('username', 'unknown')
            saved_file = save_to_json(username, profile_summary)
            if saved_file:
                saved_files.append(saved_file)
        
        return jsonify({
            'success': True,
            'total_profiles': len(processed_profiles),
            'data': processed_profiles,
            'saved_files': saved_files
        }), 200
        
    except Exception as e:
        print(f'Error in scrape multiple endpoint: {str(e)}')
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/refresh_profile_pic', methods=['POST'])
def refresh_profile_pic():
    """
    Refresh profile picture URL for a username
    This is useful because Instagram CDN URLs expire after 24-48 hours
    
    Request body:
    {
        "username": "instagram_username"
    }
    
    Returns:
    {
        "success": true,
        "username": "username",
        "profile_pic_url": "https://...",
        "profile_name": "Display Name"
    }
    """
    try:
        data = request.get_json()
        username = data.get('username')
        
        if not username:
            return jsonify({
                'success': False,
                'error': 'Username is required'
            }), 400
        
        print(f'🔄 Refreshing profile pic for @{username}')
        
        # Use the analytics engine to scrape just the profile
        profile = analytics_engine.scrape_profile_and_posts(username)
        
        if not profile:
            return jsonify({
                'success': False,
                'error': 'Failed to fetch profile'
            }), 404
        
        # Extract profile pic URL
        profile_pic_url = (
            profile.get('profile_pic_url') or 
            profile.get('profile_image') or 
            profile.get('profile_image_link') or 
            profile.get('profile_picture') or
            ''
        )
        
        profile_name = profile.get('full_name') or profile.get('name') or username
        
        if not profile_pic_url:
            return jsonify({
                'success': False,
                'error': 'No profile picture URL found'
            }), 404
        
        print(f'✅ Got fresh profile pic URL for @{username}')
        
        return jsonify({
            'success': True,
            'username': username,
            'profile_pic_url': profile_pic_url,
            'profile_name': profile_name
        }), 200
        
    except Exception as e:
        error_message = str(e)
        print(f'❌ Error refreshing profile pic: {error_message}')
        
        return jsonify({
            'success': False,
            'error': error_message
        }), 500


@app.route('/analyze', methods=['POST'])
def analyze_audience():
    """
    FULL AUDIENCE ANALYTICS - Like Modash/HypeAuditor
    
    Request body:
    {
        "username": "instagram_username",
        "max_posts": 6  (optional, default 6)
    }
    
    Returns:
    - Gender distribution (male/female/unknown %)
    - Age distribution (13-17, 18-24, 25-34, 35-44, 45+)
    - Country distribution (top countries %)
    - City distribution (top cities %)
    - Language distribution
    - Audience quality score (0-100)
    - Fake follower percentage
    """
    try:
        data = request.get_json()
        username = data.get('username')
        max_posts = data.get('max_posts', 6)
        
        if not username:
            return jsonify({
                'success': False,
                'error': 'Username is required',
                'message': 'Username is required'
            }), 400
        
        print(f'\n{"="*60}')
        print(f'FULL ANALYSIS REQUEST: @{username}')
        print(f'{"="*60}\n')
        
        # Run complete analysis
        result = analytics_engine.analyze_audience(username, max_posts=max_posts)
        
        # Save to JSON
        saved_file = save_to_json(f'{username}_analysis', result)
        
        return jsonify({
            'success': True,
            'data': result,
            'saved_to_file': saved_file
        }), 200
        
    except Exception as e:
        error_message = str(e)
        print(f'Error in analyze endpoint: {error_message}')
        import traceback
        traceback.print_exc()
        
        # Return more specific error messages
        if 'appears to not exist or is private' in error_message:
            return jsonify({
                'success': False,
                'error': error_message,
                'message': f'Account @{username} does not exist or is private'
            }), 404
        else:
            return jsonify({
                'success': False,
                'error': error_message,
                'message': f'Failed to analyze @{username}: {error_message}'
            }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f'Starting Flask Instagram Scraper on port {port}')
    print(f'BrightData API configured: {bool(BRIGHTDATA_API_KEY)}')
    
    app.run(host='0.0.0.0', port=port, debug=debug)
