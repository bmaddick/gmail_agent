// Gmail Agent Content Script

console.log('Gmail Agent content script loaded - Script start');
console.log('Current URL:', window.location.href);
console.log('Document readyState:', document.readyState);
console.log('Window location:', window.location);
console.log('Document title:', document.title);
console.log('Gmail interface elements:', {
  inbox: !!document.querySelector('.nH.bkK'),
  emailList: !!document.querySelector('.AO'),
  emailView: !!document.querySelector('.nH.bkK.nn')
});

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
  console.log('Content updated:', content);
}

// Function to extract email content
function extractEmailContent() {
  console.log('Extracting email content');
  const selectors = ['.a3s.aiL', '.gs', '.gE.iv.gt', '.ii.gt'];
  let emailBody;

  for (const selector of selectors) {
    emailBody = document.querySelector(selector);
    if (emailBody) {
      console.log(`Email body found with selector: ${selector}`);
      return emailBody.innerText;
    }
  }

  console.log('Email body not found with any selector');
  return '';
}

// Function to check if an email thread is open
function isEmailThreadOpen() {
  console.log('Checking if email thread is open');
  const url = window.location.href;
  const isThreadView = url.includes('#inbox/') || url.includes('#all/');

  // Updated selectors for Gmail's current DOM structure
  const emailSubject = document.querySelector('.hP');
  const emailSender = document.querySelector('.gD, .go');
  const emailBody = document.querySelector('.a3s.aiL, .gs');

  const isOpen = isThreadView && !!(emailSubject && emailSender && emailBody);

  console.log('Email thread open:', isOpen);
  console.log('URL:', url);
  console.log('Is thread view:', isThreadView);
  console.log('Email subject:', emailSubject ? emailSubject.textContent.trim() : 'Not found');
  console.log('Email sender:', emailSender ? emailSender.textContent.trim() : 'Not found');
  console.log('Email body present:', !!emailBody);

  // Additional logging for debugging
  if (!isOpen) {
    console.log('Missing elements:', {
      subject: !emailSubject,
      sender: !emailSender,
      body: !emailBody
    });
  }

  return isOpen;
}

// Function to handle email content
function handleEmailContent() {
  console.log('Handling email content');
  displayPlaceholderText(); // Always display placeholder text

  if (isEmailThreadOpen()) {
    console.log('Email thread is open');
    const emailContent = extractEmailContent();
    if (emailContent.trim()) {
      console.log('Email content extracted, length:', emailContent.length);
      chrome.runtime.sendMessage({ action: 'summarizeEmail', content: emailContent }, (response) => {
        if (response && response.summary) {
          console.log('Summary received from background script, length:', response.summary.length);
          displayContent(response.summary);
        } else {
          console.error('No summary received or error occurred');
          displayContent('Failed to generate summary. Please try again.');
        }
      });
    } else {
      console.warn('No email content extracted');
      displayContent('Unable to extract email content. Please try reopening the email.');
    }
  } else {
    console.log('Email thread is not open');
    displayFillerText();
  }
}

// Function to display placeholder text
function displayPlaceholderText() {
  const placeholderText = "this is where the summary and suggested response will be";
  console.log('Displaying placeholder text:', placeholderText);
  displayContent(placeholderText, false);
}

// Function to display filler text
function displayFillerText() {
  const fillerText = "Hi! I'm your Gmail assistant. I don't interact with this page, but if you open an email thread I can summarize the contents, help you respond to the thread, and provide helpful ideas for you.";
  console.log('Displaying filler text');
  displayContent(fillerText, true);
}

// Initialize the content script
function init() {
  console.log('Initializing content script');

  // Display the placeholder text immediately
  displayPlaceholderText();

  // Function to check for changes and update content
  function checkAndUpdate() {
    console.log('Checking for changes and updating content');
    handleEmailContent();
  }

  // Set up periodic checks
  const updateInterval = setInterval(checkAndUpdate, 1000); // Check every second

  // Listen for URL changes
  let lastUrl = location.href;
  const urlCheckInterval = setInterval(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('URL changed:', currentUrl);
      checkAndUpdate();
    }
  }, 500); // Check every 500ms for URL changes

  // Use MutationObserver to detect changes in the Gmail interface
  const gmailObserver = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'subtree') {
        console.log('Gmail interface changed, updating content');
        checkAndUpdate();
        break; // Only need to update once per batch of mutations
      }
    }
  });

  // Observe the entire body for changes
  gmailObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('Gmail interface observer set up');

  // Clean up function
  function cleanup() {
    clearInterval(updateInterval);
    clearInterval(urlCheckInterval);
    gmailObserver.disconnect();
    console.log('Content script cleanup performed');
  }

  // Listen for extension unload
  chrome.runtime.onSuspend.addListener(cleanup);

  // Initial check for email content
  checkAndUpdate();
}

// Run the initialization
console.log('Starting initialization');
init();

console.log('Gmail Agent content script loaded - Script end');
