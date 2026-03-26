"""
Analyzer app views — Dashboard page and REST API endpoints.
"""

import os
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings

from .generator import get_users, reset_users
from .sentiment import analyze_sentiment
from .drift import compute_drift, compute_toxicity_trend


def index(request):
    """Serve the main dashboard page."""
    return render(request, 'index.html')


def get_all_users(request):
    """
    GET /api/users/
    Returns list of all users with their risk levels (without full comment history).
    """
    platform = request.GET.get('platform', 'reddit')
    users = get_users(platform)
    result = []

    for user in users:
        # Analyze all comments
        sentiments = [analyze_sentiment(c['text']) for c in user['comments']]
        compound_scores = [s['compound'] for s in sentiments]
        toxicity_scores = [s['toxicity_score'] for s in sentiments]

        # Compute drift
        drift_result = compute_drift(compound_scores)

        # Summary stats
        avg_toxicity = sum(toxicity_scores) / len(toxicity_scores) if toxicity_scores else 0
        recent_toxicity = sum(toxicity_scores[-10:]) / min(10, len(toxicity_scores)) if toxicity_scores else 0

        result.append({
            'id': user['id'],
            'username': user['username'],
            'display_name': user['display_name'],
            'archetype': user['archetype'],
            'join_date': user['join_date'],
            'avatar_color': user['avatar_color'],
            'comment_count': len(user['comments']),
            'risk_level': drift_result['risk_level'],
            'trend': drift_result['trend'],
            'escalation_probability': drift_result['escalation_probability'],
            'avg_toxicity': round(avg_toxicity, 4),
            'recent_toxicity': round(recent_toxicity, 4),
            'current_drift': drift_result['current_drift'],
        })

    # Sort by escalation probability descending
    result.sort(key=lambda u: u['escalation_probability'], reverse=True)

    return JsonResponse({'users': result})


def get_user_timeline(request, user_id):
    """
    GET /api/users/<id>/timeline/
    Returns full sentiment timeline for a specific user.
    """
    platform = request.GET.get('platform', 'reddit')
    users = get_users(platform)
    user = None
    for u in users:
        if u['id'] == user_id:
            user = u
            break

    if not user:
        return JsonResponse({'error': 'User not found'}, status=404)

    # Analyze every comment
    timeline = []
    compound_scores = []
    toxicity_scores = []

    for comment in user['comments']:
        analysis = analyze_sentiment(comment['text'])
        compound_scores.append(analysis['compound'])
        toxicity_scores.append(analysis['toxicity_score'])

        timeline.append({
            'text': comment['text'],
            'timestamp': comment['timestamp'],
            **analysis,
        })

    # Compute drift and trends
    drift_result = compute_drift(compound_scores)
    toxicity_trend = compute_toxicity_trend(toxicity_scores)

    return JsonResponse({
        'user': {
            'id': user['id'],
            'username': user['username'],
            'display_name': user['display_name'],
            'archetype': user['archetype'],
            'join_date': user['join_date'],
            'avatar_color': user['avatar_color'],
        },
        'timeline': timeline,
        'drift': drift_result,
        'toxicity_trend': toxicity_trend,
    })


