// ============================================
// CAPTCHA SOLVER - APP JAVASCRIPT
// ============================================

// API Configuration
const API_BASE = 'http://localhost:8000';

// State
let currentType = 'text';
let currentFile = null;
let history = JSON.parse(localStorage.getItem('captchaHistory') || '[]');

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const previewImage = document.getElementById('previewImage');
const removeBtn = document.getElementById('removeBtn');
const solveBtn = document.getElementById('solveBtn');
const resultsSection = document.getElementById('resultsSection');
const resultValue = document.getElementById('resultValue');
const resultBadge = document.getElementById('resultBadge');
const confidenceFill = document.getElementById('confidenceFill');
const confidenceValue = document.getElementById('confidenceValue');
const processingTime = document.getElementById('processingTime');
const modelUsed = document.getElementById('modelUsed');
const historyGrid = document.getElementById('historyGrid');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const toast = document.getElementById('toast');
const typeButtons = document.querySelectorAll('.type-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    renderHistory();
});

// Event Listeners
function initEventListeners() {
    // Type selector
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;
        });
    });

    // Drop zone
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleFile(files[0]);
        } else {
            showToast('Please drop an image file', 'error');
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Preview controls
    removeBtn.addEventListener('click', clearPreview);
    solveBtn.addEventListener('click', solveCaptcha);

    // History
    clearHistoryBtn.addEventListener('click', clearHistory);

    // Processing modal close button
    document.getElementById('procCloseBtn').addEventListener('click', hideProcessingModal);
}

// File Handling
function handleFile(file) {
    currentFile = file;
    const reader = new FileReader();

    reader.onload = (e) => {
        previewImage.src = e.target.result;
        previewArea.classList.add('visible');
        dropZone.style.display = 'none';
    };

    reader.readAsDataURL(file);
}

function clearPreview() {
    currentFile = null;
    previewImage.src = '';
    previewArea.classList.remove('visible');
    dropZone.style.display = 'block';
    fileInput.value = '';
}

// Solve CAPTCHA
async function solveCaptcha() {
    if (!currentFile) {
        showToast('Please upload an image first', 'error');
        return;
    }

    showLoading(true);
    updateBadge('processing', 'Processing...');

    // Start pipeline animation
    animatePipeline();

    const startTime = performance.now();
    const formData = new FormData();
    formData.append('file', currentFile);
    formData.append('type', currentType);

    try {
        const response = await fetch(`${API_BASE}/api/solve`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Server error');
        }

        const data = await response.json();
        const endTime = performance.now();
        const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

        // Update main result
        resultValue.textContent = data.prediction;
        confidenceFill.style.width = `${data.confidence}%`;
        confidenceValue.textContent = `${data.confidence.toFixed(1)}%`;
        processingTime.textContent = data.processing_time_ms ? `${data.processing_time_ms}ms` : `${timeTaken}s`;
        modelUsed.textContent = data.architecture || 'CNN + ViT + BiLSTM';

        // Render character breakdown
        renderCharBreakdown(data.char_details);

        // Complete pipeline animation
        completePipeline(data.prediction);

        updateBadge('success', 'Solved');

        // Add to history
        addToHistory({
            image: previewImage.src,
            result: data.prediction,
            type: currentType,
            confidence: data.confidence,
            timestamp: Date.now()
        });

        showToast(`CAPTCHA solved: ${data.prediction}`, 'success');

    } catch (error) {
        console.error('Error:', error);
        updateBadge('error', 'Failed');
        hideCharBreakdown();
        resetPipeline();
        showToast('Failed to solve CAPTCHA. Is the server running?', 'error');
    } finally {
        showLoading(false);
    }
}

// Render Character Breakdown
function renderCharBreakdown(charDetails) {
    const breakdown = document.getElementById('charBreakdown');
    const grid = document.getElementById('charGrid');

    if (!charDetails || charDetails.length === 0) {
        breakdown.classList.remove('visible');
        return;
    }

    grid.innerHTML = charDetails.map((char, i) => {
        const confClass = char.confidence >= 90 ? 'high' : char.confidence >= 70 ? 'medium' : 'low';
        const alts = char.top_3.slice(1).map(a =>
            `<span class="char-alt">${a.char === '_' ? '␣' : a.char} ${a.confidence.toFixed(0)}%</span>`
        ).join('');

        return `
            <div class="char-card">
                <div class="char-main">${char.predicted === '_' ? '␣' : char.predicted}</div>
                <div class="char-conf-bar">
                    <div class="char-conf-fill ${confClass}" style="width: ${char.confidence}%"></div>
                </div>
                <div class="char-conf-text">${char.confidence.toFixed(1)}%</div>
                <div class="char-pos">Position ${char.position + 1}</div>
                ${alts ? `<div class="char-alts">Alt: ${alts}</div>` : ''}
            </div>
        `;
    }).join('');

    breakdown.classList.add('visible');
}

