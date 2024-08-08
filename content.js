// Gmail Agent Content Script

// Function to detect when an email thread is opened
function detectEmailThreadOpened() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        const addedNodes = mutation.addedNodes;
        for (let node of addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('adn')) {
            // Email thread opened
            handleEmailThreadOpened(node);
          }
        }
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Function to handle when an email thread is opened
function handleEmailThreadOpened(emailNode) {
  const emailContent = extractEmailContent(emailNode);
  chrome.runtime.sendMessage({ action: 'summarizeEmail', content: emailContent }, (response) => {
    if (response && response.summary) {
      displaySummary(response.summary);
    }
  });
}

// Function to extract email content
function extractEmailContent(emailNode) {
  // This is a simplified extraction. You may need to adjust this based on Gmail's structure
  return emailNode.innerText;
}

// Function to display the summary
function displaySummary(summary) {
  let summaryContainer = document.getElementById('gmail-agent-summary');
  if (!summaryContainer) {
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
  }

  summaryContainer.innerHTML = `
    <h3>Email Summary</h3>
    <p>${summary}</p>
  `;
}

// Initialize the content script
function init() {
  detectEmailThreadOpened();
}

// Run the initialization
init();
