chrome.runtime.onInstalled.addListener(() => {
    console.log('Smart Form Filler installed');

    // Register context menu
    chrome.contextMenus.create({
        id: 'fillCurrentForm',
        title: 'Fill this form',
        contexts: ['editable']
    });

    // Set defaults
    chrome.storage.sync.set({
        aiToggle: true,
        aiProvider: 'openai'
    });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'fillCurrentForm') {
        chrome.storage.sync.get(['fullName', 'email', 'phone', 'address', 'aiProvider', 'apiKey', 'aiToggle'], (data) => {
            chrome.tabs.sendMessage(tab.id, {
                action: 'fillForms',
                data
            });
        });
    }
});

// Extension icon click handler
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleFormFiller' });
});

// Keyboard shortcut handler (optional)
chrome.commands?.onCommand?.addListener((command) => {
    if (command === 'fill-forms') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.storage.sync.get(['fullName', 'email', 'phone', 'address', 'aiProvider', 'apiKey', 'aiToggle'], (data) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'fillForms',
                    data
                });
            });
        });
    }
});