function hideCharBreakdown() {
    document.getElementById('charBreakdown').classList.remove('visible');
}

// Processing Modal Animation
const procStages = ['proc-input', 'proc-cnn', 'proc-vit', 'proc-lstm', 'proc-output'];
const procMessages = [
    'Preprocessing image...',
    'Extracting features with CNN...',
    'Applying attention mechanism...',
    'Processing sequences with BiLSTM...',
    'Classifying characters...'
];
let procTimeout = null;
let currentProcStage = 0;
let apiResult = null;

function showProcessingModal() {
    const modal = document.getElementById('processingModal');
    modal.classList.add('visible');

    // Reset all stages
    procStages.forEach(id => {
        const stage = document.getElementById(id);
        if (stage) {
            stage.classList.remove('active', 'complete');
            const status = stage.querySelector('.proc-status');
            if (status) status.textContent = '⏳';
        }
    });

    // Reset output chars
    const outputChars = document.querySelectorAll('#outputCharsPreview .out-char');
    outputChars.forEach(char => {
        char.classList.remove('revealed');
        char.textContent = '?';
    });

    // Reset progress
    document.getElementById('procProgressFill').style.width = '0%';
    document.getElementById('procProgressText').textContent = 'Initializing...';

    currentProcStage = 0;
    runProcessingStage();
}

function runProcessingStage() {
    if (currentProcStage > 0) {
        // Complete previous stage
        const prevStage = document.getElementById(procStages[currentProcStage - 1]);
        if (prevStage) {
            prevStage.classList.remove('active');
            prevStage.classList.add('complete');
            const status = prevStage.querySelector('.proc-status');
            if (status) status.textContent = '✓';
        }
    }

    if (currentProcStage < procStages.length) {
        // Activate current stage
        const stage = document.getElementById(procStages[currentProcStage]);
        if (stage) {
            stage.classList.add('active');
            const status = stage.querySelector('.proc-status');
            if (status) status.textContent = '⚙️';
        }

        // Update progress
        const progress = ((currentProcStage + 1) / procStages.length) * 100;
        document.getElementById('procProgressFill').style.width = `${progress}%`;
        document.getElementById('procProgressText').textContent = procMessages[currentProcStage];

        currentProcStage++;

        // Schedule next stage (slower animation - 800ms per stage)
        procTimeout = setTimeout(runProcessingStage, 800);
    } else {
        // All stages complete, wait for API result
        document.getElementById('procProgressText').textContent = 'Finalizing...';
    }
}

function completeProcessingModal(result) {
    // Clear timeout
    if (procTimeout) {
        clearTimeout(procTimeout);
    }

    // Complete all stages
    procStages.forEach(id => {
        const stage = document.getElementById(id);
        if (stage) {
            stage.classList.remove('active');
            stage.classList.add('complete');
            const status = stage.querySelector('.proc-status');
            if (status) status.textContent = '✓';
        }
    });

    // Reveal output characters one by one
    const outputChars = document.querySelectorAll('#outputCharsPreview .out-char');
    const resultChars = result.split('');

    resultChars.forEach((char, i) => {
        setTimeout(() => {
            if (outputChars[i]) {
                outputChars[i].textContent = char;
                outputChars[i].classList.add('revealed');
            }
        }, i * 200);
    });

    // Update progress
    document.getElementById('procProgressFill').style.width = '100%';
    document.getElementById('procProgressText').textContent = `Result: ${result} - Click ✕ to close`;
}

function hideProcessingModal() {
    if (procTimeout) {
        clearTimeout(procTimeout);
    }
    document.getElementById('processingModal').classList.remove('visible');
}

// Legacy pipeline functions (for the small pipeline display)
const pipelineStages = ['stage-input', 'stage-cnn', 'stage-vit', 'stage-lstm', 'stage-output'];
let pipelineInterval = null;

