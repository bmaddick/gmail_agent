import ollama

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

