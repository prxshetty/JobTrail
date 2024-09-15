/******/ (() => { // webpackBootstrap
console.log('Background script loaded');

console.log('API Key:', OPENAI_API_KEY ? 'Present' : 'Missing');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Trail Extension Installed');
  // Store the API key in chrome.storage
  chrome.storage.local.set({ OPENAI_API_KEY: OPENAI_API_KEY }, function() {
    console.log('API Key stored in chrome.storage');
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  if (request.action === 'categorizeEmail') {
    console.log('Received categorizeEmail request:', request.content);
    const emailContent = request.content;

    categorizeEmail(emailContent)
      .then((category) => {
        console.log('Email categorized as:', category);
        sendResponse({ category });
      })
      .catch((error) => {
        console.error('Error categorizing email:', error);
        sendResponse({ category: 'Uncategorized' });
      });

    return true;
  }
});

async function categorizeEmail(emailContent) {
  console.log('Categorizing email...');
  
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key is missing');
    return 'Uncategorized';
  }

  console.log('API Key present, making API call...');
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  const prompt = `Determine the category of the following email content: "${emailContent}". Categories are: Rejection, Acceptance, Interview, Assessment, Other. Only respond with the category name.`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 5,
        n: 1,
        stop: null,
        temperature: 0
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const category = data.choices[0].message.content.trim();
    return category;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return 'Uncategorized';
  }
}
/******/ })()
;