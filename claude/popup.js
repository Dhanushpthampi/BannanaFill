// popup.js
document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    loadSettings();
    
    // Event listeners
    document.getElementById('fillFormsBtn').addEventListener('click', fillForms);
    document.getElementById('detectFormsBtn').addEventListener('click', detectForms);
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    
    // Auto-save personal info on change
    ['fullName', 'email', 'phone', 'address'].forEach(id => {
        document.getElementById(id).addEventListener('change', savePersonalInfo);
    });
});

function loadSettings() {
    chrome.storage.sync.get([
        'fullName', 'email', 'phone', 'address', 
        'aiProvider', 'apiKey', 'aiToggle'
    ], function(data) {
        if (data.fullName) document.getElementById('fullName').value = data.fullName;
        if (data.email) document.getElementById('email').value = data.email;
        if (data.phone) document.getElementById('phone').value = data.phone;
        if (data.address) document.getElementById('address').value = data.address;
        if (data.aiProvider) document.getElementById('aiProvider').value = data.aiProvider;
        if (data.apiKey) document.getElementById('apiKey').value = data.apiKey;
        if (data.aiToggle !== undefined) document.getElementById('aiToggle').checked = data.aiToggle;
    });
}

function savePersonalInfo() {
    const personalInfo = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value
    };
    
    chrome.storage.sync.set(personalInfo);
}

function saveSettings() {
    const settings = {
        aiProvider: document.getElementById('aiProvider').value,
        apiKey: document.getElementById('apiKey').value,
        aiToggle: document.getElementById('aiToggle').checked
    };
    
    chrome.storage.sync.set(settings, function() {
        showStatus('Settings saved successfully!', 'success');
    });
}

function fillForms() {
    showStatus('Filling forms...', 'success');
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'fillForms',
            data: getFormData()
        }, function(response) {
            if (response && response.success) {
                showStatus(`Filled ${response.count} form fields!`, 'success');
            } else {
                showStatus('No forms found to fill', 'error');
            }
        });
    });
}

function detectForms() {
    showStatus('Detecting forms...', 'success');
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'detectForms'
        }, function(response) {
            if (response && response.forms) {
                showStatus(`Found ${response.forms.length} form(s) with ${response.totalFields} fields`, 'success');
            } else {
                showStatus('No forms detected', 'error');
            }
        });
    });
}

function getFormData() {
    return {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        aiProvider: document.getElementById('aiProvider').value,
        apiKey: document.getElementById('apiKey').value,
        aiEnabled: document.getElementById('aiToggle').checked
    };
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}