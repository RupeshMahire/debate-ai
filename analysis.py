class AnalysisManager:
    def __init__(self, llm_client):
        self.llm = llm_client
        with open("prompts/fallacy.txt", "r") as f:
            self.fallacy_prompt_template = f.read()
        with open("prompts/post_analysis.txt", "r") as f:
            self.post_analysis_prompt_template = f.read()

    def detect_fallacies(self, argument):
        prompt = self.fallacy_prompt_template.format(argument=argument)
        messages = [{"role": "user", "content": prompt}]
        return self.llm.get_completion(messages, temperature=0.1)

    def generate_post_debate_analysis(self, transcript):
        prompt = self.post_analysis_prompt_template.format(transcript=transcript)
        messages = [{"role": "user", "content": prompt}]
        return self.llm.get_completion(messages, temperature=0.7)
