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

  const focusedContent = emailContent
    .replace(/^(From:|To:|Cc:|Bcc:|Date:|Subject:).*\n/gm, '')
    .replace(/\n-- \n[\s\S]*$/, '')
    .replace(/\n>{1,}[\s\S]*$/, '')
    .replace(/^Advertisement:[\s\S]*?(?=\n\n|\n$)/gm, '')
    .replace(/\n.*(?:Disclaimer|Copyright|All rights reserved).*$/gis, '')
    .replace(/Top jobs looking for your skills[\s\S]*$/, '') // Remove job listings at the end
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .join('\n')
    .trim()
    .replace(/\s+/g, ' ');

  console.log('Focused Content:', focusedContent);

  const prompt = `Analyze the following email subject and content:
  
  Subject: "${subject}"
  
  Simplified Content: "${focusedContent}"

  Determine if this email is directly related to the recipient's job application process. 
  If it is job-related, categorize it into one of the following: Rejection, Acceptance, Interview, Assessment, Applicant, Job Alerts, N. 
  
  Use these guidelines:
- "Rejection" for emails indicating an application was not successful. This takes precedence over all other categories, even if the email mentions the original application or job role. Look for phrases like "unfortunately", "we will not be moving forward", "regret to inform you", "application was not successful".
  - "Acceptance" for job offers or positive responses to applications. Look for phrases like "congratulations", "we are pleased to offer", "welcome to the team".
  - "Interview" ONLY for job interview invitations or scheduling related to a job application. The email must explicitly mention a job interview to the sender(NOT podcast interviews, media interviews, customer interviews).
  - "Assessment" for requests to complete tests or assignments as part of a job application process.
  - "Applicant" for emails where the recipient is applying for a job or inquiring about job opportunities.
  - "Job Alerts" for notifications about job openings, job alerts, job listings.
  - "N" for other job-related emails that don't fit the above categories.
  
Important Instructions:

- Focus solely on the main message of the email.Ignore any additional job listings, promotions, or advertisements when determining the category.

- Prioritize rejection indicators** over all other content. If phrases like "unfortunately" or "we will not be moving forward" are present, categorize the email as "Rejection".

- Do not be influenced by any positive or neutral language that comes after the rejection message.

  Some emails may contain multiple job listings. Only consider the email content that is directly related to the recipient's job application process.

  If the email is not directly related to the recipient's job application process, respond with "Not Job-Related". 
  
  Consider the context carefully. Emails about orders, blogs, general newsletters, or non-job-related correspondence are likely "Not Job-Related".
  
  Prioritize the main content of the email over any additional job listings or advertisements that may be included. If an email contains a rejection statement, categorize it as "Rejection" even if it includes job listings or follow-up job alerts.

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