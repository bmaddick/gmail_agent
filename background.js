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
  // In a real implementation, this would communicate with the Python service
  // For now, we'll use a placeholder summarization
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const summary = `This is a placeholder summary for the email content: "${content.substring(0, 50)}..."`;
      resolve(summary);
    }, 1000); // Simulate network delay
  });
}

// Initialize the background script
function init() {
  console.log('Gmail Agent background script initialized');
}

// Run the initialization
init();
