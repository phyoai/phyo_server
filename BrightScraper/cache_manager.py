"""
Caching system for API responses
DISABLED by default to save storage - can be enabled via environment variable

Version 2.0: Updated for RapidAPI comment format
"""
import json
import os
import hashlib
from datetime import datetime

CACHE_DIR = 'api_cache'
CACHE_VERSION = '2.0'  # Increment when format changes

# Disable caching by default to save storage
ENABLE_CACHING = os.getenv('ENABLE_API_CACHING', 'false').lower() == 'true'

def ensure_cache_dir():
    """Create cache directory if it doesn't exist and caching is enabled"""
    if not ENABLE_CACHING:
        return
    
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
        print(f'Created cache directory: {CACHE_DIR}')

def get_cache_key(data_type, identifier):
    """
    Generate cache key
    
    Args:
        data_type: 'profile', 'comments', etc.
        identifier: username or post_url
    """
    # Create a hash of the identifier
    key = f"{data_type}_{identifier}"
    return hashlib.md5(key.encode()).hexdigest()[:16]

def save_to_cache(data_type, identifier, data):
    """
    Save data to cache (DISABLED by default to save storage)
    
    Args:
        data_type: 'profile', 'comments'
        identifier: username or post_url
        data: The JSON data to save
    """
    if not ENABLE_CACHING:
        return None
    
    ensure_cache_dir()
    
    cache_key = get_cache_key(data_type, identifier)
    filename = f"{data_type}_{cache_key}.json"
    filepath = os.path.join(CACHE_DIR, filename)
    
    cache_data = {
        'cache_version': CACHE_VERSION,  # Add version
        'cached_at': datetime.now().isoformat(),
        'data_type': data_type,
        'identifier': identifier,
        'data': data
    }
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(cache_data, f, indent=2, ensure_ascii=False)
    
    print(f'💾 Cached: {data_type} for {identifier}')
    return filepath

def load_from_cache(data_type, identifier):
    """
    Load data from cache (DISABLED by default to save storage)
    
    Args:
        data_type: 'profile', 'comments'
        identifier: username or post_url
    
    Returns:
        Cached data or None if not found, version mismatch, or caching disabled
    """
    if not ENABLE_CACHING:
        return None
    
    ensure_cache_dir()
    
    cache_key = get_cache_key(data_type, identifier)
    filename = f"{data_type}_{cache_key}.json"
    filepath = os.path.join(CACHE_DIR, filename)
    
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            
            # Check cache version - if old version, ignore cache for comments
            cached_version = cache_data.get('cache_version', '1.0')
            
            if data_type == 'comments' and cached_version != CACHE_VERSION:
                print(f'⚠️  Old cache version ({cached_version}) for {data_type}, fetching fresh data...')
                # Delete old cache file
                os.remove(filepath)
                return None
            
            print(f'📂 Loaded from cache: {data_type} for {identifier}')
            return cache_data['data']
        except Exception as e:
            print(f'⚠️  Cache read error: {str(e)}')
            return None
    
    return None

def clear_cache():
    """Clear all cached data"""
    ensure_cache_dir()
    
    files = os.listdir(CACHE_DIR)
    for file in files:
        if file.endswith('.json'):
            os.remove(os.path.join(CACHE_DIR, file))
    
    print(f'🗑️ Cleared {len(files)} cached files')

def clear_old_comment_caches():
    """Clear old version comment caches (BrightData format)"""
    ensure_cache_dir()
    
    cleared_count = 0
    files = os.listdir(CACHE_DIR)
    
    for file in files:
        if file.startswith('comments_') and file.endswith('.json'):
            filepath = os.path.join(CACHE_DIR, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                
                # Check version
                cached_version = cache_data.get('cache_version', '1.0')
                
                if cached_version != CACHE_VERSION:
                    os.remove(filepath)
                    cleared_count += 1
                    print(f'🗑️ Removed old cache: {file}')
            except:
                # If error reading, delete it
                os.remove(filepath)
                cleared_count += 1
    
    print(f'✓ Cleared {cleared_count} old comment cache files')
    return cleared_count

def list_cache():
    """List all cached data"""
    ensure_cache_dir()
    
    files = os.listdir(CACHE_DIR)
    print(f'\n📦 Cached files ({len(files)}):')
    
    for file in files:
        if file.endswith('.json'):
            filepath = os.path.join(CACHE_DIR, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            
            print(f'  - {cache_data["data_type"]}: {cache_data["identifier"]} (cached at {cache_data["cached_at"]})')
