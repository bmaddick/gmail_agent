import ollama
from flask import Flask, request, jsonify
import threading
import logging

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
    # Placeholder text for testing
    placeholder_summary = "This text is sent from the python script and will be replaced with the email summary"

    try:
        # Log the placeholder usage
        logger.info("Using placeholder summary for testing")
        return placeholder_summary
    except Exception as e:
        logger.error(f"Error in summarize_email: {str(e)}")
        raise

def draft_response(summary):
    logger.info(f"Drafting response based on summary length: {len(summary)}")
    prompt = f"""{summary} #### Draft a
            response email based on the contents of the thread."""

    try:
        response = ollama.chat(model="llama3", messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ])
        logger.info("Response drafting successful")
        return response["message"]["content"]
    except Exception as e:
        logger.error(f"Error in draft_response: {str(e)}")
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
        logger.error(f"Error in handle_summarize: {str(e)}")
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
        logger.error(f"Error in handle_draft: {str(e)}")
        return jsonify({"error": "An error occurred while drafting the response"}), 500

def run_flask_app():
    logger.info("Starting Flask app")
    app.run(host='localhost', port=5000)

if __name__ == "__main__":
    # Start the Flask app in a separate thread
    flask_thread = threading.Thread(target=run_flask_app)
    flask_thread.start()

    logger.info("Email processing service is running. Use Ctrl+C to stop.")

    try:
        flask_thread.join()
    except KeyboardInterrupt:
        logger.info("Shutting down the service...")

# The following code is kept for reference and backwards compatibility
# It can be removed once the new API is fully integrated with the extension

# Load the text from the file output by llama
with open('email_data.txt', 'r') as file:
    data = file.read()
logger.info("Loaded email data from file")

# Debugging statement to confirm file was loaded
if data:
    logger.info("File loaded successfully.")
else:
    logger.warning("File loading failed or file is empty.")

prompt_01 = f"""{data} #### Summarize the contents of this email, then
                    list any next steps that need to be taken and
                    by whom they should be taken."""

logger.info("Generating response for agent-01")

# Get a response from Agent 1 - Email summarizer
response_01 = ollama.chat(model="llama3", messages =[
    {
            "role": "user",
            "content": prompt_01,
    }
])

logger.info("Response generated for agent-01")

# Set the prompt for the second agent
prompt_02 = f"""{response_01['message']['content']} #### Draft a
            response email based on the contents of the thread."""

logger.info("Generating response for agent-02")

#Get a response from Agent 2 - Teacher
response_02 = ollama.chat(model="llama3", messages=[
    {
        "role": "user",
        "content": prompt_02,
    }
])

logger.info("Response generated for agent-02")
