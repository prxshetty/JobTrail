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
    const sender = request.sender; // Added this line

    categorizeEmail(emailContent, subject, sender) // Added sender parameter
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

async function categorizeEmail(emailContent, subject, sender) { // Added sender parameter
  console.log('Categorizing email...');
  console.log('Original Subject:', subject);
  console.log('Original Sender:', sender); // Added this line
  console.log('Original Content:', emailContent);
  
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key is missing');
    return 'Uncategorized';
  }

  console.log('API Key present, making API call...');
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  const focusedContent = emailContent
    .replace(/^(From:|To:|Cc:|Bcc:|Date:|Subject:).*\n/gm, '')
    .replace(/\n-- \n[\s\S]*$/, '')
    .replace(/\n>{1,}[\s\S]*$/, '')
    .replace(/^Advertisement:[\s\S]*?(?=\n\n|\n$)/gm, '')
    .replace(/\n.*(?:Disclaimer|Copyright|All rights reserved).*$/gis, '')
    .replace(/Top jobs looking for your skills[\s\S]*$/, '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .join('\n')
    .trim()
    .replace(/\s+/g, ' ');

  console.log('Focused Content (full message):');
  console.log(focusedContent);
  console.log('Focused Content Length:', focusedContent.length);

  const prompt = `Analyze the following email subject, sender, and content:
  
  Subject: "${subject}"
  Sender: "${sender}"
  
  Simplified Content: "${focusedContent}"

  Determine if this email is directly related to the recipient's job application process. 
  If it is job-related, categorize it into one of the following: Rejection, Acceptance, Interview, Assessment, Applicant, Job Alerts, N. 
  
  Use these guidelines in order of priority:
  1. If the sender is LinkedIn and the subject contains "Your application", categorize as:
     - "Rejection" if the content indicates the application was unsuccessful (e.g., "unfortunately", "we will not be moving forward", "regret to inform you")
     - "Acceptance" if the content indicates a positive outcome (e.g., "congratulations", "we are pleased to offer", "next steps")
     - "Applicant" if the content is a status update that's neither a clear rejection nor acceptance
  2. For other emails:
     - "Rejection" for emails indicating an application was not successful. This takes highest precedence.
     - "Acceptance" for job offers or positive responses to applications.
     - "Interview" ONLY for job interview invitations or scheduling related to a job application. The email must explicitly mention a job interview for the recipient (NOT podcast interviews, media interviews, customer interviews).
     - "Assessment" for requests to complete tests or assignments as part of a job application process.
     - "Applicant" for emails where the recipient is applying for a job, inquiring about job opportunities, or receiving general updates about their application status.
     - "Job Alerts" for notifications about new job openings or general job-related newsletters.
     - "N" for other job-related emails that don't fit the above categories.
  3. "Not Job-Related" for emails that are not related to job applications, interviews, or career opportunities.

  Important notes:
  - Pay special attention to emails from LinkedIn or other job platforms. These often contain status updates about applications.
  - If an email contains both application status information and other job listings or alerts, prioritize the application status.
  - Consider the sender's email address or name. Emails from known job boards, recruiting agencies, or company HR departments are likely job-related.
  - Emails about orders, blogs, general newsletters, or non-job-related correspondence should be categorized as "Not Job-Related".

  Prioritize the main content of the email over any additional job listings or advertisements that may be included.
  
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