function animatePipeline() {
    // Also show the processing modal
    showProcessingModal();

    // Reset small pipeline
    pipelineStages.forEach(id => {
        const stage = document.getElementById(id);
        if (stage) {
            stage.classList.remove('active', 'complete');
        }
    });

    document.querySelectorAll('.pipeline-arrow').forEach(arrow => {
        arrow.classList.remove('active');
    });

    const status = document.getElementById('pipelineStatus');
    if (status) {
        status.textContent = 'Processing...';
        status.className = 'pipeline-status processing';
    }

    let currentStage = 0;
    const arrows = document.querySelectorAll('.pipeline-arrow');

    pipelineInterval = setInterval(() => {
        if (currentStage < pipelineStages.length) {
            const stage = document.getElementById(pipelineStages[currentStage]);
            if (stage) {
                if (currentStage > 0) {
                    const prevStage = document.getElementById(pipelineStages[currentStage - 1]);
                    if (prevStage) {
                        prevStage.classList.remove('active');
                        prevStage.classList.add('complete');
                    }
                }
                stage.classList.add('active');
                if (currentStage > 0 && arrows[currentStage - 1]) {
                    arrows[currentStage - 1].classList.add('active');
                }
            }
            currentStage++;
        } else {
            clearInterval(pipelineInterval);
            pipelineStages.forEach(id => {
                const stage = document.getElementById(id);
                if (stage) {
                    stage.classList.remove('active');
                    stage.classList.add('complete');
                }
            });
        }
    }, 800);
}

function completePipeline(result) {
    if (pipelineInterval) {
        clearInterval(pipelineInterval);
    }

    pipelineStages.forEach(id => {
        const stage = document.getElementById(id);
        if (stage) {
            stage.classList.remove('active');
            stage.classList.add('complete');
        }
    });

    const status = document.getElementById('pipelineStatus');
    if (status) {
        status.textContent = 'Complete';
        status.className = 'pipeline-status complete';
    }

    const outputPreview = document.getElementById('outputPreview');
    if (outputPreview && result) {
        outputPreview.textContent = result;
    }

    // Complete the processing modal
    completeProcessingModal(result);
}

function resetPipeline() {
    if (pipelineInterval) {
        clearInterval(pipelineInterval);
    }

    pipelineStages.forEach(id => {
        const stage = document.getElementById(id);
        if (stage) {
            stage.classList.remove('active', 'complete');
        }
    });

    document.querySelectorAll('.pipeline-arrow').forEach(arrow => {
        arrow.classList.remove('active');
    });

    const status = document.getElementById('pipelineStatus');
    if (status) {
        status.textContent = 'Ready';
        status.className = 'pipeline-status';
    }

    hideProcessingModal();
}

// UI Helpers
function showLoading(show) {
    // Processing is now handled by the processingModal
    // This function kept for compatibility
}

function updateBadge(status, text) {
    resultBadge.className = 'result-badge ' + status;
    resultBadge.querySelector('.badge-text').textContent = text;
}

function showToast(message, type = 'info') {
    const toastEl = document.getElementById('toast');
    const toastIcon = toastEl.querySelector('.toast-icon');
    const toastMessage = toastEl.querySelector('.toast-message');

    toastIcon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toastMessage.textContent = message;
    toastEl.className = 'toast visible ' + type;

    setTimeout(() => {
        toastEl.classList.remove('visible');
    }, 3000);
}

// History Management
function addToHistory(item) {
    history.unshift(item);
    if (history.length > 20) history.pop(); // Keep max 20 items
    localStorage.setItem('captchaHistory', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyGrid.innerHTML = '<div class="history-empty"><span>No CAPTCHAs solved yet</span></div>';
        return;
    }

    historyGrid.innerHTML = history.map((item, index) => `
        <div class="history-item" data-index="${index}">
            <img src="${item.image}" alt="CAPTCHA">
            <div class="history-item-result">${item.result}</div>
            <div class="history-item-type">${item.type}</div>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            const historyItem = history[index];

            // Show in results
            resultValue.textContent = historyItem.result;
            confidenceFill.style.width = `${historyItem.confidence}%`;
            confidenceValue.textContent = `${historyItem.confidence.toFixed(1)}%`;
            modelUsed.textContent = historyItem.type === 'text' ? 'Text Model' : 'Math Model';
            processingTime.textContent = 'from history';
            updateBadge('success', 'History');
        });
    });
}

function clearHistory() {
    history = [];
    localStorage.removeItem('captchaHistory');
    renderHistory();
    showToast('History cleared', 'success');
}
