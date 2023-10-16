# audio2text.py

import whisper
def audio_to_text(file_path: str) -> str:
    """
    Convert an audio file to text using the Whisper ASR model.
    
    Parameters:
    - file_path (str): The path to the audio file.

    Returns:
    - str: The recognized text.
    """

    # Ensure the OpenAI API key is set. If it's set globally, this step is optional.
    # openai.api_key = "YOUR_API_KEY"

    # Load the audio file and encode it to base64
    print("in audio_to_text")
    file_path='/home/ubuntu/gxy/AgentVerse/audio/test.wav'
    model = whisper.load_model("tiny")
    result = model.transcribe(file_path)
    print(result["text"])


    return result["text"]

# Test function (optional)
if __name__ == "__main__":
    test_file = "/path/to/your/test/audio/file.wav"
    print(audio_to_text(test_file))
