document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup DOM fully loaded and parsed');

    const processingMode = document.getElementById('processingMode');
    const rangeInputs = document.getElementById('rangeInputs');
    const startRange = document.getElementById('startRange');
    const endRange = document.getElementById('endRange');
    const processButton = document.getElementById('processButton');
    const stopButton = document.getElementById('stopButton');
    const statusMessage = document.getElementById('statusMessage');
    const labelCounter = document.getElementById('labelCounter');
    const progressBar = document.getElementById('progressBar');
    const homeButton = document.getElementById('homeButton');
    const historyButton = document.getElementById('historyButton');
    const mainContent = document.getElementById('mainContent');
    const historyContent = document.getElementById('historyContent');
    const settingsButton = document.getElementById('settingsButton');
    const settingsContent = document.getElementById('settingsContent');
    const apiInput = document.getElementById('apiInput');
    const saveApiButton = document.getElementById('saveApiButton');
    const currentLLM = document.getElementById('currentLLM');
    const llmProvider = document.getElementById('llmProvider');
    const githubLink = document.getElementById('githubLink');
    const resetHistoryButton = document.getElementById('resetHistoryButton');

    let totalEmails = 0;

    processingMode.addEventListener('change', function() {
        if (processingMode.value === 'range') {
            rangeInputs.style.display = 'block';
        } else {
            rangeInputs.style.display = 'none';
        }
    });

    processButton.addEventListener('click', function() {
        processEmails();
    });

    stopButton.addEventListener('click', function() {
        stopProcessing();
    });

    homeButton.addEventListener('click', function() {
        resetPage();
    });

    historyButton.addEventListener('click', function() {
        showHistory();
    });

    settingsButton.addEventListener('click', function() {
        showSettings();
    });

    saveApiButton.addEventListener('click', function() {
        showConfirmation(saveApiButton, saveApiKey);
    });

    llmProvider.addEventListener('change', function() {
        updateCurrentLLM(llmProvider.value);
    });

    resetHistoryButton.addEventListener('click', function() {
        showConfirmation(resetHistoryButton, resetLabelHistory);
    });

    function processEmails() {
        console.log('Process button clicked');
        chrome.storage.sync.get(['apiKey'], function(result) {
            if (!result.apiKey) {
                statusMessage.textContent = 'Error: Please set your API key in settings.';
                return;
            }
            let params = { mode: processingMode.value };
            if (params.mode === 'range') {
                params.start = parseInt(startRange.value);
                params.end = parseInt(endRange.value);
            }
            chrome.runtime.sendMessage({action: 'processEmails', params: params}, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error:', chrome.runtime.lastError);
                } else if (response && response.success) {
                    console.log('Processing started successfully');
                    updateUI('processing');
                }
            });
        });
    }

    function stopProcessing() {
        console.log('Stop button clicked');
        chrome.runtime.sendMessage({action: 'stopProcessing'}, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError);
            } else if (response && response.success) {
                console.log('Processing stopped successfully');
                updateUI('stopped');
            }
        });
    }

    function resetPage() {
        showMainContent();
        processingMode.value = 'firstPage';
        rangeInputs.style.display = 'none';
        startRange.value = '';
        endRange.value = '';
        processButton.disabled = false;
        stopButton.disabled = true;
        statusMessage.textContent = '';
        labelCounter.textContent = '0';
        progressBar.style.width = '0%';
    }

    function showHistory() {
        mainContent.style.display = 'none';
        settingsContent.style.display = 'none';
        historyContent.style.display = 'block';
        historyButton.classList.add('active');
        homeButton.classList.remove('active');
        settingsButton.classList.remove('active');
        chrome.runtime.sendMessage({action: 'getLabelHistory'}, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError);
            } else if (response && response.history) {
                displayLabelHistory(response.history);
            }
        });
    }

    function displayLabelHistory(history) {
        const labelHistoryBody = document.getElementById('labelHistoryBody');
        labelHistoryBody.innerHTML = '';
        for (const [label, count] of Object.entries(history)) {
            const row = document.createElement('tr');
            const labelCell = document.createElement('td');
            const countCell = document.createElement('td');
            labelCell.textContent = label;
            countCell.textContent = count;
            row.appendChild(labelCell);
            row.appendChild(countCell);
            labelHistoryBody.appendChild(row);
        }
    }

    function updateUI(state) {
        if (state === 'processing') {
            processButton.disabled = true;
            stopButton.disabled = false;
            statusMessage.textContent = 'Processing emails...';
        } else if (state === 'stopped' || state === 'completed' || state === 'error') {
            processButton.disabled = false;
            stopButton.disabled = true;
            if (state === 'stopped') {
                statusMessage.textContent = 'Processing stopped.';
            } else if (state === 'completed') {
                statusMessage.textContent = 'Processing complete!';
            }
            // 'error' state is handled in the onMessage listener
        }
    }

    function updateProgressBar(current, total) {
        const percentage = total > 0 ? (current / total) * 100 : 0;
        
        console.log(`Updating progress bar: ${current}/${total} (${percentage.toFixed(2)}%)`);

        progressBar.style.width = `${percentage}%`;
        statusMessage.textContent = `Processing: ${current} / ${total} emails`;
        labelCounter.textContent = current;
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Received message:', request);
        if (request.action === 'updateTotal') {
            totalEmails = request.total;
            updateProgressBar(0, totalEmails);
        } else if (request.action === 'updateCounter') {
            updateProgressBar(request.count, totalEmails);
        } else if (request.action === 'processingComplete') {
            updateUI('completed');
            updateProgressBar(request.count, request.total);
            statusMessage.textContent = 'Processing complete!';
        } else if (request.action === 'processingStopped') {
            updateUI('stopped');
            updateProgressBar(request.count, request.total);
            statusMessage.textContent = 'Processing stopped.';
        } else if (request.action === 'processingError') {
            console.error('Processing error:', request.error);
            statusMessage.textContent = `Error: ${request.error}`;
            updateUI('error');
        }
    });

    function showSettings() {
        mainContent.style.display = 'none';
        historyContent.style.display = 'none';
        settingsContent.style.display = 'block';
        settingsButton.classList.add('active');
        homeButton.classList.remove('active');
        historyButton.classList.remove('active');
        chrome.storage.sync.get(['apiKey', 'llmProvider'], function(result) {
            apiInput.value = result.apiKey || '';
            llmProvider.value = result.llmProvider || 'openai';
        });
    }

    function saveApiKey() {
        const apiKey = apiInput.value.trim();
        const provider = llmProvider.value;
        chrome.storage.sync.set({apiKey: apiKey, llmProvider: provider}, function() {
            console.log('API key and provider saved');
            updateCurrentLLM(provider);
            showMainContent();
        });
    }

    function updateCurrentLLM(provider) {
        let providerName;
        switch (provider) {
            case 'openai':
                providerName = 'OpenAI (ChatGPT)';
                break;
            case 'anthropic':
                providerName = 'Anthropic (Claude)';
                break;
            case 'cohere':
                providerName = 'Cohere';
                break;
            case 'other':
                providerName = 'Custom API';
                break;
            default:
                providerName = 'API';
        }
        currentLLM.textContent = providerName;
    }

    function showMainContent() {
        mainContent.style.display = 'block';
        historyContent.style.display = 'none';
        settingsContent.style.display = 'none';
        homeButton.classList.add('active');
        settingsButton.classList.remove('active');
        historyButton.classList.remove('active');
    }

    // Initialize the current LLM display and active nav item
    chrome.storage.sync.get(['apiKey', 'llmProvider'], function(result) {
        updateCurrentLLM(result.llmProvider || 'openai');
        showMainContent();
    });
    githubLink.href = "https://github.com/prxshetty/JobTrail";

    function resetLabelHistory() {
        chrome.runtime.sendMessage({action: 'resetLabelHistory'}, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError);
            } else if (response && response.success) {
                console.log('Label history reset successfully');
                displayLabelHistory({});
            }
        });
    }

    function showConfirmation(button, action) {
        const buttonGroup = button.closest('.button-group');
        const confirmationButtons = buttonGroup.querySelector('.confirmation-buttons');
        
        button.style.display = 'none';
        confirmationButtons.style.display = 'flex';
        
        const confirmButton = confirmationButtons.querySelector('.confirm');
        const cancelButton = confirmationButtons.querySelector('.cancel');
        
        confirmButton.addEventListener('click', function() {
            action();
            resetButtons(buttonGroup);
        });
        
        cancelButton.addEventListener('click', function() {
            resetButtons(buttonGroup);
        });
        
        setTimeout(() => {
            resetButtons(buttonGroup);
        }, 3000);
    }

    function resetButtons(buttonGroup) {
        const mainButton = buttonGroup.querySelector('.icon-button:not(.confirm):not(.cancel)');
        const confirmationButtons = buttonGroup.querySelector('.confirmation-buttons');
        
        mainButton.style.display = 'flex';
        confirmationButtons.style.display = 'none';
    }
});