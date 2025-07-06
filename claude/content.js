// content.js
class SmartFormFiller {
    constructor() {
        this.fieldMappings = {
            // Name fields
            name: ['name', 'fullname', 'full_name', 'full-name', 'username', 'user_name', 'user-name'],
            firstName: ['firstname', 'first_name', 'first-name', 'fname', 'given_name', 'given-name'],
            lastName: ['lastname', 'last_name', 'last-name', 'lname', 'surname', 'family_name', 'family-name'],
            
            // Contact fields
            email: ['email', 'e_mail', 'e-mail', 'mail', 'email_address', 'email-address'],
            phone: ['phone', 'telephone', 'tel', 'mobile', 'cell', 'phone_number', 'phone-number'],
            
            // Address fields
            address: ['address', 'street', 'address1', 'address_1', 'address-1', 'street_address', 'street-address'],
            city: ['city', 'town', 'locality'],
            state: ['state', 'province', 'region'],
            zip: ['zip', 'postal', 'postcode', 'postal_code', 'postal-code', 'zipcode', 'zip_code', 'zip-code'],
            country: ['country', 'nation'],
            
            // Company fields
            company: ['company', 'organization', 'employer', 'business', 'org'],
            title: ['title', 'job_title', 'job-title', 'position', 'role'],
            
            // Other common fields
            website: ['website', 'url', 'site', 'web', 'homepage'],
            message: ['message', 'comment', 'comments', 'description', 'note', 'notes', 'details']
        };
        
        this.aiProviders = {
            openai: this.queryOpenAI.bind(this),
            anthropic: this.queryAnthropic.bind(this),
            local: this.queryLocalAI.bind(this)
        };
    }
    
    detectForms() {
        const forms = document.querySelectorAll('form');
        const formData = [];
        
        forms.forEach((form, index) => {
            const inputs = form.querySelectorAll('input, select, textarea');
            const fields = [];
            
            inputs.forEach(input => {
                if (input.type !== 'submit' && input.type !== 'button' && input.type !== 'hidden') {
                    fields.push({
                        element: input,
                        type: input.type,
                        name: input.name,
                        id: input.id,
                        placeholder: input.placeholder,
                        label: this.getFieldLabel(input)
                    });
                }
            });
            
            if (fields.length > 0) {
                formData.push({
                    form: form,
                    fields: fields,
                    index: index
                });
            }
        });
        
        return formData;
    }
    
    getFieldLabel(element) {
        // Try to find associated label
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) return label.textContent.trim();
        }
        
        // Check for parent label
        const parentLabel = element.closest('label');
        if (parentLabel) {
            return parentLabel.textContent.replace(element.value, '').trim();
        }
        
        // Look for nearby text
        const prevSibling = element.previousElementSibling;
        if (prevSibling && prevSibling.tagName === 'LABEL') {
            return prevSibling.textContent.trim();
        }
        
        // Check for placeholder or name
        return element.placeholder || element.name || element.id || '';
    }
    
    identifyField(field) {
        const identifiers = [
            field.name?.toLowerCase(),
            field.id?.toLowerCase(),
            field.placeholder?.toLowerCase(),
            field.label?.toLowerCase()
        ].filter(Boolean);
        
        // Check against known mappings
        for (const [fieldType, patterns] of Object.entries(this.fieldMappings)) {
            for (const identifier of identifiers) {
                if (patterns.some(pattern => identifier.includes(pattern))) {
                    return fieldType;
                }
            }
        }
        
        return 'unknown';
    }
    
    async fillForms(userData) {
        const forms = this.detectForms();
        let filledCount = 0;
        
        for (const formData of forms) {
            for (const field of formData.fields) {
                const fieldType = this.identifyField(field);
                let value = this.getValueForField(fieldType, userData);
                
                // Use AI for unknown fields if enabled
                if (!value && fieldType === 'unknown' && userData.aiEnabled) {
                    value = await this.getAIValue(field, userData);
                }
                
                if (value) {
                    this.fillField(field.element, value);
                    filledCount++;
                }
            }
        }
        
        return filledCount;
    }
    
    getValueForField(fieldType, userData) {
        const mappings = {
            name: userData.fullName,
            firstName: userData.fullName?.split(' ')[0],
            lastName: userData.fullName?.split(' ').slice(1).join(' '),
            email: userData.email,
            phone: userData.phone,
            address: userData.address,
            company: userData.company,
            title: userData.title,
            website: userData.website
        };
        
        return mappings[fieldType] || '';
    }
    
    async getAIValue(field, userData) {
        if (!userData.apiKey || !userData.aiProvider) {
            return null;
        }
        
        const prompt = this.buildAIPrompt(field, userData);
        const aiFunction = this.aiProviders[userData.aiProvider];
        
        if (aiFunction) {
            try {
                return await aiFunction(prompt, userData.apiKey);
            } catch (error) {
                console.error('AI query failed:', error);
                return null;
            }
        }
        
        return null;
    }
    
    buildAIPrompt(field, userData) {
        const context = `
User Info:
- Name: ${userData.fullName || 'Not provided'}
- Email: ${userData.email || 'Not provided'}
- Phone: ${userData.phone || 'Not provided'}
- Address: ${userData.address || 'Not provided'}

Form field details:
- Label: ${field.label}
- Placeholder: ${field.placeholder || 'None'}
- Name: ${field.name || 'None'}
- Type: ${field.type}

Please provide an appropriate value for this form field. Respond with only the value, no explanation. If you cannot determine an appropriate value, respond with "SKIP".`;
        
        return context;
    }
    
    async queryOpenAI(prompt, apiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 50,
                temperature: 0.3
            })
        });
        
        const data = await response.json();
        const value = data.choices?.[0]?.message?.content?.trim();
        return value === 'SKIP' ? null : value;
    }
    
    async queryAnthropic(prompt, apiKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 50,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        
        const data = await response.json();
        const value = data.content?.[0]?.text?.trim();
        return value === 'SKIP' ? null : value;
    }
    
    async queryLocalAI(prompt, apiKey) {
        // Placeholder for local AI implementation
        // Could integrate with local models like Ollama
        return null;
    }
    
    fillField(element, value) {
        // Handle different input types
        if (element.tagName === 'SELECT') {
            // Try to find matching option
            const options = element.querySelectorAll('option');
            for (const option of options) {
                if (option.textContent.toLowerCase().includes(value.toLowerCase()) ||
                    option.value.toLowerCase().includes(value.toLowerCase())) {
                    element.value = option.value;
                    break;
                }
            }
        } else if (element.type === 'checkbox' || element.type === 'radio') {
            // Handle boolean-like values
            const booleanValue = ['true', 'yes', '1', 'on'].includes(value.toLowerCase());
            element.checked = booleanValue;
        } else {
            // Regular text input
            element.value = value;
        }
        
        // Trigger change events
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

// Initialize the form filler
const formFiller = new SmartFormFiller();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectForms') {
        const forms = formFiller.detectForms();
        sendResponse({
            forms: forms.map(f => ({ fields: f.fields.length })),
            totalFields: forms.reduce((sum, f) => sum + f.fields.length, 0)
        });
    } else if (request.action === 'fillForms') {
        formFiller.fillForms(request.data).then(count => {
            sendResponse({ success: true, count });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
    }
});