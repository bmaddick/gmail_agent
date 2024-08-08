import ollama
from flask import Flask, request, jsonify
import threading

app = Flask(__name__)

def summarize_email(email_content):
    prompt = f"""{email_content} #### Summarize the contents of this email, then
                    list any next steps that need to be taken and
                    by whom they should be taken."""
    
    response = ollama.chat(model="llama3", messages=[
        {
            "role": "user",
            "content": prompt,
        }
    ])
    
    return response["message"]["content"]

def draft_response(summary):
    prompt = f"""{summary} #### Draft a 
            response email based on the contents of the thread."""
    
    response = ollama.chat(model="llama3", messages=[
        {
            "role": "user",
            "content": prompt,
        }
    ])
    
    return response["message"]["content"]

@app.route('/summarize', methods=['POST'])
def handle_summarize():
    email_content = request.json.get('email_content')
    if not email_content:
        return jsonify({"error": "No email content provided"}), 400
    
    summary = summarize_email(email_content)
    return jsonify({"summary": summary})

@app.route('/draft', methods=['POST'])
def handle_draft():
    summary = request.json.get('summary')
    if not summary:
        return jsonify({"error": "No summary provided"}), 400
    
    draft = draft_response(summary)
    return jsonify({"draft": draft})

def run_flask_app():
    app.run(host='localhost', port=5000)

if __name__ == "__main__":
    # Start the Flask app in a separate thread
    flask_thread = threading.Thread(target=run_flask_app)
    flask_thread.start()
    
    print("Email processing service is running. Use Ctrl+C to stop.")
    
    try:
        flask_thread.join()
    except KeyboardInterrupt:
        print("Shutting down the service...")

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
