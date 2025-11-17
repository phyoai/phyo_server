"""
Cache Manager CLI
Manage cached API responses
"""
from cache_manager import list_cache, clear_cache
import sys

if __name__ == '__main__':
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'list':
            list_cache()
        elif command == 'clear':
            confirm = input('Are you sure you want to clear all cache? (yes/no): ')
            if confirm.lower() == 'yes':
                clear_cache()
            else:
                print('Cancelled')
        else:
            print('Unknown command')
            print('Usage:')
            print('  python manage_cache.py list   - List all cached data')
            print('  python manage_cache.py clear  - Clear all cache')
    else:
        print('Cache Manager')
        print('\nUsage:')
        print('  python manage_cache.py list   - List all cached data')
        print('  python manage_cache.py clear  - Clear all cache')
        print('\nCurrent cache:')
        list_cache()