def platform_stats(request):
    """
    GET /api/platform-stats/
    Returns platform-wide aggregated statistics.
    """
    platform = request.GET.get('platform', 'reddit')
    users = get_users(platform)

    total_users = len(users)
    risk_counts = {'normal': 0, 'drifting': 0, 'warning': 0, 'escalating': 0}
    total_toxicity = 0
    total_comments = 0
    alerts = []

    for user in users:
        sentiments = [analyze_sentiment(c['text']) for c in user['comments']]
        compound_scores = [s['compound'] for s in sentiments]
        toxicity_scores = [s['toxicity_score'] for s in sentiments]

        drift_result = compute_drift(compound_scores)
        risk_level = drift_result['risk_level']
        risk_counts[risk_level] = risk_counts.get(risk_level, 0) + 1

        total_toxicity += sum(toxicity_scores)
        total_comments += len(toxicity_scores)

        # Generate alerts for concerning users
        if risk_level in ('warning', 'escalating'):
            recent_toxicity = sum(toxicity_scores[-10:]) / min(10, len(toxicity_scores))
            alerts.append({
                'user_id': user['id'],
                'username': user['username'],
                'display_name': user['display_name'],
                'risk_level': risk_level,
                'escalation_probability': drift_result['escalation_probability'],
                'recent_toxicity': round(recent_toxicity, 4),
                'trend': drift_result['trend'],
                'avatar_color': user['avatar_color'],
            })

    # Sort alerts by escalation probability
    alerts.sort(key=lambda a: a['escalation_probability'], reverse=True)

    avg_toxicity = total_toxicity / total_comments if total_comments > 0 else 0

    return JsonResponse({
        'total_users': total_users,
        'risk_distribution': risk_counts,
        'avg_platform_toxicity': round(avg_toxicity, 4),
        'total_comments_analyzed': total_comments,
        'alerts': alerts,
    })


@csrf_exempt
@require_http_methods(["POST"])
def run_analysis(request):
    """
    POST /api/analyze/
    Re-runs analysis on all users. Returns summary.
    """
    platform = request.GET.get('platform', 'reddit')
    users = get_users(platform)
    results = {'flagged': 0, 'escalating': 0, 'total': len(users)}

    for user in users:
        sentiments = [analyze_sentiment(c['text']) for c in user['comments']]
        compound_scores = [s['compound'] for s in sentiments]
        drift_result = compute_drift(compound_scores)

        if drift_result['risk_level'] in ('warning', 'escalating'):
            results['flagged'] += 1
        if drift_result['risk_level'] == 'escalating':
            results['escalating'] += 1

    return JsonResponse(results)


@csrf_exempt
@require_http_methods(["POST"])
def upload_csv(request):
    """
    POST /api/upload-csv/
    Saves an uploaded CSV file and clears the cache to process it.
    """
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'No file uploaded'}, status=400)
        
    import re
    uploaded_file = request.FILES['file']
    
    # Strip extension and sanitize for safe filesystem use
    orig_name = uploaded_file.name
    safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', orig_name.replace('.csv', ''))
    
    filepath = os.path.join(settings.BASE_DIR, 'uploaded_datasets', f'{safe_name}.csv')
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # Save the file
    with open(filepath, 'wb+') as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)
            
    # Reset the cache for the uploaded platform
    import analyzer.generator as gen
    gen._cached_users[safe_name] = None
    
    return JsonResponse({
        'status': 'success', 
        'message': 'File uploaded and ready for analysis',
        'platform_id': safe_name,
        'display_name': orig_name
    })

def list_datasets(request):
    """
    GET /api/datasets/
    Lists all available csv files in the uploaded_datasets directory.
    """
    directory = os.path.join(settings.BASE_DIR, 'uploaded_datasets')
    os.makedirs(directory, exist_ok=True)
    
    datasets = []
    # Read files from directory
    if os.path.exists(directory):
        files = [f for f in os.listdir(directory) if f.endswith('.csv')]
        # Sort by creation time so newest sets are first (after reddit)
        files.sort(key=lambda x: os.path.getmtime(os.path.join(directory, x)), reverse=True)
        
        for filename in files:
            platform_id = filename[:-4]  # Remove .csv
            # Prettify the name (e.g. some_data -> Some Data)
            display_name = platform_id.replace('_', ' ').title()
            # If it's reddit or youtube keep it simple
            if platform_id.lower() in ('reddit', 'youtube'):
                display_name = platform_id.title()
                
            datasets.append({
                'id': platform_id,
                'name': display_name
            })
            
    # Always ensure reddit is at the absolute top/bottom or logic, we sort by time above
    return JsonResponse({'datasets': datasets})


