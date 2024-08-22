import ollama
from flask import Flask, request, jsonify
import threading
import logging
import json
from typing import Dict, Any

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
file_handler = logging.FileHandler('email_agents.log')
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger = logging.getLogger(__name__)
logger.addHandler(file_handler)

def summarize_email(email_content):
    logger.info(f"Summarizing email with content length: {len(email_content)}")
    try:
        prompt = f"Summarize the following email content:\n\n{email_content}\n\nSummary:"
        logger.info(f"Sending prompt to ollama.chat: {prompt[:100]}...")  # Log first 100 chars of prompt
        response = ollama.chat(
            model="llama2",  # Corrected model name
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ]
        )
        logger.info(f"Received response from ollama.chat: {response}")
        summary = response["message"]["content"].strip()
        logger.info(f"Successfully generated summary with length: {len(summary)}")
        print(f"Generated summary: {summary}")  # Print the summary
        return summary
    except ollama.ResponseError as e:
        logger.error(f"Ollama API error in summarize_email: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in summarize_email: {str(e)}", exc_info=True)
        raise

def draft_response(summary):
    logger.info(f"Drafting response based on summary length: {len(summary)}")
    prompt = f"""{summary} #### Draft a
            response email based on the contents of the thread."""

    try:
        logger.info(f"Sending prompt to ollama.chat for drafting: {prompt[:100]}...")
        response = ollama.chat(
            model="llama2",  # Corrected model name
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ]
        )
        logger.info(f"Received draft response from ollama.chat: {response}")
        draft = response["message"]["content"]
        logger.info("Response drafting successful")
        return draft
    except ollama.ResponseError as e:
        logger.error(f"Ollama API error in draft_response: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in draft_response: {str(e)}", exc_info=True)
        raise

@app.route('/summarize', methods=['POST'])
def handle_summarize():
    logger.info("Received request to /summarize endpoint")
    email_content = request.json.get('email_content')
    if not email_content:
        logger.warning("No email content provided in request")
        return jsonify({"error": "No email content provided"}), 400

    try:
        summary = summarize_email(email_content)
        logger.info("Successfully summarized email")
        return jsonify({"summary": summary})
    except Exception as e:
        logger.error(f"Error in handle_summarize: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while summarizing the email"}), 500

@app.route('/draft', methods=['POST'])
def handle_draft():
    logger.info("Received request to /draft endpoint")
    summary = request.json.get('summary')
    if not summary:
        logger.warning("No summary provided in request")
        return jsonify({"error": "No summary provided"}), 400

    try:
        draft = draft_response(summary)
        logger.info("Successfully drafted response")
        return jsonify({"draft": draft})
    except Exception as e:
        logger.error(f"Error in handle_draft: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while drafting the response"}), 500

def run_flask_app():
    logger.info("Starting Flask app")
    app.run(host='localhost', port=5000)

if __name__ == "__main__":
    # Sample email content for testing
    sample_email = """
    Subject: Project Update Meeting

    Dear Team,

    I hope this email finds you well. I wanted to schedule a project update meeting for next week to discuss our progress on the XYZ initiative.

    Here are the key points we need to cover:
    1. Current status of each team's deliverables
    2. Any roadblocks or challenges faced
    3. Next steps and timeline adjustments (if necessary)

    Please come prepared with a brief summary of your team's work. Let's aim for Tuesday at 2 PM. If this time doesn't work for anyone, please suggest alternatives.

    Looking forward to our discussion!

    Best regards,
    John Doe
    Project Manager
    """

    logger.info("Starting email summarization test")

    try:
        summary = summarize_email(sample_email)
        logger.info("Email summarization successful")
        logger.info(f"Generated summary:\n{summary}")
    except Exception as e:
        logger.error(f"Error during email summarization test: {str(e)}", exc_info=True)

    logger.info("Email summarization test completed")
