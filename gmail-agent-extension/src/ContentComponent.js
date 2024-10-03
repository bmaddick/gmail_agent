/* global chrome */
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Button, Text, VStack } from '@chakra-ui/react';

const ContentComponent = () => {
  const [summary, setSummary] = useState('');
  const [isError, setIsError] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastEmailContent, setLastEmailContent] = useState('');

  const extractEmailContent = useCallback(() => {
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
  }, []);

  const isEmailThreadOpen = useCallback(() => {
    console.log('Checking if email thread is open');
    const url = window.location.href;
    const isThreadView = url.includes('#inbox/') || url.includes('#all/');
    const emailSubject = document.querySelector('h2.hP');
    const emailSender = document.querySelector('.gD');
    const emailBody = document.querySelector('.a3s.aiL');
    const isOpen = isThreadView && !!(emailSubject && emailSender && emailBody);
    console.log('Email thread open:', isOpen);
    return isOpen;
  }, []);

  const handleEmailContent = useCallback(() => {
    console.log('Handling email content - Start');

    if (isEmailThreadOpen()) {
      console.log('Email thread is open - Extracting content');
      const emailContent = extractEmailContent();
      console.log('Extracted email content:', emailContent.substring(0, 100) + '...');

      if (emailContent.trim()) {
        console.log('Email content extracted successfully. Length:', emailContent.length);
        setSummary('Summarizing email... Please wait.');
        setIsError(false);

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
                setSummary('Failed to communicate with the extension. Please refresh the page and try again.');
                setIsError(true);
              }
              return;
            }

            console.log('Received response from background script:', JSON.stringify(response, null, 2));
            if (response && response.summary) {
              console.log('Summary received successfully. Length:', response.summary.length);
              console.log('Summary preview:', response.summary.substring(0, 100) + '...');
              setSummary(response.summary);
              setIsError(false);
            } else if (response && response.error) {
              console.error('Error received from background script:', response.error);
              setSummary(`Error: ${response.error}. Please try again.`);
              setIsError(true);
            } else {
              console.error('Unexpected response from background script:', JSON.stringify(response, null, 2));
              setSummary('Unexpected error occurred. Please try again or refresh the page.');
              setIsError(true);
            }
          });
        };

        sendMessageWithRetry();
      } else {
        console.warn('No email content extracted');
        setSummary('No email content found. Please make sure an email is fully loaded.');
        setIsError(true);
      }
    } else {
      console.log('Email thread is not open');
      setSummary('Open an email to see its summary.');
      setIsError(true);
    }

    console.log('Handling email content - End');
  }, [extractEmailContent, isEmailThreadOpen, setSummary, setIsError]);

  const handleUrlChange = useCallback((newUrl) => {
    console.log('URL changed to:', newUrl);
    handleEmailContent();
  }, [handleEmailContent]);

  const handleUserInteraction = useCallback(() => {
    if (isEmailThreadOpen()) {
      const currentEmailContent = extractEmailContent();
      if (currentEmailContent !== lastEmailContent) {
        console.log('Email content changed, updating summary');
        handleEmailContent();
        setLastEmailContent(currentEmailContent);
      }
    }
  }, [isEmailThreadOpen, extractEmailContent, lastEmailContent, handleEmailContent, setLastEmailContent]);

  useEffect(() => {
    console.log('Gmail Agent content script loaded - Script start');
    console.log('Current URL:', window.location.href);
    console.log('Document readyState:', document.readyState);

    console.log('Initializing content script - Start');

    setSummary("Waiting for an email to be opened...");
    setIsError(true);

    let lastUrl = window.location.href;

    const observer = new MutationObserver((mutations) => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        handleUrlChange(lastUrl);
      }
      handleUserInteraction();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('click', handleUserInteraction);

    console.log('Initializing content script - End');

    return () => {
      // Cleanup code if needed
      observer.disconnect();
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [handleEmailContent, lastEmailContent, isEmailThreadOpen, extractEmailContent, handleUrlChange, handleUserInteraction, setSummary, setIsError]);

  const toggleSummary = () => {
    setIsVisible(!isVisible);
  };

  return (
    <Box
      position="fixed"
      top="60px"
      right="20px"
      width="300px"
      maxHeight={isVisible ? "calc(100vh - 80px)" : "30px"}
      backgroundColor="white"
      color="black"
      border="1px solid #ccc"
      borderRadius="8px"
      padding="16px"
      overflowY="auto"
      zIndex={1000}
      fontFamily="Arial, sans-serif"
      boxShadow="0 2px 10px rgba(0,0,0,0.1)"
    >
      <VStack spacing={4} align="stretch">
        <Button onClick={toggleSummary}>
          {isVisible ? 'Hide Summary' : 'Show Summary'}
        </Button>
        {isVisible && (
          <>
            <Text as="h3" color={isError ? 'red' : 'black'}>
              {isError ? 'Error' : 'Email Summary'}
            </Text>
            <Text color={isError ? 'red' : 'black'}>{summary}</Text>
            <Button onClick={handleEmailContent}>Refresh</Button>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default ContentComponent;
