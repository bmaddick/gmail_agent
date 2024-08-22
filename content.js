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
      max-height: calc(100vh - 80px);
      background-color: white;
      color: black;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 16px;
      overflow-y: auto;
      z-index: 1000;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(summaryContainer);
    console.log('Summary container appended to body');

    // Add user controls
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    `;

    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Hide Summary';
    toggleButton.onclick = toggleSummary;

    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh';
    refreshButton.onclick = handleEmailContent;

    controlsDiv.appendChild(toggleButton);
    controlsDiv.appendChild(refreshButton);
    summaryContainer.appendChild(controlsDiv);
  } else {
    console.log('Summary container already exists');
  }
  return summaryContainer;
}

function toggleSummary() {
  const summaryContainer = document.getElementById('gmail-agent-summary');
  const toggleButton = summaryContainer.querySelector('button');
  if (summaryContainer.style.height === '30px') {
    summaryContainer.style.height = 'auto';
    summaryContainer.style.maxHeight = 'calc(100vh - 80px)';
    toggleButton.textContent = 'Hide Summary';
  } else {
    summaryContainer.style.height = '30px';
    summaryContainer.style.overflow = 'hidden';
    toggleButton.textContent = 'Show Summary';
  }
}

// Function to display the summary or error message
function displayContent(content, isError = false) {
  console.log('Displaying content');
  const summaryContainer = createSummaryContainer();

  // Clear previous content
  while (summaryContainer.firstChild) {
    summaryContainer.removeChild(summaryContainer.firstChild);
  }

  // Create and append header
  const header = document.createElement('h3');
  header.textContent = isError ? 'Error' : 'Email Summary';
  header.style.color = isError ? 'red' : 'black';
  summaryContainer.appendChild(header);

  // Create and append paragraph
  const paragraph = document.createElement('p');
  paragraph.textContent = content;
  paragraph.style.color = isError ? 'red' : 'black';
  summaryContainer.appendChild(paragraph);
  console.log('Content updated:', content);
}

// Function to extract email content
function extractEmailContent() {
  console.log('Extracting email content');
  const emailBodies = document.querySelectorAll('.a3s.aiL');
  if (emailBodies.length > 0) {
    console.log(`Found ${emailBodies.length} email bodies`);
    let fullContent = '';
    emailBodies.forEach((body, index) => {
      fullContent += `Email ${index + 1}:\n${body.innerText}\n\n`;
    });
    return fullContent.trim();
  }
  console.log('No email bodies found');
  return '';
}

// Function to check if an email thread is open
function isEmailThreadOpen() {
  console.log('Checking if email thread is open');
  const url = window.location.href;
  const isThreadView = url.includes('#inbox/') || url.includes('#all/');
  const emailSubject = document.querySelector('h2.hP');
  const emailSender = document.querySelector('.gD');
  const emailBody = document.querySelector('.a3s.aiL');
  const isOpen = isThreadView && !!(emailSubject && emailSender && emailBody);
  console.log('Email thread open:', isOpen);
  console.log('URL:', url);
  console.log('Is thread view:', isThreadView);
  console.log('Email subject:', emailSubject ? emailSubject.textContent : 'Not found');
  console.log('Email sender:', emailSender ? emailSender.textContent : 'Not found');
  console.log('Email body present:', !!emailBody);
  return isOpen;
}

// Function to handle email content
function handleEmailContent() {
  console.log('Handling email content - Start');

  if (isEmailThreadOpen()) {
    console.log('Email thread is open - Extracting content');
    const emailContent = extractEmailContent();
    if (emailContent.trim()) {
      console.log('Email content extracted successfully. Length:', emailContent.length);
      displayContent('Summarizing email... Please wait.'); // Show loading message

      const sendMessageWithRetry = (retries = 3) => {
        console.log(`Sending message to background script. Retries left: ${retries}`);
        chrome.runtime.sendMessage({ action: 'summarizeEmail', content: emailContent }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
            if (retries > 0) {
              console.log(`Retrying in 1 second... (${retries} attempts left)`);
              setTimeout(() => sendMessageWithRetry(retries - 1), 1000);
            } else {
              console.error('Max retries reached. Unable to communicate with the extension.');
              displayContent('Failed to communicate with the extension. Please refresh the page and try again.', true);
            }
            return;
          }

          console.log('Received response from background script:', response);
          if (response && response.summary) {
            console.log('Summary received successfully. Length:', response.summary.length);
            displayContent(response.summary);
          } else if (response && response.error) {
            console.error('Error received from background script:', response.error);
            displayContent(`Error: ${response.error}. Please try again.`, true);
          } else {
            console.error('Unexpected response from background script:', response);
            displayContent('Unexpected error occurred. Please try again or refresh the page.', true);
          }
        });
      };

      sendMessageWithRetry();
    } else {
      console.warn('No email content extracted');
      displayContent('No email content found. Please make sure an email is fully loaded.', true);
    }
  } else {
    console.log('Email thread is not open');
    displayContent('Open an email to see its summary.', true);
  }

  console.log('Handling email content - End');
}

// Function to display filler text
function displayFillerText() {
  const fillerText = "Hi! I'm your Gmail assistant. I don't interact with this page, but if you open an email thread I can summarize the contents, help you respond to the thread, and provide helpful ideas for you.";
  console.log('Displaying filler text');
  displayContent(fillerText, true);
}

// Initialize the content script
function init() {
  console.log('Initializing content script - Start');

  // Display the initial message
  displayContent("Waiting for an email to be opened...");

  // Set up a more efficient check for changes
  let lastUrl = location.href;
  let lastEmailContent = '';
  let retryCount = 0;
  const MAX_RETRIES = 5;

  const checkForChanges = () => {
    console.log('Checking for changes...');
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('URL changed to:', currentUrl);
      handleEmailContent();
    } else if (isEmailThreadOpen()) {
      const currentEmailContent = extractEmailContent();
      if (currentEmailContent !== lastEmailContent) {
        lastEmailContent = currentEmailContent;
        console.log('Email content changed, length:', currentEmailContent.length);
        handleEmailContent();
      }
    }
  };

  // Use requestAnimationFrame for smoother performance
  const scheduleCheck = () => {
    requestAnimationFrame(() => {
      try {
        checkForChanges();
        retryCount = 0; // Reset retry count on successful execution
      } catch (error) {
        console.error('Error in checkForChanges:', error);
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
        }
        if (error.message.includes('Extension context invalidated') || chrome.runtime.lastError) {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Retrying checkForChanges (${retryCount}/${MAX_RETRIES})`);
            setTimeout(scheduleCheck, 1000 * retryCount); // Exponential backoff
            return;
          } else {
            console.error('Max retries reached. Attempting to reinitialize content script.');
            setTimeout(() => {
              console.log('Reinitializing content script...');
              init();
            }, 5000); // Attempt to reinitialize after 5 seconds
            return;
          }
        }
      }
      setTimeout(scheduleCheck, 1000); // Check every second
    });
  };

  scheduleCheck();

  // Listen for extension context changes
  chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed or updated. Reinitializing...');
    init();
  });

  console.log('Robust change detection set up - Initialization complete');
}

// Run the initialization
console.log('Starting initialization');
init();

console.log('Gmail Agent content script loaded - Script end');
