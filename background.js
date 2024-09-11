// Gmail Agent Background Script
// This script handles the core functionality of the Gmail Agent extension,
// including communication with the content script and the Python backend service.

const fs = require('js');
const path = require('path');

// Set up logging
// This logger writes both to a file and to the console for easier debugging
const logFilePath = path.join(__dirname, 'background.log');
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - INFO: ${message}\n`;
    fs.appendFileSync(logFilePath, logMessage);
    console.log(message);
  },
  error: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ERROR: ${message}\n`;
    fs.appendFileSync(logFilePath, logMessage);
    console.error(message);
  }
};

// Function to handle messages from the content script
// This listener processes requests from content.js, primarily for email summarization
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarizeEmail') {
    logger.log('Received summarizeEmail request from tab ' + sender.tab.id);
    if (!request.content) {
      logger.error('No email content provided in the request');
      sendResponse({ error: 'No email content provided' });
      return true;
    }
    // Call the summarizeEmail function and handle the response
    summarizeEmail(request.content)
      .then(summary => {
        logger.log('Summarization successful. Summary length: ' + summary.length);
        sendResponse({ summary: summary });
      })
      .catch(error => {
        logger.error('Error summarizing email: ' + error.message);
        sendResponse({ error: 'Failed to summarize email: ' + error.message });
      });
    return true; // Indicates that the response is sent asynchronously
  } else {
    logger.error('Unknown action received: ' + request.action);
    sendResponse({ error: 'Unknown action' });
  }
});

// Function to communicate with the Python service
// This function sends the email content to the Python backend for summarization
async function summarizeEmail(content) {
  logger.log('Attempting to summarize email with content length: ' + content.length);
  try {
    logger.log('Sending request to summarization service');
    // Send a POST request to the local Python service
    const response = await fetch('http://localhost:5000/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email_content: content }),
    });

    logger.log('Received response from summarization service: ' + response.status);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    if (!data.summary) {
      throw new Error('Summary not found in response data');
    }
    logger.log('Successfully parsed response data');
    console.log('Summary received:', data.summary); // Log the received summary
    return data.summary;
  } catch (error) {
    // Detailed error handling and logging
    logger.error('Detailed error in summarizeEmail: ' + error);
    logger.error('Error stack: ' + error.stack);
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the summarization service. Please check if the service is running.');
    } else if (error.message.includes('NetworkError')) {
      throw new Error('Network error occurred. Please check your internet connection.');
    } else if (error.message.includes('TimeoutError')) {
      throw new Error('Request timed out. The summarization service might be overloaded or unresponsive.');
    }
    throw new Error('Failed to summarize email: ' + error.message);
  }
}

// Test case function with fake email content
// This function is used for testing the summarizeEmail functionality
function testSummarizeEmail() {
  const fakeEmailContent = `
    Subject: Important Project Update

    Dear Team,

    I hope this email finds you well. I wanted to provide a quick update on our ongoing project:

    1. We've successfully completed Phase 1 ahead of schedule.
    2. The client has requested some minor changes to the UI design.
    3. We need to schedule a team meeting to discuss Phase 2 implementation.

    Please review the attached documents and let me know if you have any questions or concerns.

    Best regards,
    John Doe
    Project Manager
  `;

  console.log('Testing summarizeEmail function with fake content...');
  summarizeEmail(fakeEmailContent)
    .then(summary => {
      console.log('Test case summary:', summary);
    })
    .catch(error => {
      console.error('Test case error:', error);
    });
}

// Run the test case
testSummarizeEmail();

// Initialize the background script
// This function sets up the background script and implements a health check
function init() {
  try {
    logger.log('Gmail Agent background script initializing...');

    // Implement a periodic health check
    setInterval(() => {
      try {
        // Perform a simple operation to check if the script is responsive
        chrome.runtime.getPlatformInfo((info) => {
          logger.log('Background script health check: OK');
        });
      } catch (error) {
        logger.error('Health check failed: ' + error.message);
      }
    }, 60000); // Run every minute

    logger.log('Gmail Agent background script initialized successfully');
  } catch (error) {
    logger.error('Error during background script initialization: ' + error.message);
  }
}

// Run the initialization
init();
