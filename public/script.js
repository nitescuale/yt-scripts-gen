// Global variables
let currentScript = null;
let currentScriptFilename = null;

// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const generateForm = document.getElementById('generate-form');
const generateBtn = document.getElementById('generate-btn');
const btnText = document.querySelector('.btn-text');
const btnLoading = document.querySelector('.btn-loading');
const generationResult = document.getElementById('generation-result');
const generationError = document.getElementById('generation-error');
const scriptContent = document.getElementById('script-content');
const scriptsList = document.getElementById('scripts-list');
const scriptsLoading = document.getElementById('scripts-loading');
const scriptsEmpty = document.getElementById('scripts-empty');
const modal = document.getElementById('script-modal');
const modalOverlay = document.getElementById('modal-overlay');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    checkServerStatus();
    loadScripts();
    setupEventListeners();
    setupTabNavigation();
});

// Setup event listeners
function setupEventListeners() {
    // Generate form
    generateForm.addEventListener('submit', handleGenerate);

    // Copy and download buttons
    document.getElementById('copy-script').addEventListener('click', () => copyToClipboard(currentScript));
    document.getElementById('download-script').addEventListener('click', () => downloadScript(currentScript, currentScriptFilename));

    // Library refresh
    document.getElementById('refresh-library').addEventListener('click', loadScripts);

    // Modal events
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', closeModal);
    document.getElementById('modal-copy').addEventListener('click', () => copyToClipboard(modal.dataset.scriptContent));
    document.getElementById('modal-download').addEventListener('click', () => downloadScript(modal.dataset.scriptContent, modal.dataset.filename));
    document.getElementById('modal-delete').addEventListener('click', deleteCurrentScript);

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display !== 'none') {
            closeModal();
        }
    });
}

// Setup tab navigation
function setupTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.dataset.tab;
            switchToTab(targetTab);
        });
    });
}

// Switch to a specific tab
function switchToTab(tabName) {
    // Update navigation
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    // Update content with fade effect
    tabContents.forEach(content => {
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Load scripts when switching to library tab
    if (tabName === 'library') {
        loadScripts();
    }
}

// Check server status
async function checkServerStatus() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();

        if (status.hasClaudeAPI) {
            if (status.hasSearchAPI) {
                showStatus('✅ Ready - Claude API & Search API configured', 'connected');
            } else {
                showStatus('⚠️ Ready - Claude API only (no search)', 'warning');
            }
        } else {
            showStatus('❌ Claude API not configured', 'disconnected');
        }
    } catch (error) {
        showStatus('❌ Server connection failed', 'disconnected');
        console.error('Status check failed:', error);
    }
}

// Show status indicator
function showStatus(message, type) {
    statusIndicator.textContent = message;
    statusIndicator.className = `status ${type}`;
}

// Handle script generation
async function handleGenerate(e) {
    e.preventDefault();
    console.log('Generate button clicked!'); // Debug

    const title = document.getElementById('title').value;
    const enableResearch = document.getElementById('enable-research').checked;
    const targetWordCount = parseInt(document.getElementById('word-count').value);
    const maxRetries = parseInt(document.getElementById('max-retries').value);

    console.log('Form data:', { title, enableResearch, targetWordCount, maxRetries }); // Debug

    if (!title.trim()) {
        showNotification('Please enter a video title', 'error');
        return;
    }

    // Show loading state
    setLoadingState(true);
    hideResults();

    try {
        console.log('Sending request to /api/generate...'); // Debug

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title.trim(),
                enableResearch,
                targetWordCount,
                maxRetries,
            }),
        });

        console.log('Response status:', response.status); // Debug
        console.log('Response headers:', response.headers); // Debug

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Response result:', result); // Debug

        if (result.success) {
            showGenerationResult(result);
            loadScripts(); // Refresh the library
            showNotification('Script generated successfully!', 'success');
        } else if (result.script) {
            // Partial success - script generated but with validation issues
            showGenerationResult(result, true); // Pass true for warning mode
            loadScripts(); // Refresh the library
            showNotification(`Script generated with warning: ${result.warning || result.error}`, 'warning');
        } else {
            showGenerationError(result.error, result.script);
        }
    } catch (error) {
        console.error('Generation failed:', error);
        showGenerationError(`Network error: ${error.message}. Please check your connection and try again.`);
    } finally {
        setLoadingState(false);
    }
}

// Set loading state
function setLoadingState(loading) {
    generateBtn.disabled = loading;
    if (loading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
    } else {
        btnText.style.display = 'block';
        btnLoading.style.display = 'none';
    }
}

// Hide all results
function hideResults() {
    generationResult.style.display = 'none';
    generationError.style.display = 'none';
}

