// Gmail Agent Background Script

// Keep-alive interval (5 minutes)
const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000;

// Function to handle messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message from content script:', request);
  if (request.action === 'summarizeEmail') {
    console.log('Attempting to summarize email content, length:', request.content.length);
    summarizeEmail(request.content)
      .then(summary => {
        console.log('Summary generated successfully, length:', summary.length);
        sendResponse({ summary: summary });
      })
      .catch(error => {
        console.error('Error summarizing email:', error.message);
        sendResponse({ error: 'Failed to summarize email. Please try again.' });
      });
    return true; // Indicates that the response is sent asynchronously
  } else {
    console.warn('Received unknown action:', request.action);
  }
});

// Function to communicate with the Python service
async function summarizeEmail(content) {
  try {
    console.log('Sending email content to Python service for summarization');
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
    if (data.error) {
      throw new Error(data.error);
    }

    console.log('Received summary from Python service');
    return data.summary;
  } catch (error) {
    console.error('Error communicating with Python service:', error.message);
    throw new Error('Failed to generate summary: ' + error.message);
  }
}

// Initialize the background script
function init() {
  console.log('Gmail Agent background script initialized');
  // Set up keep-alive mechanism
  setInterval(() => {
    console.log('Keep-alive ping');
    chrome.runtime.getPlatformInfo(() => {});
  }, KEEP_ALIVE_INTERVAL);
}

// Event listeners for proper initialization
chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

// Wakeup listener to handle service worker reactivation
chrome.runtime.onMessage.addListener((message) => {
  if (message === 'wake-up') {
    console.log('Background script woken up');
  }
});
