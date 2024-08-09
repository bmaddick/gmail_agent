// Gmail Agent Content Script

console.log('Gmail Agent content script loaded - Script start');
console.log('Current URL:', window.location.href);
console.log('Document readyState:', document.readyState);

// Function to create and display the summary container
function createSummaryContainer() {
  console.log('Creating summary container');
  let summaryContainer = document.getElementById('gmail-agent-summary');
  if (!summaryContainer) {
    console.log('Summary container not found, creating new one');
    summaryContainer = document.createElement('div');
    summaryContainer.id = 'gmail-agent-summary';
    summaryContainer.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      width: 300px;
      height: calc(100vh - 80px);
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 16px;
      overflow-y: auto;
      z-index: 1000;
    `;
    document.body.appendChild(summaryContainer);
    console.log('Summary container appended to body');
  } else {
    console.log('Summary container already exists');
  }
  return summaryContainer;
}

// Function to display the summary
function displaySummary(summary) {
  console.log('Displaying summary');
  const summaryContainer = createSummaryContainer();

  // Clear previous content
  while (summaryContainer.firstChild) {
    summaryContainer.removeChild(summaryContainer.firstChild);
  }

  // Create and append header
  const header = document.createElement('h3');
  header.textContent = 'Email Summary';
  summaryContainer.appendChild(header);

  // Create and append paragraph
  const paragraph = document.createElement('p');
  paragraph.textContent = summary;
  summaryContainer.appendChild(paragraph);
  console.log('Summary content updated');
}

// Function to extract email content
function extractEmailContent() {
  console.log('Extracting email content');
  // This function now extracts content from the entire page
  // You may need to adjust this based on Gmail's DOM structure
  const emailBody = document.querySelector('.adn.ads');
  if (emailBody) {
    console.log('Email body found');
    return emailBody.innerText;
  }
  // Fallback to the entire body if specific email content is not found
  console.log('Email body not found, falling back to entire body content');
  return document.body.innerText;
}

// Function to handle email content
function handleEmailContent() {
  console.log('Handling email content');
  const emailContent = extractEmailContent();
  chrome.runtime.sendMessage({ action: 'summarizeEmail', content: emailContent }, (response) => {
    if (response && response.summary) {
      console.log('Summary received from background script');
      displaySummary(response.summary);
    } else {
      console.log('No summary received or error occurred');
    }
  });
}

// Initialize the content script
function init() {
  console.log('Initializing content script');
  createSummaryContainer();
  // Initial call to handle email content
  handleEmailContent();

  // Set up an interval to periodically check for changes
  setInterval(handleEmailContent, 5000); // Check every 5 seconds
  console.log('Interval set for periodic checks');
}

// Run the initialization
console.log('Starting initialization');
init();

console.log('Gmail Agent content script loaded - Script end');
