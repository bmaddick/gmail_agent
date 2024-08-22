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
    # Sample email contents for testing various types of emails
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

    logger.info("Starting email summarization tests")

    for test_email in test_emails:
        logger.info(f"Testing {test_email['type']} email")
        try:
            summary = summarize_email(test_email['content'])
            logger.info(f"Email summarization successful for {test_email['type']}")
            logger.info(f"Generated summary:\n{summary}")
        except Exception as e:
            logger.error(f"Error during {test_email['type']} email summarization test: {str(e)}", exc_info=True)

    logger.info("Email summarization tests completed")
