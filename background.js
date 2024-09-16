    console.log('Background script loaded');

    let accessToken = null;

    // Function to get the OAuth 2.0 access token
    async function getAccessToken(forceRefresh = false) {
        if (accessToken && !forceRefresh) {
            return accessToken;
        }

        // Clear any existing token
        await chrome.storage.local.remove('accessToken');
        accessToken = null;

        return new Promise((resolve, reject) => {
            const manifest = chrome.runtime.getManifest();
            const clientId = manifest.oauth2.client_id;
            const scopes = manifest.oauth2.scopes;
            const redirectUrl = chrome.identity.getRedirectURL();

            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.append('client_id', clientId);
            authUrl.searchParams.append('response_type', 'token');
            authUrl.searchParams.append('redirect_uri', redirectUrl);
            authUrl.searchParams.append('scope', scopes.join(' '));
            authUrl.searchParams.append('prompt', 'consent');

            chrome.identity.launchWebAuthFlow({
                url: authUrl.toString(),
                interactive: true
            }, async (responseUrl) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                const url = new URL(responseUrl);
                const params = new URLSearchParams(url.hash.slice(1));
                const token = params.get('access_token');
                if (!token) {
                    reject(new Error('No token found in response'));
                    return;
                }
                accessToken = token;
                await chrome.storage.local.set({ accessToken: token });
                resolve(token);
            });
        });
    }

    // Function to make authenticated requests to Gmail API
    async function callGmailApi(method, path, params, body) {
        try {
            const token = await getAccessToken();
            let url = `https://www.googleapis.com/gmail/v1/users/me/${path}`;

            if (params) {
                const queryParams = new URLSearchParams(params).toString();
                url += `?${queryParams}`;
            }

            console.log(`Calling Gmail API: ${method} ${url}`);

            const response = await fetch(url, {
                method: method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: body ? JSON.stringify(body) : null
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.log('Token expired. Refreshing...');
                    await getAccessToken(true); // Force token refresh
                    return callGmailApi(method, path, params, body); // Retry the call
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Gmail API response:', data);
            return data;
        } catch (error) {
            console.error('Error in callGmailApi:', error);
            throw error;
        }
    }

    // Function to get the full content of an email
    async function getEmail(messageId) {
        return callGmailApi('GET', `messages/${messageId}`, { format: 'full' }, null);
    }

    // Function to extract the email body
    function getEmailBody(payload) {
        console.log('Extracting email body from payload:', payload);
        let body = '';

        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain') {
                    body += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                } else if (part.parts) {
                    body += getEmailBody(part);
                }
            }
        } else if (payload.body && payload.body.data) {
            body = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else {
            console.error('Unable to extract email body from payload:', payload);
        }

        console.log('Extracted email body:', body.substring(0, 100) + '...');
        return body;
    }

    // Function to create a label if it doesn't exist
    async function createLabelIfNotExists(labelName) {
        try {
            console.log(`Attempting to create/get label: ${labelName}`);
            const response = await callGmailApi('GET', 'labels', null, null);
            console.log('Existing labels:', response.labels);
            const labels = response.labels;
            const existingLabel = labels.find(label => label.name === labelName);
            
            if (existingLabel) {
                console.log(`Existing label found: ${labelName}, ID: ${existingLabel.id}`);
                return existingLabel.id;
            } else {
                const newLabel = await callGmailApi('POST', 'labels', null, {
                    name: labelName,
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show'
                });
                return newLabel.id;
            }
        } catch (error) {
            console.error(`Error creating/getting label ${labelName}:`, error);
            throw error;
        }
    }

    // Function to apply a label to an email
    async function applyLabelToEmail(messageId, labelId) {
        try {
            await callGmailApi('POST', `messages/${messageId}/modify`, null, {
                addLabelIds: [labelId]
            });
            console.log(`Label applied to email ${messageId}`);
            // Increment the labeled count and update the popup
            labeledCount++;
            chrome.runtime.sendMessage({action: 'updateCounter', count: labeledCount});
        } catch (error) {
            console.error('Error applying label to email:', error);
            throw error;
        }
    }

    // Update the categorizeEmail function to create labels and apply them
    async function categorizeEmail(emailContent, subject, sender, messageId) {
        console.log('Categorizing email:', { subject, sender, messageId });
        
        if (typeof emailContent !== 'string') {
            emailContent = String(emailContent);
        }
        
        try {
            console.log('Calling getOpenAICategory');
            const category = await getOpenAICategory(emailContent, subject, sender);
            console.log('OpenAI category:', category);
            
            console.log('Creating label if not exists:', category);
            const labelId = await createLabelIfNotExists(category);
            console.log('Label ID:', labelId);
            
            console.log('Applying label to email');
            await applyLabelToEmail(messageId, labelId);
            console.log('Label applied successfully');
            
            return category;
        } catch (error) {
            console.error('Error categorizing and labeling email:', error);
            return 'Uncategorized';
        }
    }

    async function getOpenAICategory(email, subject, sender) {
        const prompt = `
            Categorize the following email into one of these categories without quotes:
            - Rejection for emails indicating an application was not successful. This takes highest precedence.
            - Acceptance for job offers or positive responses to applications.
            - Interview ONLY for job interview invitations or scheduling related to a job application.
            - Assessment for requests to complete tests or assignments as part of a job application process.
            - Applicant for emails where the recipient is applying for a job, inquiring about job opportunities, or receiving general updates about their application status.
            - Job Alerts for notifications about new job openings or general job-related newsletters.
            - Uncategorized if the email doesn't fit any of the above categories.

            Subject: ${subject}
            From: ${sender}
            Email Content: ${email.substring(0, 1000)}  // Limit to first 1000 characters

            Category:`;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 10,  
                    temperature: 0.2,  
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('OpenAI API error:', errorData);
                throw new Error(`OpenAI API responded with status ${response.status}`);
            }

            const data = await response.json();
            const category = data.choices[0].message.content.trim();
            console.log('OpenAI category:', category);
            return category;
        } catch (error) {
            console.error('Error in getOpenAICategory:', error);
            return 'Uncategorized';
        }
    }

    // Function to get the first 50 emails
    async function getRecentEmails() {
        const response = await callGmailApi('GET', 'messages', { maxResults: 50 });
        return response.messages;
    }

    let isProcessing = false;
    let labeledCount = 0;

    // Modify the getInboxEmails function to only get emails from the primary category
    async function getInboxEmails(mode, start, end) {
        let params = { labelIds: 'INBOX', category: 'primary' };
        
        switch (mode) {
            case 'firstPage':
                params.maxResults = 20; // Assuming 20 emails per page
                break;
            case 'range':
                params.maxResults = end - start + 1;
                params.startIndex = start - 1; // Gmail API uses 0-based index
                break;
            case 'entireInbox':
                // No maxResults, will fetch all emails
                break;
            default:
                throw new Error('Invalid processing mode');
        }

        const response = await callGmailApi('GET', 'messages', params);
        return response.messages || [];
    }

    // Modify the processAndLabelEmails function
    async function processAndLabelEmails(mode, start, end) {
        console.log(`Fetching inbox emails (Mode: ${mode}, Start: ${start}, End: ${end})`);
        const emails = await getInboxEmails(mode, start, end);
        console.log(`Found ${emails.length} emails to process`);
        labeledCount = 0;
        for (const email of emails) {
            if (!isProcessing) {
                console.log('Processing stopped');
                break;
            }
            console.log(`Processing email ${email.id}`);
            await processEmail(email.id);
        }
        console.log('Finished processing all emails');
        chrome.runtime.sendMessage({action: 'processingComplete'});
        isProcessing = false;
    }

    // Modify the processEmail function
    async function processEmail(messageId) {
        console.log(`Fetching email ${messageId}`);
        const email = await getEmail(messageId);
        const headers = email.payload.headers;
        const subject = headers.find((header) => header.name === 'Subject').value;
        const sender = headers.find((header) => header.name === 'From').value;
        const body = getEmailBody(email.payload);
        const emailContent = `${subject}\n\n${body}`;

        console.log(`Categorizing email ${messageId}`);
        const category = await categorizeEmail(emailContent, subject, sender, messageId);
        console.log(`Email ${messageId} categorized as: ${category}`);
        
        // Increment the labeled count and update the popup
        labeledCount++;
        chrome.runtime.sendMessage({action: 'updateCounter', count: labeledCount});
    }

    // Modify the chrome.runtime.onMessage listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Message received in background:', request);
        if (request.action === 'processEmails' && !isProcessing) {
            console.log('Starting to process emails');
            isProcessing = true;
            processAndLabelEmails(request.params.mode, request.params.start, request.params.end)
                .then(() => {
                    console.log('Email processing completed successfully');
                    chrome.runtime.sendMessage({action: 'processingComplete'});
                })
                .catch((error) => {
                    console.error('Error processing emails:', error);
                    chrome.runtime.sendMessage({action: 'processingError', error: error.message});
                })
                .finally(() => {
                    isProcessing = false;
                });
            sendResponse({success: true});
        } else if (request.action === 'stopProcessing') {
            console.log('Stopping email processing');
            isProcessing = false;
            sendResponse({success: true});
        }
        return true; // Indicates that the response is sent asynchronously
    });

    chrome.runtime.onInstalled.addListener(async () => {
        console.log('Job Trail Extension Installed');
        try {
            await getAccessToken();
            console.log('Initial auth successful');
        } catch (error) {
            console.error('Initial auth failed:', error);
        }
    });

    function logState() {
        console.log('Current state:');
        console.log('Access token:', accessToken ? 'Set' : 'Not set');
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            console.log('Active tab:', tabs[0] ? tabs[0].url : 'No active tab');
        });
    }

    // Calls this function periodically or after important events
    setInterval(logState, 60000); // state logger

    function triggerAuth() {
        getAccessToken(true)
            .then(token => console.log('Auth successful, token:', token))
            .catch(error => {
                console.error('Auth failed:', JSON.stringify(error, null, 2));
                if (error.message === 'The user did not approve access.') {
                    console.log('Please check if the OAuth consent screen appeared and was dismissed.');
                }
            });
    }
