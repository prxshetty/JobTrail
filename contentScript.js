console.log('Content script loaded and executed');

// Inform the background script that the content script is ready
chrome.runtime.sendMessage({ action: "contentScriptReady" });

function initializeContentScript() {
    console.log('Initializing content script');
    processEmails();
    // Set up a MutationObserver to handle dynamically loaded emails
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                processEmails();
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function processEmails() {
    console.log('Processing emails');
    const emailItems = document.querySelectorAll('tr.zA, div[role="listitem"]');
    console.log('Found email items:', emailItems.length);
    emailItems.forEach((emailItem) => {
        if (!emailItem.getAttribute('data-processed')) {
            processEmail(emailItem);
            emailItem.setAttribute('data-processed', 'true');
        }
    });
}

function processEmail(emailItem) {
    console.log('Processing email item:', emailItem);
    
    // Try multiple methods to find the message ID
    let messageId = emailItem.getAttribute('data-legacy-message-id') || 
                    emailItem.getAttribute('data-message-id') ||
                    emailItem.querySelector('[data-legacy-message-id]')?.getAttribute('data-legacy-message-id');

    if (!messageId) {
        // Try to find the message ID in the URL if the email is opened
        const urlParams = new URLSearchParams(window.location.search);
        messageId = urlParams.get('view') === 'om' ? urlParams.get('th') : null;
    }

    if (messageId) {
        console.log('Processing email with message ID:', messageId);
        chrome.runtime.sendMessage({
            action: 'categorizeEmail',
            messageId: messageId
        }, (response) => {
            console.log('Email categorization response:', response);
            if (response && response.category) {
                console.log('Email categorized:', response.category);
                addLabelToEmail(emailItem, response.category);
            } else {
                console.error('Invalid response from background script:', response);
            }
        });
    } else {
        console.error('No message ID found for this email item');
    }
}

function addLabelToEmail(emailItem, category) {
    const existingLabel = emailItem.querySelector('.job-trail-label');
    if (existingLabel) {
        existingLabel.textContent = category;
        existingLabel.style.backgroundColor = getCategoryColor(category);
    } else {
        const labelElement = document.createElement('span');
        labelElement.textContent = category;
        labelElement.className = 'job-trail-label';
        labelElement.style.backgroundColor = getCategoryColor(category);
        labelElement.style.color = 'white';
        labelElement.style.padding = '2px 5px';
        labelElement.style.borderRadius = '3px';
        labelElement.style.marginLeft = '5px';
        labelElement.style.fontWeight = 'bold';
        const subjectElement = emailItem.querySelector('.y6');
        if (subjectElement) {
            subjectElement.appendChild(labelElement);
        } else {
            console.error('Subject element not found for email item');
        }
    }
}

function getCategoryColor(category) {
    const colors = {
        'Rejection': '#FF4136',
        'Acceptance': '#2ECC40',
        'Interview': '#0074D9',
        'Assessment': '#FF851B',
        'Applicant': '#B10DC9',
        'Job Alerts': '#FFDC00',
        'Uncategorized': '#AAAAAA'
    };
    return colors[category] || '#AAAAAA';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in content script:', request);
    if (request.action === "initializeContentScript") {
        initializeContentScript();
        sendResponse({ status: "Initialization complete" });
    }
});

// Initial call to process emails
processEmails();

function logContentScriptState() {
    console.log('Content Script State:');
    console.log('Current URL:', window.location.href);
    console.log('Number of email items:', document.querySelectorAll('tr.zA, div[role="listitem"]').length);
    console.log('Is Gmail loaded:', document.querySelector('.aeH') !== null);
}

// Call this function periodically
setInterval(logContentScriptState, 30000); // Log state every 30 seconds

// Add this function to check if the content script is running
function checkContentScriptStatus() {
    console.log('Content script is running');
    console.log('Current URL:', window.location.href);
    console.log('Email container exists:', !!document.querySelector('.AO'));
}

// Call this function immediately and then every 10 seconds
checkContentScriptStatus();
setInterval(checkContentScriptStatus, 10000);

function addClickListeners() {
    console.log('Adding click listeners');
    const emailContainer = document.querySelector('.AO, .Tm');
    if (emailContainer) {
        emailContainer.addEventListener('click', (event) => {
            console.log('Click event detected on email container');
            const emailItem = event.target.closest('tr.zA, div[role="listitem"]');
            if (emailItem) {
                console.log('Email item clicked:', emailItem);
                processEmail(emailItem);
            } else {
                console.log('Clicked element is not an email item');
            }
        });
        console.log('Click listener added to email container');
    } else {
        console.error('Email container not found. DOM structure:', document.body.innerHTML);
    }
}