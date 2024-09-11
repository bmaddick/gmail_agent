# email_agents.py
# This file is part of the Gmail Agent extension and serves as the backend API
# for email summarization and response drafting. It interacts with the Ollama API
# for AI-powered text processing and provides endpoints for the browser extension.

import ollama
from flask import Flask, request, jsonify
import threading
import logging
import json
from typing import Dict, Any

# Initialize Flask application
app = Flask(__name__)

# Configure logging
# This setup ensures that all important events and errors are logged
# both to a file (email_agents.log) and to the console for easier debugging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
file_handler = logging.FileHandler('email_agents.log')
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger = logging.getLogger(__name__)
logger.addHandler(file_handler)

def summarize_email(email_content):
    """
    Summarize the given email content using the Ollama API.

    This function is called by the /summarize endpoint (handled by handle_summarize)
    in response to requests from the browser extension's background script (background.js).

    Args:
        email_content (str): The full content of the email to be summarized.

    Returns:
        str: A summary of the email content.

    Raises:
        ollama.ResponseError: If there's an error with the Ollama API request.
        Exception: For any other unexpected errors during the summarization process.
    """
    logger.info(f"Summarizing email with content length: {len(email_content)}")
    try:
        prompt = f"Summarize the following email content:\n\n{email_content}\n\nSummary:"
        logger.info(f"Sending prompt to ollama.chat: {prompt[:100]}...")  # Log first 100 chars of prompt
        response = ollama.chat(
            model="llama2",  # Using the llama2 model for summarization
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
        print(f"Generated summary: {summary}")  # Print the summary for console logging
        return summary
    except ollama.ResponseError as e:
        logger.error(f"Ollama API error in summarize_email: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in summarize_email: {str(e)}", exc_info=True)
        raise

def draft_response(summary):
    """
    Draft a response email based on the provided summary.

    This function uses the Ollama API to generate a draft response to an email thread.
    It's called by the /draft endpoint in the Flask app (see handle_draft function).

    Args:
        summary (str): A summary of the email thread to respond to.

    Returns:
        str: The drafted response email content.

    Raises:
        ollama.ResponseError: If there's an error with the Ollama API call.
        Exception: For any other unexpected errors.
    """
    logger.info(f"Drafting response based on summary length: {len(summary)}")
    prompt = f"""{summary} #### Draft a
            response email based on the contents of the thread."""

    try:
        logger.info(f"Sending prompt to ollama.chat for drafting: {prompt[:100]}...")
        response = ollama.chat(
            model="llama2",  # Using the llama2 model for response generation
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
    """
    Flask route handler for the /summarize endpoint.

    This function is called when a POST request is made to the /summarize endpoint.
    It receives email content from the request, processes it using the summarize_email
    function, and returns the summary as a JSON response.

    Interaction with other components:
    - Receives data from background.js in the browser extension
    - Calls summarize_email function (defined in this file) to process the email content
    - Returns the summary, which is then sent back to content.js via background.js

    Returns:
        JSON response with the email summary or an error message
    """
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
    """
    Flask route handler for the /draft endpoint.

    This function is called when a POST request is made to the /draft endpoint.
    It receives a summary of an email thread and generates a draft response.

    The function interacts with the draft_response function (defined in this file)
    to generate the draft using the Ollama API.

    Returns:
        JSON response containing the drafted email or an error message.
    """
    logger.info("Received request to /draft endpoint")
    summary = request.json.get('summary')
    if not summary:
        logger.warning("No summary provided in request")
        return jsonify({"error": "No summary provided"}), 400

    try:
        # Call the draft_response function to generate a draft
        draft = draft_response(summary)
        logger.info("Successfully drafted response")
        return jsonify({"draft": draft})
    except Exception as e:
        # Log any errors that occur during the drafting process
        logger.error(f"Error in handle_draft: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while drafting the response"}), 500

# Function to start the Flask application
# This function is called to run the Flask server, which handles API requests from the browser extension
def run_flask_app():
    logger.info("Starting Flask app")
    # Run the Flask app on localhost:5000
    # Note: This is the endpoint that background.js communicates with for email processing
    app.run(host='localhost', port=5000)

if __name__ == "__main__":
    # Test suite for email summarization functionality
    # This section contains sample emails of various types to test the summarize_email function

    # Sample email contents for testing different email types
    test_emails = [
        {
            "type": "Meeting Invite",
            "content": """
            Subject: Quarterly Review Meeting - Please Confirm Attendance

            Dear All,

            This is a reminder for our upcoming Quarterly Review Meeting scheduled for next Friday, June 15th, from 10:00 AM to 12:00 PM in the Main Conference Room.

            Agenda:
            1. Q2 Performance Review
            2. Q3 Goals and Objectives
            3. Budget Allocation for Q3

            Please confirm your attendance by responding to this email. If you cannot attend, please designate a representative from your department.

            Best regards,
            Sarah Johnson
            Executive Assistant
            """
        },
        {
            "type": "Newsletter",
            "content": """
            Subject: TechCo Monthly Newsletter - June 2023

            Dear Subscribers,

            Welcome to our June newsletter! Here's what's new at TechCo:

            1. Product Launch: We're excited to announce the release of TechPro 5.0!
            2. Upcoming Webinar: "AI in Business" - Join us on June 20th at 2 PM EST.
            3. Customer Spotlight: How ACME Corp increased productivity by 30% using our solutions.
            4. Job Openings: We're hiring! Check out our careers page for current opportunities.

            Stay tuned for more updates!

            The TechCo Team
            """
        },
        {
            "type": "Personal Email",
            "content": """
            Subject: Summer Vacation Plans

            Hey Alex,

            I hope you're doing well! I wanted to touch base about our summer vacation plans. I was thinking we could go to the beach for a week in August. What do you think?

            I found a great rental house that's right on the water and can accommodate all of us. It's available from August 15-22. Let me know if those dates work for you and your family.

            Also, do you have any preferences for activities? I was thinking we could do some kayaking, have a bonfire on the beach, and maybe take a day trip to the nearby town for some shopping and sightseeing.

            Looking forward to hearing your thoughts!

            Cheers,
            Sam
            """
        },
        {
            "type": "Project Update",
            "content": """
            Subject: Project Phoenix - Week 12 Update

            Dear Stakeholders,

            I hope this email finds you well. Here's a summary of our progress on Project Phoenix for Week 12:

            Accomplishments:
            1. Completed the backend integration for the user authentication module
            2. Finalized the UI designs for the dashboard and settings pages
            3. Conducted successful load testing for up to 10,000 concurrent users

            Challenges:
            1. Encountered some issues with cross-browser compatibility, working on fixes

            Next Steps:
            1. Begin front-end implementation of the dashboard
            2. Initiate the security audit process
            3. Schedule user acceptance testing for the completed modules

            We're still on track for our planned release date. Please let me know if you have any questions or concerns.

            Best regards,
            Emily Chen
            Project Manager
            """
        }
    ]

    # Start the email summarization test process
    logger.info("Starting email summarization tests")

    # Iterate through each test email and attempt to summarize it
    for test_email in test_emails:
        logger.info(f"Testing {test_email['type']} email")
        try:
            # Call the summarize_email function (defined earlier in this file)
            # This function communicates with the Ollama API to generate the summary
            summary = summarize_email(test_email['content'])
            logger.info(f"Email summarization successful for {test_email['type']}")
            logger.info(f"Generated summary:\n{summary}")
        except Exception as e:
            # Log any errors that occur during the summarization process
            logger.error(f"Error during {test_email['type']} email summarization test: {str(e)}", exc_info=True)

    # Log completion of all tests
    logger.info("Email summarization tests completed")

    # Note: These tests are run when the script is executed directly
    # They are not run when the script is imported as a module in the Flask application
    # The actual summarization endpoint is handled by the /summarize route defined earlier
