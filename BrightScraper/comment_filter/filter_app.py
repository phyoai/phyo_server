"""
Flask API for Comment Filtering System
Scrapes Instagram comments and filters out spam/abuse
"""
from flask import Flask, request, jsonify, render_template_string
import sys
import os

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from audience_analytics import AudienceAnalytics
from spam_detector import SpamCommentDetector, save_filtered_results
from rapidapi_scraper import scrape_multiple_posts_rapidapi

app = Flask(__name__)
detector = SpamCommentDetector()
analytics = AudienceAnalytics(use_ai=False)  # Don't need AI for filtering

# Simple HTML interface
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Instagram Comment Filter</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 32px;
            text-align: center;
        }
        .subtitle {
            color: #666;
            text-align: center;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 25px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
            font-size: 14px;
        }
        input[type="text"], input[type="number"] {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        .input-helper {
            font-size: 12px;
            color: #999;
            margin-top: 5px;
        }
        button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        #loading {
            display: none;
            text-align: center;
            margin-top: 20px;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        #results {
            margin-top: 30px;
            display: none;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 20px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: #667eea;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        .success-message {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 10px;
            margin-top: 20px;
            border: 1px solid #c3e6cb;
        }
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 10px;
            margin-top: 20px;
            border: 1px solid #f5c6cb;
        }
        .category-breakdown {
            margin-top: 20px;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
        }
        .category-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .category-item:last-child {
            border-bottom: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ Instagram Comment Filter</h1>
        <p class="subtitle">Filter spam, abuse, and misleading comments from Instagram posts<br>
        <strong>Now using RapidAPI for 72+ comments per post!</strong> 🚀</p>
        
        <form id="filterForm">
            <div class="form-group">
                <label for="username">Instagram Username</label>
                <input type="text" id="username" name="username" placeholder="Enter username (e.g., codebitabhi)" required>
                <div class="input-helper">Without @ symbol</div>
            </div>
            
            <div class="form-group">
                <label for="max_posts">Number of Posts to Analyze</label>
                <input type="number" id="max_posts" name="max_posts" value="6" min="1" max="20">
                <div class="input-helper">Maximum 20 posts</div>
            </div>
            
            <div class="form-group">
                <label for="max_comments">Max Comments per Post</label>
                <input type="number" id="max_comments" name="max_comments" value="100" min="10" max="500">
                <div class="input-helper">RapidAPI can get 72+ comments per post! (Default: 100)</div>
            </div>
            
            <button type="submit" id="submitBtn">🚀 Start Filtering</button>
        </form>
        
        <div id="loading">
            <div class="spinner"></div>
            <p>Scraping and filtering comments... This may take a few minutes.</p>
        </div>
        
        <div id="results"></div>
    </div>

    <script>
        document.getElementById('filterForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const max_posts = document.getElementById('max_posts').value;
            const max_comments = document.getElementById('max_comments').value;
            
            // Show loading
            document.getElementById('loading').style.display = 'block';
            document.getElementById('results').style.display = 'none';
            document.getElementById('submitBtn').disabled = true;
            
            try {
                const response = await fetch('/filter', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                        max_posts: parseInt(max_posts),
                        max_comments_per_post: parseInt(max_comments)
                    })
                });
                
                const data = await response.json();
                
                // Hide loading
                document.getElementById('loading').style.display = 'none';
                document.getElementById('submitBtn').disabled = false;
                
                if (data.success) {
                    displayResults(data);
                } else {
                    displayError(data.error || 'An error occurred');
                }
                
            } catch (error) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('submitBtn').disabled = false;
                displayError('Network error: ' + error.message);
            }
        });
        
        function displayResults(data) {
            const results = data.results.summary;
            const resultsDiv = document.getElementById('results');
            
            let html = `
                <div class="success-message">
                    ✅ Filtering complete! Results saved to: <br>
                    <strong>${data.output_file}</strong>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${results.total_comments}</div>
                        <div class="stat-label">Total Comments</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${results.clean_comments}</div>
                        <div class="stat-label">Clean Comments</div>
                    </div>
                    <div class="stat-card" style="background: #ffe0e0;">
                        <div class="stat-value" style="color: #dc3545;">${results.spam_comments}</div>
                        <div class="stat-label">Spam Filtered</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${results.spam_percentage}%</div>
                        <div class="stat-label">Spam Rate</div>
                    </div>
                </div>
                
                <div class="category-breakdown">
                    <h3 style="margin-bottom: 15px; color: #333;">Spam Breakdown by Category</h3>
            `;
            
            const categories = results.spam_categories;
            for (const [key, value] of Object.entries(categories)) {
                if (value > 0) {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    html += `
                        <div class="category-item">
                            <span>${label}</span>
                            <strong>${value}</strong>
                        </div>
                    `;
                }
            }
            
            html += '</div>';
            
            resultsDiv.innerHTML = html;
            resultsDiv.style.display = 'block';
        }
        
        function displayError(message) {
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = `
                <div class="error-message">
                    ❌ Error: ${message}
                </div>
            `;
            resultsDiv.style.display = 'block';
        }
    </script>
