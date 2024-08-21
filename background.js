// Gmail Agent Background Script

// Function to handle messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarizeEmail') {
    summarizeEmail(request.content)
      .then(summary => {
        sendResponse({ summary: summary });
      })
      .catch(error => {
        console.error('Error summarizing email:', error);
        sendResponse({ error: 'Failed to summarize email' });
      });
    return true; // Indicates that the response is sent asynchronously
  }
});

// Function to communicate with the Python service
async function summarizeEmail(content) {
  try {
    const response = await fetch('http://localhost:5000/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email_content: content }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error('Error summarizing email:', error);
    throw new Error('Failed to summarize email. Please try again later.');
  }
}

// Initialize the background script
function init() {
  console.log('Gmail Agent background script initialized');
}

// Run the initialization
init();
