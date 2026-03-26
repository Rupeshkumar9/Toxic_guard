"""
Sentiment Analysis Engine using VADER.

Analyzes comment text for sentiment polarity and toxicity markers.
"""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Singleton analyzer
_analyzer = SentimentIntensityAnalyzer()

# Toxicity keywords that boost negative scores
TOXIC_KEYWORDS = {
    'high': [
        'hate', 'kill', 'die', 'threat', 'destroy', 'attack', 'violent',
        'scum', 'trash', 'worthless', 'pathetic', 'disgusting', 'loser',
        'shut up', 'get lost', 'go to hell', 'burn', 'rot',
    ],
    'medium': [
        'stupid', 'idiot', 'dumb', 'moron', 'fool', 'ignorant', 'lame',
        'useless', 'annoying', 'ridiculous', 'terrible', 'worst', 'garbage',
        'suck', 'horrible', 'awful', 'toxic', 'cringe',
    ],
    'low': [
        'wrong', 'disagree', 'bad', 'poor', 'weak', 'boring', 'overrated',
        'meh', 'whatever', 'pointless', 'unnecessary',
    ],
}


def analyze_sentiment(text):
    """
    Analyze a single comment for sentiment and toxicity.

    Returns:
        dict with:
            - compound: float [-1, 1] overall sentiment
            - positive: float [0, 1]
            - negative: float [0, 1]
            - neutral: float [0, 1]
            - toxicity_score: float [0, 1] custom toxicity metric
            - toxicity_level: str ('safe', 'mild', 'moderate', 'severe')
    """
    scores = _analyzer.polarity_scores(text)
    text_lower = text.lower()

    # Calculate toxicity boost from keyword matching
    toxicity_boost = 0.0
    for word in TOXIC_KEYWORDS['high']:
        if word in text_lower:
            toxicity_boost = max(toxicity_boost, 0.6)
    for word in TOXIC_KEYWORDS['medium']:
        if word in text_lower:
            toxicity_boost = max(toxicity_boost, 0.35)
    for word in TOXIC_KEYWORDS['low']:
        if word in text_lower:
            toxicity_boost = max(toxicity_boost, 0.15)

    # Combine VADER negative score with keyword boost
    base_toxicity = scores['neg']
    toxicity_score = min(1.0, base_toxicity * 0.6 + toxicity_boost * 0.7 + (1 - scores['compound']) * 0.15)

    # Determine toxicity level
    if toxicity_score >= 0.65:
        toxicity_level = 'severe'
    elif toxicity_score >= 0.4:
        toxicity_level = 'moderate'
    elif toxicity_score >= 0.2:
        toxicity_level = 'mild'
    else:
        toxicity_level = 'safe'

    return {
        'compound': round(scores['compound'], 4),
        'positive': round(scores['pos'], 4),
        'negative': round(scores['neg'], 4),
        'neutral': round(scores['neu'], 4),
        'toxicity_score': round(toxicity_score, 4),
        'toxicity_level': toxicity_level,
    }


def analyze_batch(comments):
    """Analyze a list of comment strings. Returns list of analysis dicts."""
    return [analyze_sentiment(c) for c in comments]
