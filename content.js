// Gmail Agent Content Script
// This script is responsible for interacting with the Gmail interface,
// extracting email content, and displaying summaries to the user.

console.log('Gmail Agent content script loaded - Script start');
console.log('Current URL:', window.location.href);
console.log('Document readyState:', document.readyState);

// Function to create and display the summary container
// This function creates or retrieves the container for displaying email summaries
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

    // Add user controls for toggling and refreshing the summary
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

// Function to toggle the visibility of the summary container
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

// Function to display the summary or error message in the summary container
// This function is called by handleEmailContent to update the UI with new content
function displayContent(content, isError = false) {
  console.log('Displaying content - Start');
  console.log('Is error:', isError);
  console.log('Content to display:', content);

  const summaryContainer = createSummaryContainer();
  console.log('Summary container created/retrieved');

  // Clear previous content
  console.log('Clearing previous content');
  while (summaryContainer.firstChild) {
    summaryContainer.removeChild(summaryContainer.firstChild);
  }

  // Create and append header
  console.log('Creating header');
  const header = document.createElement('h3');
  header.textContent = isError ? 'Error' : 'Email Summary';
  header.style.color = isError ? 'red' : 'black';
  summaryContainer.appendChild(header);

  // Create and append paragraph
  console.log('Creating paragraph');
  const paragraph = document.createElement('p');
  paragraph.textContent = content;
  paragraph.style.color = isError ? 'red' : 'black';
  summaryContainer.appendChild(paragraph);

  console.log('Content updated:', content);
  console.log('Displaying content - End');
}

// Function to extract email content from the current Gmail view
// This function is called by handleEmailContent to get the email text for summarization
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

// Function to check if an email thread is currently open in Gmail
// This function is used by handleEmailContent and handleUserInteraction
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

// Function to handle email content extraction and summarization
// This is the main function that orchestrates the summarization process
function handleEmailContent() {
  console.log('Handling email content - Start');

  if (isEmailThreadOpen()) {
    console.log('Email thread is open - Extracting content');
    const emailContent = extractEmailContent();
    console.log('Extracted email content:', emailContent.substring(0, 100) + '...'); // Log first 100 characters

    if (emailContent.trim()) {
      console.log('Email content extracted successfully. Length:', emailContent.length);
      displayContent('Summarizing email... Please wait.'); // Show loading message

      // Function to send message to background script with retry mechanism
      const sendMessageWithRetry = (retries = 3) => {
        console.log(`Sending message to background script. Retries left: ${retries}`);
        console.log('Message payload:', { action: 'summarizeEmail', content: emailContent.substring(0, 100) + '...' });

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

          console.log('Received response from background script:', JSON.stringify(response, null, 2));
          if (response && response.summary) {
            console.log('Summary received successfully. Length:', response.summary.length);
            console.log('Summary preview:', response.summary.substring(0, 100) + '...');
            displayContent(response.summary);
          } else if (response && response.error) {
            console.error('Error received from background script:', response.error);
            displayContent(`Error: ${response.error}. Please try again.`, true);
          } else {
            console.error('Unexpected response from background script:', JSON.stringify(response, null, 2));
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

// Function to display filler text when no email is open
// This function is called by init to show an initial message
function displayFillerText() {
  const fillerText = "Hi! I'm your Gmail assistant. I don't interact with this page, but if you open an email thread I can summarize the contents, help you respond to the thread, and provide helpful ideas for you.";
  console.log('Displaying filler text');
  displayContent(fillerText, true);
}

// Initialize the content script
// This function sets up event listeners and observers to detect changes in Gmail
function init() {
  console.log('Initializing content script - Start');

  // Display the initial message
  displayContent("Waiting for an email to be opened...");

  let lastUrl = location.href;
  let lastEmailContent = '';

  // Function to handle URL changes
  const handleUrlChange = (newUrl) => {
    console.log('URL changed to:', newUrl);
    handleEmailContent();
  };

  // Function to handle user interactions
  const handleUserInteraction = () => {
    if (isEmailThreadOpen()) {
      const currentEmailContent = extractEmailContent();
      if (currentEmailContent !== lastEmailContent) {
        lastEmailContent = currentEmailContent;
        console.log('Email content changed, length:', currentEmailContent.length);
        handleEmailContent();
      }
    }
  };

  // Set up MutationObserver to detect DOM changes
  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'subtree') {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          handleUrlChange(currentUrl);
        }
      }
    }
  });

  // Configure and start the observer
  const observerConfig = { childList: true, subtree: true };
  observer.observe(document.body, observerConfig);

  // Listen for user interactions
  document.addEventListener('click', handleUserInteraction);
  document.addEventListener('keyup', handleUserInteraction);

  console.log('New change detection logic set up - Initialization complete');
}

// Run the initialization
console.log('Starting initialization');
init();

console.log('Gmail Agent content script loaded - Script end');
