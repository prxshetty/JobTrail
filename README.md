# JobTrail

> **Note:**
An alternative implementation is available in the `gcp` branch, which uses Google Cloud Platform services instead of local libraries for more precision. 
Check out the `gcp` branch for a cloud-based implementation, the outputs and its code.

## Overview
Job Trail is a Chrome extension designed to automatically categorize and track job application-related emails in Gmail. It helps job seekers maintain better organization of their job search process by automatically labeling emails based on their content (rejections, acceptances, interviews, etc.).

## Categories
Emails are automatically categorized into the following types:

- Rejection (🔴) - Application unsuccessful notifications
- Acceptance (🟢) - Job offers and positive responses
- Interview (🔵) - Interview invitations and scheduling
- Assessment (🟠) - Test or assignment requests
- Applicant (�pink) - Application status updates
- Job Alerts (🔆) - New job notifications
- N (🟣) - Other job-related emails
- Not Job-Related (⚫) - Non job-search emails

## Project Versions
1. OpenAI Version (Current Branch)
This version utilizes:
  
  OpenAI's GPT-4 API for email content analysis
  Chrome Extensions Manifest V3
  JavaScript (ES6+)
  Chrome Storage API
  Chrome Runtime Messaging

2. Google Cloud Platform Version (GCP Branch)
  An alternative implementation is available in the GCP branch, which uses Google Cloud Platform services instead of OpenAI. Check out the GCP branch for a cloud-based implementation.

## Technical Implementation

- Background Script (background.js):
    Manages OpenAI API communication
    Handles email categorization logic
    Stores API credentials securely
  
- Content Script (contentScript.js):
    Monitors Gmail interface for new emails
    Injects visual labels into the UI
    Communicates with background script
    
  
- Manifest (manifest.json):
    Defines extension permissions and structure
    Configures content script injection
    Sets up background worker
  
  

## Technologies Used

- OpenAI API: Provides advanced natural language processing for accurate email categorization
- Chrome Extensions API: Enables seamless integration with Gmail
- Chrome Storage: Securely stores API keys and user preferences
- JavaScript: Powers the core functionality and DOM manipulation
- CSS: Styles the visual labels and UI elements

## Setup and Installation

- Clone the repository
- Set up your OpenAI API key in the environment variables
- Load the extension in Chrome:

- Navigate to chrome://extensions/
- Enable "Developer mode"
- Click "Load unpacked"
- Select the extension directory



## Configuration
The extension requires an OpenAI API key to function. You can set this up by:

  - Creating an account at OpenAI
  - Generating an API key
  - Adding it to your environment variables

## Privacy & Security

All email processing is done locally
Only email content is sent to OpenAI for categorization
No emails are stored or cached
API keys are securely stored in Chrome's storage system
