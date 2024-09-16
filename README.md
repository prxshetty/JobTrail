# Job Trail

Job Trail is a Chrome extension that automatically categorizes Gmail emails related to job applications based on their content. It uses Google's Cloud Console and GmailAPI to access the emails and their respective body content. It uses OpenAI's GPT model to analyze emails and apply labels, helping job seekers organize their application process more efficiently by categorizing them and labelling them.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Features](#features)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/job-trail.git
   ```
2. Navigate to the project directory:
   ```
   cd job-trail
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Build the extension:
   ```
   npm run build
   ```
5. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder in your project directory

## Usage

1. Click on the Job Trail icon in your Chrome toolbar to open the popup.
2. Select the processing mode:
   - First Page (Free Version): Processes the first page of emails in your inbox
   - Range of Emails: Allows you to specify a range of emails to process
3. Click "Process Emails" to start categorizing your emails.
4. The extension will automatically apply labels to your emails based on their content.

## Features

- Automatic email categorization using AI (powered by OpenAI's GPT model)
- Categorizes emails into:
  - Rejection
  - Acceptance
  - Interview
  - Assessment
  - Applicant
  - Job Alerts
  - Uncategorized
- Processes emails in real-time as they arrive
- Options to process the first page of emails or a specific range
- Popup interface to control email processing
- Background processing with status updates

## Screenshots



## Contributing

Contributions are welcome! Please follow these steps to contribute:

## TO DO

- Add color coding to the labels from pop-up 
- Add an tree map view of the companies the user applied, rejection, acceptance, interview, etc.