</body>
</html>
"""


@app.route('/')
def index():
    """Render the main page"""
    return render_template_string(HTML_TEMPLATE)


@app.route('/filter', methods=['POST'])
def filter_comments():
    """
    API endpoint to scrape and filter comments
    
    Request JSON:
    {
        "username": "instagram_username",
        "max_posts": 6,
        "max_comments_per_post": 50
    }
    
    Response JSON:
    {
        "success": true,
        "results": {
            "summary": {...},
            "clean_comments": [...],
            "spam_comments": [...]
        },
        "output_file": "path/to/file.json"
    }
    """
    try:
        data = request.get_json()
        
        username = data.get('username')
        max_posts = data.get('max_posts', 6)
        max_comments_per_post = data.get('max_comments_per_post', 50)
        
        if not username:
            return jsonify({
                'success': False,
                'error': 'Username is required'
            }), 400
        
        print(f'\n{"="*60}')
        print(f'Starting comment filtering for @{username}')
        print(f'{"="*60}\n')
        
        # Step 1: Get profile and posts
        print('Step 1: Getting profile and posts...')
        try:
            profile = analytics.scrape_profile_and_posts(username)
            posts = profile.get('posts', [])
            print(f'✓ Profile found: {profile.get("full_name", username)}')
            print(f'✓ Posts found: {len(posts)}\n')
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Failed to fetch profile: {str(e)}'
            }), 500
        
        # Step 2: Scrape comments using RapidAPI (more comments!)
        print(f'Step 2: Scraping comments from top {max_posts} posts using RapidAPI...')
        try:
            # Get post URLs
            post_urls = [post.get('url') for post in posts[:max_posts] if post.get('url')]
            print(f'✓ Found {len(post_urls)} post URLs\n')
            
            # Scrape using RapidAPI (gets way more comments!)
            comments = scrape_multiple_posts_rapidapi(
                post_urls,
                max_comments_per_post=max_comments_per_post if max_comments_per_post else None,
                sort_by='recent'
            )
            
            print(f'\n✓ Collected {len(comments)} comments total\n')
            
            if len(comments) == 0:
                return jsonify({
                    'success': False,
                    'error': 'No comments found for this user. Posts may have comments disabled.'
                }), 404
                
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Failed to scrape comments: {str(e)}'
            }), 500
        
        if not comments:
            return jsonify({
                'success': False,
                'error': 'No comments found for this user.'
            }), 404
        
        print(f'\n✓ Scraped {len(comments)} comments')
        
        # Step 3: Filter comments
        print('Step 3: Filtering comments for spam/abuse...')
        filtered_results = detector.filter_comments(comments)
        
        # Step 4: Save results
        print('\nStep 4: Saving filtered results...')
        output_dir = os.path.join(os.path.dirname(__file__), 'output')
        output_file = save_filtered_results(filtered_results, username, output_dir)
        
        # Print summary
        summary = filtered_results['summary']
        print(f'\n{"="*60}')
        print('FILTERING COMPLETE!')
        print(f'{"="*60}')
        print(f'Total Comments: {summary["total_comments"]}')
        print(f'Clean Comments: {summary["clean_comments"]}')
        print(f'Spam Filtered: {summary["spam_comments"]}')
        print(f'Spam Rate: {summary["spam_percentage"]}%')
        print(f'\nSpam Breakdown:')
        for category, count in summary['spam_categories'].items():
            if count > 0:
                print(f'  - {category.replace("_", " ").title()}: {count}')
        print(f'{"="*60}\n')
        
        return jsonify({
            'success': True,
            'results': filtered_results,
            'output_file': output_file,
            'metadata': {
                'username': username,
                'posts_analyzed': len(posts),
                'profile_name': profile.get('full_name', username),
                'followers': profile.get('followers', 0),
                'following': profile.get('following', 0)
            }
        })
        
    except Exception as e:
        print(f'\nError: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Instagram Comment Filter API'
    })


if __name__ == '__main__':
    print('\n' + '='*60)
    print('🛡️  INSTAGRAM COMMENT FILTER API')
    print('='*60)
    print('\n🚀 Starting Flask server...')
    print('\n📍 Open your browser and go to:')
    print('   http://localhost:5000')
    print('\n💡 API Endpoint:')
    print('   POST http://localhost:5000/filter')
    print('\n' + '='*60 + '\n')
    
    app.run(debug=True, host='0.0.0.0', port=5000)
