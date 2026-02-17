from news_client import NewsClient

class DebateEngine:
    def __init__(self, llm_client, memory, scorer, analysis):
        self.llm = llm_client
        self.memory = memory
        self.scorer = scorer
        self.analysis = analysis
        self.news_client = NewsClient()
        self.topic = ""
        self.user_position = ""
        self.ai_position = ""
        self.difficulty = 1
        with open("prompts/opponent.txt", "r") as f:
            self.system_prompt_template = f.read()

    def setup_debate(self, topic, user_position, difficulty):
        self.topic = topic
        self.user_position = user_position
        self.ai_position = "Con" if user_position.lower() == "pro" else "Pro"
        self.difficulty = difficulty
        
        # Fetch live news context
        news_context = self.news_client.get_news(topic)
        
        system_msg = self.system_prompt_template.format(
            topic=self.topic,
            ai_position=self.ai_position,
            user_position=self.user_position,
            difficulty=self.difficulty
        )
        
        # Append news context to system message
        system_msg += f"\n\nLIVE NEWS CONTEXT:\n{news_context}\n\nUse this news context to support your arguments with up-to-date information."
        
        self.memory.add_message("system", system_msg)

    def process_user_turn(self, argument):
        # Handle manual AI trigger
        if argument == "[AI_TURN]":
            # Just get AI completion based on current history
            ai_response = self.llm.get_completion(self.memory.get_messages())
            self.memory.add_message("assistant", ai_response)
            return ai_response, [], self.difficulty

        # Add to memory
        self.memory.add_message("user", argument)
        
        # Scorning and difficulty scaling
        score = self.scorer.score_argument(argument)
        self.difficulty = self.scorer.calculate_difficulty(score, self.difficulty)
        
        # Detect fallacies (async-like wait, though local for now)
        fallacies = self.analysis.detect_fallacies(argument)
        
        # Get AI response
        ai_response = self.llm.get_completion(self.memory.get_messages())
        self.memory.add_message("assistant", ai_response)
        
        return ai_response, fallacies, self.difficulty

    def end_debate(self):
        transcript = self.memory.get_transcript()
        return self.analysis.generate_post_debate_analysis(transcript)
