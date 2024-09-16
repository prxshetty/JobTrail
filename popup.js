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

    function processEmails() {
        console.log('Process button clicked');
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

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateCounter') {
            labelCounter.textContent = request.count;
        } else if (request.action === 'processingComplete') {
            updateUI('completed');
        } else if (request.action === 'processingError') {
            console.error('Processing error:', request.error);
            statusMessage.textContent = `Error: ${request.error}`;
            updateUI('error');
        }
    });
});