console.log('Background script loaded');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log('API Key:', OPENAI_API_KEY ? 'Present' : 'Missing');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Trail Extension Installed');
  chrome.storage.local.set({ OPENAI_API_KEY: OPENAI_API_KEY }, function() {
    console.log('API Key stored in chrome.storage');
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  if (request.action === 'categorizeEmail') {
    console.log('Received categorizeEmail request:', request.content);
    const emailContent = request.content;
    const subject = request.subject;

    categorizeEmail(emailContent, subject)
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

async function categorizeEmail(emailContent, subject) {
  console.log('Categorizing email...');
  console.log('Original Subject:', subject);
  console.log('Original Content:', emailContent);
  
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key is missing');
    return 'Uncategorized';
  }

  console.log('API Key present, making API call...');
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  // Simplify and focus the email content
  const focusedContent = emailContent
    .replace(/^(From:|To:|Cc:|Bcc:|Date:|Subject:).*\n/gm, '')
    .replace(/\n-- \n[\s\S]*$/, '') // Remove signature
    .replace(/\n>{2,}[\s\S]*$/, '') // Remove quoted text
    .split('\n')
    .filter(line => line.trim() !== '')
    .slice(0, 3)
    .join('\n')
    .trim();

  console.log('Focused Content:', focusedContent);

  const prompt = `Analyze the following email subject and the first 2-3 lines of the email content.
  Pay special attention to the subject and key phrases within these initial lines, as they often contain crucial information:
  
  Subject: "${subject}"
  
  First 2-3 lines: "${focusedContent}"
  
  Determine if this email is directly related to the recipient's job application process. 
  If it is job-related, categorize it into one of the following: Rejection, Acceptance, Interview, Assessment, Applicant, Job Alerts, N. 
  
  Use these guidelines:
  - "Rejection" for emails indicating an application was not successful. Look for phrases like "we will not be moving forward", "unfortunately", "regret to inform you".
  - "Acceptance" for job offers or positive responses to applications. Look for phrases like "congratulations", "we are pleased to offer", "welcome to the team".
  - "Interview" for interview invitations or scheduling
  - "Assessment" for requests to complete tests or assignments
  - "Applicant" for emails where the recipient is applying for a job or inquiring about job opportunities
  - "Job Alerts" for notifications about job openings
  - "N" for other job-related emails that don't fit the above categories
  
  If it is not directly related to the recipient's job application process, respond with "Not Job-Related". 
  
  Respond with only the category name.`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 15,
        n: 1,
        stop: null,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const category = data.choices[0].message.content.trim();
    console.log('Categorized as:', category);
    return category;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return 'Uncategorized';
  }
}