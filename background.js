// Gmail Agent Background Script
const fs = require('fs');
const path = require('path');

// Set up logging
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
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarizeEmail') {
    logger.log('Received summarizeEmail request: ' + JSON.stringify(request));
    summarizeEmail(request.content)
      .then(summary => {
        logger.log('Summarization successful: ' + summary);
        sendResponse({ summary: summary });
      })
      .catch(error => {
        logger.error('Error summarizing email: ' + error.message);
        sendResponse({ error: error.message });
      });
    return true; // Indicates that the response is sent asynchronously
  }
});

// Function to communicate with the Python service
async function summarizeEmail(content) {
  logger.log('Attempting to summarize email with content length: ' + content.length);
  try {
    logger.log('Sending request to summarization service');
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
    return data.summary;
  } catch (error) {
    logger.error('Detailed error in summarizeEmail: ' + error);
    logger.error('Error stack: ' + error.stack);
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the summarization service. Please check if the service is running.');
    }
    throw new Error('Failed to summarize email: ' + error.message);
  }
}

// Initialize the background script
function init() {
  logger.log('Gmail Agent background script initialized');
}

// Run the initialization
init();
