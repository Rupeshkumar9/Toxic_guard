"""
User Data Generator pulling from CSV files.

Reads social media CSV datasets and constructs user profiles
with their real comment histories.
"""

import csv
import hashlib
import random
import os
from datetime import datetime, timedelta
from django.conf import settings

# Cache generated users per platform
_cached_users = {}

def generate_users_from_csv(platform_name):
    """
    Generate complete set of users from a specific platform's CSV file.
    
    Args:
        platform_name: 'reddit' or 'youtube'
    """
    filepath = os.path.join(settings.BASE_DIR, 'uploaded_datasets', f'{platform_name}.csv')
    
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return []
        
    users_dict = {}
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row:
                continue
            
            # Flexible column extraction for custom uploaded CSVs
            name = row.get('user_name', row.get('username', row.get('author', '')))
            text = row.get('comment_text', row.get('text', row.get('comment', row.get('body', ''))))
            uid_str = row.get('user_id', row.get('id', ''))
            
            # If no text found, skip
            if not text:
                continue
                
            if not uid_str and not name:
                uid = hash(text) % 1000000  # Fallback: treat each comment as separate if no user info
                name = f"Anonymous_{uid}"
            elif not uid_str:
                uid = hash(name) % 1000000
            else:
                try:
                    uid = int(uid_str)
                except ValueError:
                    uid = hash(uid_str) % 1000000
                    
            if not name:
                name = f"User_{uid}"
            
            if uid not in users_dict:
                color_hash = hashlib.md5(name.encode()).hexdigest()[:6]
                users_dict[uid] = {
                    'id': uid,
                    'username': f"@{name.lower()}_{uid}",
                    'display_name': name,
                    'archetype': f"imported_{platform_name}_user",
                    'avatar_color': f"#{color_hash}",
                    'comments': [],
                    # Temporary storage for timestamps
                    '_texts': []
                }
            
            users_dict[uid]['_texts'].append(text)
            
    users = list(users_dict.values())
    
    # Generate random timestamps for the comments
    for user in users:
        num_comments = len(user['_texts'])
        
        # Start randomly between 30 to 180 days ago
        start_date = datetime.now() - timedelta(days=random.randint(30, 180))
        
        for j, text in enumerate(user['_texts']):
            ts = start_date + timedelta(
                hours=j * random.randint(4, 12),
                minutes=random.randint(0, 59)
            )
            user['comments'].append({
                'text': text,
                'timestamp': ts.isoformat(),
            })
            
        # Clean up temp key
        del user['_texts']
        # Ensure first join date matches first comment
        user['join_date'] = user['comments'][0]['timestamp'][:10] if user['comments'] else start_date.strftime('%Y-%m-%d')
        
    return users


def get_users(platform):
    """Get or generate cached user data for the specific platform."""
    global _cached_users
    
    if platform not in _cached_users or _cached_users[platform] is None:
        _cached_users[platform] = generate_users_from_csv(platform)
        
    return _cached_users[platform]


def reset_users():
    """Clear caches to force reload from CSVs."""
    global _cached_users
    _cached_users = {}
    return []
