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
      color: black;
      border: 1px solid black;
      border-radius: 8px;
      padding: 16px;
      overflow-y: auto;
      z-index: 1000;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(summaryContainer);
    console.log('Summary container appended to body');
  } else {
    console.log('Summary container already exists');
  }
  return summaryContainer;
}

// Function to display the summary or filler text
function displayContent(content, isFillerText = false) {
  console.log('Displaying content');
  const summaryContainer = createSummaryContainer();

  // Clear previous content
  while (summaryContainer.firstChild) {
    summaryContainer.removeChild(summaryContainer.firstChild);
  }

  // Create and append header
  const header = document.createElement('h3');
  header.textContent = isFillerText ? 'Gmail Assistant' : 'Email Summary';
  header.style.color = 'black';
  summaryContainer.appendChild(header);

  // Create and append paragraph
  const paragraph = document.createElement('p');
  paragraph.textContent = content;
  paragraph.style.color = 'black';
  summaryContainer.appendChild(paragraph);
  console.log('Content updated');
}

// Function to extract email content
function extractEmailContent() {
  console.log('Extracting email content');
  const emailBody = document.querySelector('.adn.ads');
  if (emailBody) {
    console.log('Email body found');
    return emailBody.innerText;
  }
  console.log('Email body not found');
  return '';
}

// Function to check if an email thread is open
function isEmailThreadOpen() {
  const emailSubject = document.querySelector('.hP');
  const emailSender = document.querySelector('.hP .gD');
  const emailBody = document.querySelector('.adn.ads');
  return !!(emailSubject && emailSender && emailBody);
}

// Function to handle email content
function handleEmailContent() {
  console.log('Handling email content');
  if (isEmailThreadOpen()) {
    console.log('Email thread is open');
    displayPlaceholderText();
    const emailContent = extractEmailContent();
    if (emailContent.trim()) {
      chrome.runtime.sendMessage({ action: 'summarizeEmail', content: emailContent }, (response) => {
        if (response && response.summary) {
          console.log('Summary received from background script');
          displayContent(response.summary);
        } else {
          console.log('No summary received or error occurred');
          displayPlaceholderText();
        }
      });
    }
  } else {
    displayFillerText();
  }
}

// Function to display placeholder text
function displayPlaceholderText() {
  const placeholderText = "this is where the summary and suggested response will be";
  displayContent(placeholderText, false);
}

// Function to display filler text
function displayFillerText() {
  const fillerText = "Hi! I'm your Gmail assistant. I don't interact with this page, but if you open an email thread I can summarize the contents, help you respond to the thread, and provide helpful ideas for you.";
  displayContent(fillerText, true);
}

// Initialize the content script
function init() {
  console.log('Initializing content script');
  displayFillerText();

  // Set up an interval to periodically check for changes
  setInterval(() => {
    handleEmailContent();
  }, 2000); // Check every 2 seconds

  console.log('Periodic check set up for changes');
}

// Run the initialization
console.log('Starting initialization');
init();

console.log('Gmail Agent content script loaded - Script end');
