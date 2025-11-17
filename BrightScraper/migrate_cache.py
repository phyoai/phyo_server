"""
Clear old BrightData comment caches and test RapidAPI integration
"""
from cache_manager import clear_old_comment_caches
from rapidapi_comments import scrape_comments_rapidapi

print('\n' + '='*60)
print('CACHE MIGRATION: BrightData → RapidAPI')
print('='*60 + '\n')

# Clear old comment caches
print('Step 1: Clearing old BrightData comment caches...')
cleared = clear_old_comment_caches()

print(f'\n✓ Migration complete! Cleared {cleared} old cache files.')
print('\nNext time you run analysis, comments will be fetched from RapidAPI')
print('and cached in the new format.\n')

# Optional: Test with a sample post
test_post = input('Want to test RapidAPI? Enter a post URL (or press Enter to skip): ').strip()

if test_post:
    print('\n' + '='*60)
    print('TESTING RAPIDAPI INTEGRATION')
    print('='*60 + '\n')
    
    try:
        comments = scrape_comments_rapidapi(test_post, max_comments=10)
        
        print('\n' + '='*60)
        print(f'SUCCESS! Got {len(comments)} comments')
        print('='*60)
        
        if comments:
            print('\nSample comments:')
            for i, comment in enumerate(comments[:3], 1):
                print(f'\n{i}. @{comment["username"]}')
                text = comment["text"][:80] + '...' if len(comment["text"]) > 80 else comment["text"]
                print(f'   "{text}"')
        
        print('\n✓ RapidAPI integration working correctly!\n')
    except Exception as e:
        print(f'\n✗ Error: {str(e)}\n')
        print('Please check your RAPIDAPI_KEY in .env file\n')
else:
    print('Skipped test. Run this again anytime to test RapidAPI.\n')
