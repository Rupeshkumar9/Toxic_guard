<!-- @format -->

# ToxiGuard: Behavioral Drift & Toxicity Escalation Detection

An intelligent system for detecting gradual behavioral shifts and predicting toxicity escalation in online communities. ToxiGuard analyzes user comment histories to identify early warning signs of harmful behavior escalation, enabling proactive moderation and intervention.

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Core Modules](#core-modules)
- [How It Works](#how-it-works)

---

## Overview

ToxiGuard is a Django-based web application that monitors user behavior patterns on social media platforms (Reddit, YouTube, etc.) to detect and predict toxic escalation. Using sentiment analysis and behavioral drift detection algorithms, it provides risk assessments and trend analysis for individual users.

---

## Problem Statement

Online platforms struggle to detect gradual behavioral shifts that lead to toxic interactions. Behavioral drift—when users' tone progressively becomes more negative or hostile—is difficult to identify with traditional moderation tools.

**Objective:** Design a predictive framework that enables early intervention through accurate sequential modeling of user behavior patterns, allowing platforms to:

- Identify users exhibiting increasing toxicity trends
- Quantify escalation risk with probabilistic models
- Enable targeted intervention before harmful behavior becomes severe

---

## Key Features

✅ **Sentiment Analysis** - VADER-based sentiment scoring with custom toxicity keyword detection  
✅ **Behavioral Drift Detection** - Sliding-window analysis to detect gradual negative sentiment shifts  
✅ **Escalation Prediction** - Probabilistic models to forecast toxic behavior intensification  
✅ **User Risk Classification** - Multi-tiered risk levels (Normal, Drifting, Warning, Escalating)  
✅ **Interactive Dashboard** - Visualize user analytics with charts and timeline views  
✅ **Multi-Platform Support** - Analyze data from Reddit, YouTube, and custom sources  
✅ **REST API** - Programmatic access to user analytics and predictions  
✅ **Dataset Management** - Upload and process CSV datasets with flexible column mapping

---

## Tech Stack

| Layer                  | Technology              |
| ---------------------- | ----------------------- |
| **Backend**            | Django 4.2+             |
| **Sentiment Analysis** | VADER Sentiment, NumPy  |
| **Server**             | Gunicorn                |
| **Frontend**           | HTML5, CSS3, JavaScript |
| **Database**           | SQLite3                 |
| **Deployment**         | App Engine (app.yaml)   |

**Dependencies:**

```
django>=4.2
numpy>=1.24
vaderSentiment>=3.3.2
gunicorn==21.2.0
```

---

## Project Structure

```
Toxic_guard/
├── manage.py                    # Django management command
├── db.sqlite3                   # SQLite database
├── requirements.txt             # Python dependencies
├── app.yaml                     # Google App Engine configuration
├── README.md                    # This file
│
├── toxiguard_project/           # Django project settings
│   ├── settings.py              # Configuration
│   ├── urls.py                  # Main URL routing
│   ├── asgi.py                  # ASGI config
│   └── wsgi.py                  # WSGI config
│
├── analyzer/                    # Main Django app
│   ├── models.py                # Data models
│   ├── views.py                 # View handlers & API endpoints
│   ├── urls.py                  # App URL routing
│   ├── sentiment.py             # Sentiment analysis engine
│   ├── drift.py                 # Behavioral drift detection
│   ├── generator.py             # CSV data loading & user generation
│   ├── admin.py                 # Django admin config
│   ├── apps.py                  # App configuration
│   └── migrations/              # Database migrations
│
├── templates/                   # HTML templates
│   └── index.html               # Main dashboard page
│
├── static/                      # Static assets
│   ├── css/
│   │   └── styles.css           # Dashboard styling
│   └── js/
│       ├── app.js               # Main JavaScript logic
│       ├── charts.js            # Chart visualization
│       └── timeline.js          # Timeline components
│
└── uploaded_datasets/           # User-uploaded CSV data
    ├── Reddit.csv               # Reddit user comments
    └── Youtube.csv              # YouTube user comments
```

---

## Installation & Setup

### Prerequisites

- Python 3.8+
- pip or conda
- Git

### Steps

1. **Clone/navigate to project directory:**

```bash
cd /Users/adityapandey/Desktop/Toxic_guard
```

2. **Create virtual environment:**

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**

```bash
pip install -r requirements.txt
```

4. **Run migrations:**

```bash
python manage.py migrate
```

5. **Start development server:**

```bash
python manage.py runserver
```

6. **Access the application:**
   Navigate to `http://localhost:8000` in your browser

---

## Usage

### Dashboard Access

1. Open the main dashboard at `http://localhost:8000/`
2. Select a platform (Reddit or YouTube) from the dropdown
3. View user risk assessments with:
   - **Risk Level**: Normal / Drifting / Warning / Escalating
   - **Escalation Probability**: 0-100% likelihood of toxic behavior escalation
   - **Sentiment Trends**: Visual representation of user behavior over time
   - **Recent Toxicity**: Average toxicity score of last 10 comments

### API Usage

All endpoints return JSON responses and support platform filtering:

```javascript
// Fetch all users (platform: 'reddit' or 'youtube')
fetch("/api/users/?platform=reddit")
	.then((r) => r.json())
	.then((data) => console.log(data));
```

---

## API Endpoints

### Core Endpoints

| Method | Endpoint                         | Description                                      |
| ------ | -------------------------------- | ------------------------------------------------ |
| `GET`  | `/`                              | Main dashboard                                   |
| `GET`  | `/api/users/`                    | List all users with risk metrics                 |
| `GET`  | `/api/users/<user_id>/`          | Get detailed user profile & full comment history |
| `GET`  | `/api/users/<user_id>/timeline/` | Get user comment timeline with sentiment scores  |
| `GET`  | `/api/reset/`                    | Reset dataset to defaults                        |

### Query Parameters

- **platform** (default: 'reddit'): `reddit` or `youtube`

### Response Format

**GET /api/users/**

```json
{
	"users": [
		{
			"id": 1001,
			"username": "john_doe",
			"display_name": "John Doe",
			"archetype": "Aggressive",
			"join_date": "2023-01-15",
			"avatar_color": "#FF5733",
			"comment_count": 150,
			"risk_level": "escalating",
			"trend": "declining",
			"escalation_probability": 0.78,
			"avg_toxicity": 0.35,
			"recent_toxicity": 0.52,
			"current_drift": 0.62
		}
	]
}
```

---

## Core Modules

### 1. **Sentiment Analysis** (`analyzer/sentiment.py`)

Analyzes comment text for sentiment polarity and toxicity using:

- **VADER Sentiment Analyzer** for baseline sentiment scores
- **Custom Toxicity Keywords** for enhanced detection of harmful language
- **Toxicity Levels**: safe, mild, moderate, severe

**Output Metrics:**

- `compound`: Overall sentiment [-1 to 1]
- `positive`, `negative`, `neutral`: Sentiment components
- `toxicity_score`: Custom toxicity metric [0 to 1]

### 2. **Drift Detection** (`analyzer/drift.py`)

Detects behavioral drift using sliding-window analysis on sentiment sequences:

- Compares recent behavior against baseline established from historical data
- Computes drift scores to quantify deviation from normal behavior
- Generates escalation probability predictions

**Risk Levels:**

- **Normal**: Stable, non-threatening behavior
- **Drifting**: Gradual shift toward negative sentiment
- **Warning**: Significant drift with increasing toxicity
- **Escalating**: High probability of continued toxic escalation

### 3. **Data Generator** (`analyzer/generator.py`)

Loads user data from CSV files with flexible column mapping:

- Automatically detects column names: `user_name`, `username`, `author`, etc.
- Constructs user profiles with complete comment histories
- Supports custom CSV-formatted datasets
- Caches data for performance

### 4. **Views & API** (`analyzer/views.py`)

Django views that:

- Serve the main dashboard
- Provide REST API endpoints for user analytics
- Compute real-time sentiment and drift metrics
- Return sorted, ranked user lists by escalation risk

---

## How It Works

### Processing Pipeline

1. **Data Loading**: CSV files are parsed and user profiles created with comment histories
2. **Sentiment Analysis**: Each comment is scored for sentiment polarity and toxicity
3. **Drift Computation**: Sliding-window analysis identifies behavioral patterns
4. **Risk Assessment**: Users are classified into risk tiers based on drift and escalation probability
5. **Visualization**: Results presented in interactive dashboard with charts and timelines

### Escalation Probability Calculation

The system uses multiple signals:

- Current drift score (deviation from baseline)
- Trend direction (improving vs. declining)
- Toxicity velocity (rate of change)
- Historical escalation patterns

This produces a composite escalation probability ranging from 0 (safe) to 1 (imminent).

---

## Future Enhancements

- [ ] Machine learning models for improved drift detection
- [ ] Real-time streaming data pipeline
- [ ] User notification system for moderators
- [ ] Advanced filtering and search capabilities
- [ ] Multi-language support for sentiment analysis
- [ ] Detailed explainability reports
- [ ] Custom toxicity word list per community
- [ ] Integration with social media APIs

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/enhancement`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/enhancement`)
5. Submit pull request

---

## License

This project is available for educational and research purposes.

---

## Support

For issues, questions, or suggestions, please open an issue or contact the development team.
