import React, { useEffect } from 'react';
import { useToast } from '@chakra-ui/react';

const BackgroundComponent = () => {
  const toast = useToast();

  // Function to handle messages from the content script
  const handleMessage = (request, sender, sendResponse) => {
    if (request.action === 'summarizeEmail') {
      console.log('Received summarizeEmail request from tab ' + sender.tab.id);
      if (!request.content) {
        console.error('No email content provided in the request');
        sendResponse({ error: 'No email content provided' });
        return true;
      }
      // Call the summarizeEmail function and handle the response
      summarizeEmail(request.content)
        .then(summary => {
          console.log('Summarization successful. Summary length: ' + summary.length);
          sendResponse({ summary: summary });
        })
        .catch(error => {
          console.error('Error summarizing email: ' + error.message);
          sendResponse({ error: 'Failed to summarize email: ' + error.message });
        });
      return true; // Indicates that the response is sent asynchronously
    } else {
      console.error('Unknown action received: ' + request.action);
      sendResponse({ error: 'Unknown action' });
    }
  };

  // Function to communicate with the Python service
  const summarizeEmail = async (content) => {
    console.log('Attempting to summarize email with content length: ' + content.length);
    try {
      console.log('Sending request to summarization service');
      // Send a POST request to the local Python service
      const response = await fetch('http://localhost:5000/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_content: content }),
      });

      console.log('Received response from summarization service: ' + response.status);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      if (!data.summary) {
        throw new Error('Summary not found in response data');
      }
      console.log('Successfully parsed response data');
      console.log('Summary received:', data.summary);
      return data.summary;
    } catch (error) {
      // Detailed error handling and logging
      console.error('Detailed error in summarizeEmail: ' + error);
      console.error('Error stack: ' + error.stack);
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to the summarization service. Please check if the service is running.');
      } else if (error.message.includes('NetworkError')) {
        throw new Error('Network error occurred. Please check your internet connection.');
      } else if (error.message.includes('TimeoutError')) {
        throw new Error('Request timed out. The summarization service might be overloaded or unresponsive.');
      }
      throw new Error('Failed to summarize email: ' + error.message);
    }
  };

  // Test case function with fake email content
  const testSummarizeEmail = () => {
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
        toast({
          title: 'Test Summary',
          description: summary,
          status: 'success',
          duration: 9000,
          isClosable: true,
        });
      })
      .catch(error => {
        console.error('Test case error:', error);
        toast({
          title: 'Test Error',
          description: error.message,
          status: 'error',
          duration: 9000,
          isClosable: true,
        });
      });
  };

  useEffect(() => {
    // Initialize the background script
    console.log('Gmail Agent background script initializing...');

    // Set up message listener
    chrome.runtime.onMessage.addListener(handleMessage);

    // Implement a periodic health check
    const healthCheckInterval = setInterval(() => {
      try {
        // Perform a simple operation to check if the script is responsive
        chrome.runtime.getPlatformInfo((info) => {
          console.log('Background script health check: OK');
        });
      } catch (error) {
        console.error('Health check failed: ' + error.message);
      }
    }, 60000); // Run every minute

    console.log('Gmail Agent background script initialized successfully');

    // Run the test case
    testSummarizeEmail();

    // Cleanup function
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      clearInterval(healthCheckInterval);
    };
  }, []);

  return null; // This component doesn't render anything visible
};

export default BackgroundComponent;
