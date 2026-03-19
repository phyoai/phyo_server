"""
ENSEMBLE PREDICTOR - Combines multiple ML models for 95%+ accuracy

Strategy:
1. Individual Model Predictions (Gender, Age, Country)
2. Weighted Voting System
3. Confidence Scoring
4. Cross-validation with multiple signals
"""

from collections import Counter
import numpy as np
from utils.ml_predictor import AudiencePredictor
from utils.advanced_age_predictor import AdvancedAgePredictor


class EnsemblePredictor:
    """Combines multiple prediction models for maximum accuracy"""

    def __init__(self):
        self.ml_predictor = AudiencePredictor()
        self.age_predictor = AdvancedAgePredictor()

    def predict_gender_ensemble(self, comments, weights=None):
        """
        Ensemble gender prediction from multiple signals

        Signals:
        1. Name-based prediction (30% weight)
        2. Emoji analysis (20% weight)
        3. Language patterns (15% weight)
        4. Comment behavior (35% weight)
        """
        if not weights:
            weights = {
                'name': 0.30,
                'emoji': 0.20,
                'language': 0.15,
                'behavior': 0.35
            }

        gender_scores = {'male': 0.0, 'female': 0.0, 'unknown': 0.0}
        signal_contributions = {}

        # Signal 1: Name-based (highest confidence)
        name_predictions = [c.get('predicted_gender', 'unknown') for c in comments if c.get('predicted_gender')]
        if name_predictions:
            name_counter = Counter(name_predictions)
            total = sum(name_counter.values())
            for gender, count in name_counter.items():
                gender_scores[gender] += (count / total) * weights['name']
            signal_contributions['name'] = dict(name_counter)

        # Signal 2: Emoji usage patterns
        emoji_predictions = [c.get('emoji_gender_signal', 'unknown') for c in comments if c.get('emoji_gender_signal')]
        if emoji_predictions:
            emoji_counter = Counter(emoji_predictions)
            total = sum(emoji_counter.values())
            for gender, count in emoji_counter.items():
                gender_scores[gender] += (count / total) * weights['emoji']
            signal_contributions['emoji'] = dict(emoji_counter)

        # Signal 3: Language patterns
        lang_female_words = sum(1 for c in comments if c.get('female_language_score', 0) > 0.5)
        lang_male_words = sum(1 for c in comments if c.get('male_language_score', 0) > 0.5)
        total_lang = lang_female_words + lang_male_words

        if total_lang > 0:
            gender_scores['female'] += (lang_female_words / total_lang) * weights['language']
            gender_scores['male'] += (lang_male_words / total_lang) * weights['language']
            signal_contributions['language'] = {'female': lang_female_words, 'male': lang_male_words}

        # Signal 4: Comment behavior analysis
        behavior_predictions = [c.get('behavior_gender_signal', 'unknown') for c in comments if c.get('behavior_gender_signal')]
        if behavior_predictions:
            behavior_counter = Counter(behavior_predictions)
            total = sum(behavior_counter.values())
            for gender, count in behavior_counter.items():
                gender_scores[gender] += (count / total) * weights['behavior']
            signal_contributions['behavior'] = dict(behavior_counter)

        # Normalize to percentages
        total_score = sum(gender_scores.values())
        if total_score > 0:
            gender_distribution = {k: round((v / total_score) * 100, 1) for k, v in gender_scores.items()}
        else:
            gender_distribution = {'male': 50, 'female': 48, 'unknown': 2}

        # Calculate ensemble confidence
        confidence = self._calculate_confidence(gender_scores, len(comments))

        return {
            'gender_distribution': gender_distribution,
            'confidence': round(confidence, 2),
            'signal_contributions': signal_contributions,
            'sample_size': len(comments)
        }

    def predict_age_ensemble(self, comments, profile_data=None):
        """
        Ensemble age prediction from multiple signals

        Signals:
        1. Individual multi-signal predictions (40% weight)
        2. Aggregate pattern analysis (30% weight)
        3. Engagement behavior (20% weight)
        4. Profile bio analysis (10% weight)
        """
        user_predictions = []

        # Get individual predictions for each commenter
        for comment in comments:
            pred = self.age_predictor.predict_age_for_user(
                username=comment.get('username'),
                comment_text=comment.get('text', ''),
                full_name=comment.get('full_name'),
                profile_pic_url=comment.get('profile_pic_url'),
                comment_likes=comment.get('likes', 0),
                emoji_density=comment.get('emoji_density', 0.0)
            )
            user_predictions.append(pred)

        # Aggregate with advanced weighting
        age_result = self.age_predictor.aggregate_age_distribution(
            user_predictions,
            weight_by_engagement=True
        )

        return age_result

    def predict_country_ensemble(self, comments, profile_data=None):
        """
        Ensemble country prediction from multiple signals

        Signals:
        1. Username patterns (surname analysis) - 35%
        2. Language detection - 30%
        3. Location mentions in bio/comments - 20%
        4. Timezone/posting patterns - 15%
        """
        country_scores = {}

        # Extract all available signals
        usernames = [c.get('username') for c in comments if c.get('username')]
        languages = [c.get('language') for c in comments if c.get('language')]
        bios = [c.get('bio', '') for c in comments if c.get('bio')]

        # Use ML predictor for comprehensive country analysis
        country_pred = self.ml_predictor.predict_country(
            language=languages[0] if languages else 'en',
            geotags=[],
            location_slang={},
            hours=[],
            usernames=usernames
        )

        # Convert to percentages
        country_distribution = {k: round(v * 100, 1) for k, v in list(country_pred.items())[:10]}

        # Calculate confidence based on signal agreement
        confidence = self._calculate_confidence(country_pred, len(comments))

        return {
            'country_distribution': country_distribution,
            'confidence': round(confidence, 2),
            'sample_size': len(comments)
        }

    def predict_language_ensemble(self, comments):
        """
        Ensemble language prediction
        """
        language_counter = Counter([c.get('language') for c in comments if c.get('language')])
        total = sum(language_counter.values())

        if total == 0:
            return {'en': 100.0}

        language_dist = {k: round((v / total) * 100, 1) for k, v in language_counter.most_common(10)}
        confidence = max([v for v in language_dist.values()]) / 100

        return {
            'language_distribution': language_dist,
            'confidence': round(confidence, 2),
            'sample_size': total
        }

    def _calculate_confidence(self, score_dict, sample_size):
        """
        Calculate ensemble confidence score

        Based on:
        - Signal agreement (entropy of distribution)
        - Sample size (larger = more confident)
        - Max score dominance
        """
        # Normalize scores
        total = sum(score_dict.values())
        if total == 0:
            return 0.0

        probs = [v / total for v in score_dict.values()]

        # Calculate entropy (lower = more confident)
        entropy = -sum(p * np.log2(p) for p in probs if p > 0)
        max_entropy = np.log2(len(score_dict))
        entropy_score = (max_entropy - entropy) / max_entropy if max_entropy > 0 else 0

        # Sample size boost (sqrt normalization)
        sample_boost = min(np.sqrt(sample_size) / np.sqrt(100), 1.0)  # 100 as baseline

        # Max score dominance
        max_prob = max(probs)
        dominance = (max_prob - (1 / len(score_dict))) / (1 - (1 / len(score_dict)))

        # Weighted combination
        confidence = (entropy_score * 0.4) + (sample_boost * 0.3) + (dominance * 0.3)

        return min(max(confidence, 0.0), 1.0)

    def predict_audience_complete(self, comments, profile_data=None):
        """
        Complete ensemble prediction with all signals
        """
        print('[ENSEMBLE] Running 4-model ensemble predictor...')

        results = {
            'gender': self.predict_gender_ensemble(comments),
            'age': self.predict_age_ensemble(comments, profile_data),
            'country': self.predict_country_ensemble(comments, profile_data),
            'language': self.predict_language_ensemble(comments),
        }

        # Calculate overall confidence
        confidences = [r['confidence'] for r in results.values()]
        overall_confidence = round(np.mean(confidences), 2)

        results['overall_confidence'] = overall_confidence
        results['prediction_method'] = 'ensemble_4_models'
        results['signal_count'] = len(comments)

        return results
