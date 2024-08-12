import ollama
from flask import Flask, request, jsonify
import threading
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

import requests

def summarize_email(email_content):
    prompt = f"""{email_content} #### Summarize the contents of this email, then
                    list any next steps that need to be taken and
                    by whom they should be taken."""

    payload = {
        "model": "llama3",
        "prompt": prompt,
        "stream": False
    }
    logging.info(f"Sending request to ollama service with payload: {payload}")

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json=payload
        )
        logging.info(f"Response status code: {response.status_code}")
        logging.info(f"Response headers: {response.headers}")

        response.raise_for_status()
        data = response.json()
        logging.debug(f"Response body: {data}")

        summary = data['response']
        logging.info(f"Summary generated successfully. Length: {len(summary)}")
        return summary
    except requests.RequestException as e:
        logging.error(f"RequestException in summarize_email: {str(e)}", exc_info=True)
        raise
    except KeyError as e:
        logging.error(f"KeyError in summarize_email. Unexpected response format: {str(e)}", exc_info=True)
        raise
    except Exception as e:
        logging.error(f"Unexpected error in summarize_email: {str(e)}", exc_info=True)
        raise

def draft_response(summary):
    prompt = f"""{summary} #### Draft a
            response email based on the contents of the thread."""

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3",
                "prompt": prompt,
                "stream": False
            }
        )
        response.raise_for_status()
        data = response.json()
        return data['response']
    except requests.RequestException as e:
        logging.error(f"Error in draft_response: {str(e)}")
        return None
    except KeyError as e:
        logging.error(f"Unexpected response format in draft_response: {str(e)}")
        return None

@app.route('/summarize', methods=['POST'])
def handle_summarize():
    logging.info("Received request to /summarize endpoint")
    logging.debug(f"Raw request data: {request.data}")

    email_content = request.json.get('email_content')
    if not email_content:
        logging.warning("No email content provided in request")
        return jsonify({"error": "No email content provided"}), 400

    logging.info(f"Attempting to summarize email content (length: {len(email_content)})")
    try:
        summary = summarize_email(email_content)
        if summary:
            logging.info(f"Summary generated successfully (length: {len(summary)})")
            return jsonify({"summary": summary})
        else:
            logging.error("Failed to generate summary: empty response")
            return jsonify({"error": "Failed to generate summary: empty response"}), 500
    except Exception as e:
        logging.error(f"Error during summarization: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to generate summary: {str(e)}"}), 500

@app.route('/draft', methods=['POST'])
def handle_draft():
    summary = request.json.get('summary')
    if not summary:
        logging.warning("No summary provided in request")
        return jsonify({"error": "No summary provided"}), 400

    draft = draft_response(summary)
    if draft:
        logging.info("Draft response generated successfully")
        return jsonify({"draft": draft})
    else:
        logging.error("Failed to generate draft response")
        return jsonify({"error": "Failed to generate draft response"}), 500



def run_flask_app():
    app.run(host='localhost', port=5000)

if __name__ == "__main__":
    # Start the Flask app in a separate thread
    flask_thread = threading.Thread(target=run_flask_app)
    flask_thread.start()

    logging.info("Email processing service is running. Use Ctrl+C to stop.")

    try:
        flask_thread.join()
    except KeyboardInterrupt:
        logging.info("Shutting down the service...")

# The following code is kept for reference and backwards compatibility
# It can be removed once the new API is fully integrated with the extension

# Load the text from the file output by llama
with open('email_data.txt', 'r') as file:
    data = file.read()
print()

# Debugging statement to confirm file was loaded
if data:
    print("File loaded successfully.")
else:
    print("File loading failed or file is empty.")
print()

prompt_01 = f"""{data} #### Summarize the contents of this email, then
                    list any next steps that need to be taken and
                    by whom they should be taken."""
# print("<agent-01. Prompt: " + prompt_01)
# print()

print("<agent-01> Generating a response...")
print()

# Get a response from Agent 1 - Email summarizer
response_01 = ollama.chat(model="llama3", messages =[
    {
            "role": "user",
            "content": prompt_01,
    }
])

print(response_01["message"], ["content"])

# Set the prompt for the second agent
prompt_02 = f"""{response_01['message']['content']} #### Draft a
            response email based on the contents of the thread."""

print("<agent-02> Prompt: " + prompt_02)
print()

print("<agent-02 Generating a response...")

#Get a response from Agent 2 - Teacher
response_02 = ollama.chat(model="llama3", messages=[
    {
        "role": "user",
        "content": prompt_02,
    }
])

#Print out the final response from agent 2
print("<agent-02> Response: " + response_02["message"]["content"])