// Show generation result
function showGenerationResult(result, isWarning = false) {
    currentScript = result.script;
    currentScriptFilename = result.filePath ? result.filePath.split(/[\\/]/).pop() : 'script.txt';

    document.getElementById('result-word-count').textContent = `${result.wordCount} words`;
    document.getElementById('result-research-sources').textContent =
        result.researchSources ? `${result.researchSources} research sources` : 'No research';

    // Clean up the script content for display
    const cleanScript = result.script.replace(/^\/\/.*$/gm, '').trim();
    scriptContent.textContent = cleanScript;

    // Change styling if it's a warning
    if (isWarning) {
        generationResult.style.borderLeftColor = '#f59e0b'; // Orange for warning
        generationResult.style.background = '#292524'; // Darker background
    } else {
        generationResult.style.borderLeftColor = '#10b981'; // Green for success
        generationResult.style.background = '#1f2937'; // Normal background
    }

    generationResult.style.display = 'block';
    generationError.style.display = 'none';

    // Scroll to result
    generationResult.scrollIntoView({ behavior: 'smooth' });

    // Show a button to switch to library if on generator tab
    const libraryButton = document.createElement('button');
    libraryButton.className = 'btn btn-secondary library-btn';
    libraryButton.textContent = 'View in Library';
    libraryButton.style.marginLeft = '10px';
    libraryButton.addEventListener('click', () => switchToTab('library'));

    const existingLibraryButton = document.querySelector('.result-actions .library-btn');
    if (!existingLibraryButton) {
        document.querySelector('.result-actions').appendChild(libraryButton);
    }
}

// Show generation error
function showGenerationError(error, partialScript = null) {
    document.getElementById('error-message').textContent = error;
    generationError.style.display = 'block';
    generationResult.style.display = 'none';

    if (partialScript) {
        const cleanScript = partialScript.replace(/^\/\/.*$/gm, '').trim();
        scriptContent.textContent = cleanScript;
        currentScript = partialScript;
        // Also show the partial result
        generationResult.style.display = 'block';
    }
}

// Load scripts library
async function loadScripts() {
    // Only load if we're on the library tab or if it's the initial load
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id !== 'tab-library' && document.querySelector('.nav-item.active').dataset.tab !== 'library') {
        return;
    }

    scriptsLoading.style.display = 'block';
    scriptsEmpty.style.display = 'none';
    scriptsList.innerHTML = '';

    try {
        const response = await fetch('/api/scripts');
        const scripts = await response.json();

        scriptsLoading.style.display = 'none';

        if (scripts.length === 0) {
            scriptsEmpty.style.display = 'block';
        } else {
            displayScripts(scripts);
        }
    } catch (error) {
        console.error('Failed to load scripts:', error);
        scriptsLoading.style.display = 'none';
        showNotification('Failed to load scripts library', 'error');
    }
}

// Display scripts in the library
function displayScripts(scripts) {
    scriptsList.innerHTML = '';

    scripts.forEach(script => {
        const card = document.createElement('div');
        card.className = 'script-card';
        card.addEventListener('click', () => openScript(script.filename));

        const title = script.title.replace(/^\/\/.*Title:\s*/gm, '').trim();
        const date = new Date(script.generatedDate).toLocaleDateString();

        card.innerHTML = `
            <h3>${escapeHtml(title)}</h3>
            <div class="meta">
                <span>${script.wordCount} words</span>
                <span>${date}</span>
            </div>
            <div class="preview">Click to view full script...</div>
        `;

        scriptsList.appendChild(card);
    });
}

// Open script in modal
async function openScript(filename) {
    try {
        const response = await fetch(`/api/scripts/${filename}`);
        const data = await response.json();

        if (response.ok) {
            showScriptModal(filename, data.content);
        } else {
            showNotification('Failed to load script', 'error');
        }
    } catch (error) {
        console.error('Failed to open script:', error);
        showNotification('Failed to load script', 'error');
    }
}

// Show script modal
function showScriptModal(filename, content) {
    const lines = content.split('\n');
    const titleLine = lines.find(line => line.includes('Title:'));
    const dateLine = lines.find(line => line.includes('Generated on:'));
    const wordCountLine = lines.find(line => line.includes('Word count:'));

    const title = titleLine ? titleLine.split('Title:')[1].trim() : filename;
    const date = dateLine ? new Date(dateLine.split('Generated on:')[1].trim()).toLocaleDateString() : 'Unknown';
    const wordCount = wordCountLine ? wordCountLine.split('Word count:')[1].trim() : '0';

    // Clean up content for display
    const cleanContent = content.replace(/^\/\/.*$/gm, '').trim();

    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-word-count').textContent = `${wordCount} words`;
    document.getElementById('modal-date').textContent = `Generated: ${date}`;
    document.getElementById('modal-script-content').textContent = cleanContent;

    // Store data for actions
    modal.dataset.scriptContent = cleanContent;
    modal.dataset.filename = filename;
    modal.dataset.title = title;

    // Show modal
    modal.style.display = 'flex';
    modalOverlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    modal.style.display = 'none';
    modalOverlay.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Delete current script
async function deleteCurrentScript() {
    const filename = modal.dataset.filename;
    const title = modal.dataset.title;

    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/scripts/${filename}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            closeModal();
            loadScripts(); // Refresh the library
            showNotification('Script deleted successfully', 'success');
        } else {
            showNotification('Failed to delete script', 'error');
        }
    } catch (error) {
        console.error('Failed to delete script:', error);
        showNotification('Failed to delete script', 'error');
    }
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard!', 'success');
    } catch (error) {
        console.error('Failed to copy:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Copied to clipboard!', 'success');
    }
}

// Download script
function downloadScript(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'script.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showNotification('Script downloaded!', 'success');
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    if (type === 'error') {
        notification.style.background = '#dc3545';
    } else if (type === 'warning') {
        notification.style.background = '#f59e0b';
    }

    document.body.appendChild(notification);

    // Remove notification after 4 seconds for warnings, 3 for others
    setTimeout(() => {
        notification.remove();
    }, type === 'warning' ? 4000 : 3000);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}