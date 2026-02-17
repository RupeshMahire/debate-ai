import re

class Scorer:
    def __init__(self):
        self.evidence_keywords = [
            "research", "study", "data", "evidence", "source", "according to",
            "stat", "percent", "expert", "fact", "proof"
        ]
        self.logical_connectors = [
            "therefore", "consequently", "furthermore", "however", "moreover",
            "nevertheless", "in addition", "as a result", "because", "since"
        ]

    def score_argument(self, text):
        score = 0
        text_lower = text.lower()
        
        # Length score (up to 3 points)
        words = text.split()
        if len(words) > 50:
            score += 3
        elif len(words) > 20:
            score += 2
        elif len(words) > 5:
            score += 1

        # Evidence score (up to 3 points)
        evidence_count = sum(1 for word in self.evidence_keywords if word in text_lower)
        score += min(3, evidence_count)

        # Logic score (up to 3 points)
        logic_count = sum(1 for word in self.logical_connectors if word in text_lower)
        score += min(3, logic_count)

        return score

    def calculate_difficulty(self, total_score, current_difficulty):
        # Very simple scaling: if score is high, bump difficulty up to max 5
        if total_score > 7 and current_difficulty < 5:
            return current_difficulty + 1
        return current_difficulty
