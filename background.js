    console.log('Background script loaded');

    let accessToken = null;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Message received in background:', request);
        if (request.action === 'categorizeEmail') {
            console.log('Attempting to categorize email:', request.messageId);
            getEmail(request.messageId)
                .then((email) => {
                    console.log('Email retrieved:', email);
                    const headers = email.payload.headers;
                    const subject = headers.find((header) => header.name === 'Subject').value;
                    const sender = headers.find((header) => header.name === 'From').value;
                    const body = getEmailBody(email.payload);
                    const emailContent = `${subject}\n\n${body}`;
                    console.log('Processed email content:', emailContent.substring(0, 100) + '...');

                    return categorizeEmail(emailContent, subject, sender);
                })
                .then((category) => {
                    console.log('Email categorized as:', category);
                    sendResponse({ category });
                })
                .catch((error) => {
                    console.error('Error categorizing email:', error);
                    sendResponse({ category: 'Uncategorized' });
                });

            return true; // Indicates that the response is sent asynchronously
        } else if (request.action === 'contentScriptReady') {
            console.log('Content script is ready in tab:', sender.tab.id);
            chrome.tabs.sendMessage(sender.tab.id, { action: "initializeContentScript" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error initializing content script:', chrome.runtime.lastError);
                } else {
                    console.log('Content script initialized, response:', response);
                }
            });
        }
    });
    
    // Function to get the OAuth 2.0 access token
    function getAccessToken(interactive) {
        console.log('Getting access token, interactive:', interactive);
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ 
                interactive: interactive,
                scopes: [
                    "https://www.googleapis.com/auth/gmail.readonly",
                    "https://www.googleapis.com/auth/gmail.modify",
                    "https://www.googleapis.com/auth/gmail.labels"
                ]
            }, (token) => {
                if (chrome.runtime.lastError || !token) {
                    console.error('Error getting auth token:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }
                console.log('Access token obtained');
                accessToken = token;
                resolve(token);
            });
        });
    }

    // Handle token refresh
    chrome.identity.onSignInChanged.addListener((account, signedIn) => {
        if (!signedIn) {
            accessToken = null;
        }
    });

    // Function to make authenticated requests to Gmail API
    async function callGmailApi(method, path, params, body) {
        try {
            const token = await getAccessToken(true);
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
                    console.error('Unauthorized access. Removing cached token.');
                    chrome.identity.removeCachedAuthToken({ token: token }, () => {
                        accessToken = null;
                    });
                    throw new Error('Token expired. Please try again.');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Gmail API response:', data);
            return data;
        } catch (error) {
            console.error('Error calling Gmail API:', error);
            throw error;
        }
    }

    // Function to get the full content of an email
    async function getEmail(messageId) {
        return callGmailApi('GET', `messages/${messageId}`, { format: 'full' }, null);
    }

    // Function to extract the email body
    function getEmailBody(payload) {
        let body = '';

        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain') {
                    body += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                } else if (part.parts) {
                    body += getEmailBody(part);
                }
            }
        } else if (payload.body.data) {
            body = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }

        return body;
    }

    // Update the categorizeEmail function to return a mock category for testing
    async function categorizeEmail(emailContent, subject, sender) {
        console.log('Categorizing email:', { subject, sender });
        // Mock categorization for testing
        const categories = ['Application Sent', 'Interview Scheduled', 'Offer Received', 'Rejection'];
        return categories[Math.floor(Math.random() * categories.length)];
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Message received in background:', request);
        if (request.action === 'categorizeEmail') {
            // Your existing code for categorizing email
            // ...
            // Make sure to call sendResponse with the result
            sendResponse({ category: 'SomeCategory' });
            return true; // Indicates that the response is sent asynchronously
        }
    });

    chrome.runtime.onInstalled.addListener(() => {
        console.log('Job Trail Extension Installed');
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url && tab.url.includes('mail.google.com')) {
                console.log('Attempting to send initializeContentScript message to tab:', tabId);
                chrome.tabs.sendMessage(tabId, { action: "initializeContentScript" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('Error sending message (this is normal if the content script is not yet loaded):', chrome.runtime.lastError.message);
                    } else {
                        console.log('Content script initialized, response:', response);
                    }
                });
            }
        });
    });

    function logState() {
        console.log('Current state:');
        console.log('Access token:', accessToken ? 'Set' : 'Not set');
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            console.log('Active tab:', tabs[0] ? tabs[0].url : 'No active tab');
        });
    }

    // Call this function periodically or after important events
    setInterval(logState, 60000); // Log state every minute