class ObstacleDetector {
    constructor() {
        this.video = document.getElementById('videoFeed');
        this.canvas = document.getElementById('detectionCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.model = null; this.isRunning = false; this.isModelLoaded = false;
        this.speechEnabled = true; this.facingMode = 'environment'; this.stream = null;
        this.confidenceThreshold = 0.45; this.maxDetections = 20;
        this.lastSpoken = {}; this.speechCooldown = 8000;
        this.frameCount = 0; this.lastFpsTime = performance.now(); this.currentFps = 0;
        this.maxLogEntries = 50; this._lastLogObjects = '';
        this.prevPredictions = []; this.movementThreshold = 15;
        this.boxColors = { person: '#ec4899', car: '#f59e0b', truck: '#f59e0b', bus: '#f59e0b', bicycle: '#06b6d4', motorcycle: '#06b6d4', dog: '#10b981', cat: '#10b981', chair: '#8b5cf6', couch: '#8b5cf6', bottle: '#06b6d4', cup: '#06b6d4', laptop: '#a78bfa', cell_phone: '#a78bfa', book: '#f59e0b', backpack: '#10b981', handbag: '#10b981', default: '#7c3aed' };
        this.statusDot = document.querySelector('.status-dot');
        this.statusText = document.querySelector('.status-text');
        this.fpsStat = document.getElementById('fpsStat');
        this.objectsStat = document.getElementById('objectsStat');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.permissionOverlay = document.getElementById('permissionOverlay');
        this.loaderText = document.getElementById('loaderText');
        this.detectionLog = document.getElementById('detectionLog');
        this.detectionPanel = document.getElementById('detectionPanel');
        this.init()
    }

    async init() {
        this.bindEvents();
        try { await this.startCamera(); await this.loadModel(); this.setStatus('Ready - Tap Start', 'active'); this.loadingOverlay.classList.add('hidden') }
        catch (err) {
            console.error('Init:', err);
            if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') { this.loadingOverlay.classList.add('hidden'); this.permissionOverlay.classList.remove('hidden'); this.setStatus('Camera Blocked', 'error') }
            else this.setStatus('Error: ' + err.message, 'error')
        }
    }

    bindEvents() {
        document.getElementById('toggleDetectionBtn').addEventListener('click', () => this.toggleDetection());
        document.getElementById('switchCameraBtn').addEventListener('click', () => this.switchCamera());
        document.getElementById('toggleSoundBtn').addEventListener('click', (e) => { this.speechEnabled = !this.speechEnabled; e.currentTarget.classList.toggle('active', this.speechEnabled); this.showToast(this.speechEnabled ? 'Voice alerts ON' : 'Voice alerts OFF', 'info') });
        document.getElementById('alertBtn').addEventListener('click', () => this.sendAlert());
        const rb = document.getElementById('requestCameraBtn');
        if (rb) rb.addEventListener('click', async () => { this.permissionOverlay.classList.add('hidden'); this.loadingOverlay.classList.remove('hidden'); try { await this.startCamera(); await this.loadModel(); this.loadingOverlay.classList.add('hidden'); this.setStatus('Ready', 'active') } catch (e) { this.permissionOverlay.classList.remove('hidden'); this.loadingOverlay.classList.add('hidden') } });
        document.getElementById('panelHandle').addEventListener('click', () => this.detectionPanel.classList.toggle('expanded'));
        document.getElementById('clearLogBtn').addEventListener('click', () => { this.detectionLog.innerHTML = '<div class="log-empty"><p>Log cleared.</p></div>' });
        window.addEventListener('resize', () => this.resizeCanvas())
    }

    async startCamera() {
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: this.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        } catch (e) {
            console.warn("High-res camera failed, falling back to default:", e);
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: this.facingMode }, audio: false });
        }
        this.video.srcObject = this.stream;
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('autoplay', '');
        return new Promise(r => {
            this.video.onloadedmetadata = () => {
                this.video.play().then(() => {
                    this.resizeCanvas();
                    r();
                }).catch(err => {
                    console.error("Video play failed:", err);
                    r();
                });
            }
        })
    }

    async switchCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        try { await this.startCamera(); this.showToast(this.facingMode === 'user' ? 'Front camera' : 'Rear camera', 'info') }
        catch (e) { this.showToast('Could not switch', 'error'); this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment' }
    }

    resizeCanvas() {
        if (this.video.videoWidth > 0) {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            const rect = this.video.getBoundingClientRect();
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
        }
        else { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight }
    }

    async loadModel() {
        this.loaderText.textContent = 'Loading AI Model (this may take 10-15s)...';
        this.model = await cocoSsd.load({ base: 'mobilenet_v2' });
        this.isModelLoaded = true;
        this.loaderText.textContent = 'Model loaded!';
        console.log('COCO-SSD model loaded: mobilenet_v2 (high accuracy)')
    }

    toggleDetection() {
        const btn = document.getElementById('toggleDetectionBtn');
        if (this.isRunning) {
            this.isRunning = false; btn.classList.remove('recording'); btn.querySelector('span').textContent = 'Start';
            btn.querySelector('.control-main-inner').innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
            this.setStatus('Paused', 'active'); this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        }
        else {
            if (!this.isModelLoaded) { this.showToast('Model loading...', 'info'); return }
            this.isRunning = true; btn.classList.add('recording'); btn.querySelector('span').textContent = 'Stop';
            btn.querySelector('.control-main-inner').innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
            this.setStatus('Detecting...', 'active'); this.detectLoop()
        }
    }

    async detectLoop() {
        if (!this.isRunning) return;
        try {
            if (this.canvas.width !== this.video.videoWidth && this.video.videoWidth > 0) this.resizeCanvas();
            const predictions = await this.model.detect(this.video, this.maxDetections, this.confidenceThreshold);
            this.matchPredictions(predictions, this.prevPredictions);
            this.prevPredictions = JSON.parse(JSON.stringify(predictions));
            this.drawPredictions(predictions);
            this.updateStats(predictions);
            this.processSpeech(predictions);
            this.updateLog(predictions)
        }
        catch (e) { console.error('Detect:', e) }
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsTime >= 1000) { this.currentFps = this.frameCount; this.frameCount = 0; this.lastFpsTime = now }
        if (this.isRunning) requestAnimationFrame(() => this.detectLoop())
    }

    drawPredictions(predictions) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        predictions.forEach(pred => {
            const [x, y, w, h] = pred.bbox;
            const color = this.boxColors[pred.class] || this.boxColors.default;
            const conf = Math.round(pred.score * 100);
            this.ctx.strokeStyle = color; this.ctx.lineWidth = 3;
            this.ctx.shadowColor = color; this.ctx.shadowBlur = 15;
            this.ctx.strokeRect(x, y, w, h); this.ctx.shadowBlur = 0;
            const cl = Math.min(20, w / 4, h / 4); this.ctx.lineWidth = 4; this.ctx.strokeStyle = color;
            this.ctx.beginPath(); this.ctx.moveTo(x, y + cl); this.ctx.lineTo(x, y); this.ctx.lineTo(x + cl, y); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(x + w - cl, y); this.ctx.lineTo(x + w, y); this.ctx.lineTo(x + w, y + cl); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(x, y + h - cl); this.ctx.lineTo(x, y + h); this.ctx.lineTo(x + cl, y + h); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(x + w - cl, y + h); this.ctx.lineTo(x + w, y + h); this.ctx.lineTo(x + w, y + h - cl); this.ctx.stroke();
            const pos = this.getPosition(pred);
            const dist = this.estimateDistance(pred);
            const moveLabel = pred.isMoving ? 'Moving' : 'Idle';
            const riskLabel = 'Risk: ' + (pred.riskLevel || 'Low');
            const label = pred.class + ' ' + conf + '% (' + moveLabel + ', ' + riskLabel + ')';

            this.ctx.font = '600 13px Inter,sans-serif';
            const tw = this.ctx.measureText(label).width;
            const lh = 22; const ly = y > lh + 4 ? y - lh - 4 : y + 4;

            // Draw highlight for high risk
            if (pred.riskLevel === 'High') {
                this.ctx.lineWidth = 5;
                this.ctx.strokeStyle = '#ef4444';
                this.ctx.globalAlpha = 0.2 + Math.sin(Date.now() / 200) * 0.1; // Pulsing effect
                this.ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
                this.ctx.globalAlpha = 1;
            }

            this.ctx.fillStyle = pred.riskLevel === 'High' ? '#ef4444' : color;
            this.ctx.globalAlpha = 0.85;
            this.ctx.beginPath(); this.ctx.roundRect(x, ly, tw + 16, lh, 6); this.ctx.fill();
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = '#fff'; this.ctx.fillText(label, x + 8, ly + 16)
        })
    }

    getPosition(pred) {
        const [x, y, w, h] = pred.bbox;
        const centerX = x + w / 2;
        const frameW = this.video.videoWidth || this.canvas.width || window.innerWidth;
        const ratio = centerX / frameW;
        if (ratio < 0.33) return 'Left';
        if (ratio > 0.66) return 'Right';
        return 'Center'
    }

    estimateDistance(pred) {
        const [x, y, w, h] = pred.bbox;
        const frameH = this.video.videoHeight || this.canvas.height || window.innerHeight;
        const frameW = this.video.videoWidth || this.canvas.width || window.innerWidth;
        const sizeRatio = Math.max(w / frameW, h / frameH);
        if (sizeRatio > 0.5) return 'Very Close';
        if (sizeRatio > 0.25) return 'Close';
        if (sizeRatio > 0.1) return 'Medium';
        return 'Far'
    }

    matchPredictions(current, previous) {
        current.forEach(curr => {
            curr.isMoving = false;
            curr.riskLevel = 'Low';
            const matches = previous.filter(p => p.class === curr.class);
            if (matches.length > 0) {
                let minDSq = Infinity, bestMatch = null;
                const currCX = curr.bbox[0] + curr.bbox[2] / 2, currCY = curr.bbox[1] + curr.bbox[3] / 2;
                matches.forEach(prev => {
                    const prevCX = prev.bbox[0] + prev.bbox[2] / 2, prevCY = prev.bbox[1] + prev.bbox[3] / 2;
                    const dSq = Math.pow(currCX - prevCX, 2) + Math.pow(currCY - prevCY, 2);
                    if (dSq < minDSq) { minDSq = dSq; bestMatch = prev }
                });
                if (bestMatch && Math.sqrt(minDSq) > this.movementThreshold) curr.isMoving = true;
            }
            const dist = this.estimateDistance(curr);
            const hazardClasses = ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle', 'dog', 'cat'];
            if (curr.isMoving && hazardClasses.includes(curr.class)) curr.riskLevel = 'High';
        });
    }

    processSpeech(predictions) {
        if (!this.speechEnabled || predictions.length === 0) return;

        // Don't try to speak if TTS is active
        if (window._ttsActive || window.speechSynthesis.speaking) return;

        const now = Date.now();
        const counts = {};
        predictions.forEach(p => {
            const key = p.class;
            if (!counts[key]) counts[key] = { count: 0, pred: p };
            counts[key].count++;
            if (p.score > counts[key].pred.score) counts[key].pred = p;
        });

        const parts = [];
        for (const [obj, data] of Object.entries(counts)) {
            const pos = this.getPosition(data.pred);
            const dist = this.estimateDistance(data.pred);
            const stateKey = obj + '-' + dist + '-' + (data.pred.isMoving ? 'moving' : 'idle') + '-' + data.pred.riskLevel;

            if (!this.lastSpoken[obj] || (now - this.lastSpoken[obj]) > this.speechCooldown || this.lastSpoken[obj + '_state'] !== stateKey) {
                const langData = window.voiceAssistant ? window.voiceAssistant.responses[window.voiceAssistant.activeLang] : null;
                const getLabel = (key, fallback) => (langData && langData.objects && langData.objects[key]) ? langData.objects[key] : fallback;

                const objLabel = getLabel(obj, obj);
                const posLabel = getLabel(pos === 'Left' ? 'onLeft' : pos === 'Right' ? 'onRight' : 'atCenter', pos.toLowerCase());
                const distLabel = getLabel(dist === 'Very Close' ? 'veryClose' : dist === 'Close' ? 'close' : dist === 'Medium' ? 'medium' : 'far', dist.toLowerCase());
                const riskLabel = data.pred.riskLevel === 'High' ? getLabel('riskHigh', 'high risk') : '';
                const moveLabel = data.pred.isMoving ? getLabel('moving', 'moving') : '';

                let msg = data.count > 1 ? data.count + ' ' + objLabel : objLabel;
                if (moveLabel) msg = moveLabel + ' ' + msg;
                if (riskLabel) msg += ', ' + riskLabel;

                if (dist === 'Very Close' || dist === 'Close') {
                    parts.push(msg + ' ' + distLabel + ' ' + posLabel);
                } else {
                    parts.push(msg + ' ' + posLabel);
                }
                this.lastSpoken[obj] = now;
                this.lastSpoken[obj + '_state'] = stateKey;
            }
        }
        if (parts.length > 0) {
            const text = parts.join(', ');
            console.log('🗣️ Detection:', text);
            // Use speakDetection() which skips if already speaking
            if (window.voiceAssistant && typeof window.voiceAssistant.speakDetection === 'function') {
                window.voiceAssistant.speakDetection(text);
            } else if ('speechSynthesis' in window && !window._ttsActive) {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(text);
                u.lang = window.voiceAssistant ? window.voiceAssistant.languages[window.voiceAssistant.activeLang].code : 'en-US';
                window.speechSynthesis.speak(u);
            }
        }
    }

    updateLog(predictions) {
        if (predictions.length === 0) return;
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const objects = predictions.map(p => p.class).join(', ');
        if (objects === this._lastLogObjects) return;
        this._lastLogObjects = objects;
        const empty = this.detectionLog.querySelector('.log-empty');
        if (empty) empty.remove();
        const item = document.createElement('div');
        const isHighRisk = predictions.some(p => p.riskLevel === 'High');
        item.className = 'log-item' + (isHighRisk ? ' risk-high-log' : '');
        const topPred = predictions.reduce((prev, current) => (prev.score > current.score) ? prev : current);
        const color = isHighRisk ? '#ef4444' : (this.boxColors[topPred.class] || this.boxColors.default);
        item.innerHTML = `
        <div class="log-time">${now}</div>
        <div class="log-content">
            <div class="log-title">Detected: <span style="color:${color};font-weight:700">${objects}${isHighRisk ? ' (HIGH RISK)' : ''}</span></div>
            <div class="log-detail">Movement: ${topPred.isMoving ? 'Moving' : 'Stationary'} | Confidence: ${Math.round(topPred.score * 100)}%</div>
        </div>
    `;
        this.detectionLog.insertBefore(item, this.detectionLog.firstChild);
        this.saveToPersistentLog(objects, topPred, isHighRisk);
        while (this.detectionLog.children.length > this.maxLogEntries) {
            this.detectionLog.removeChild(this.detectionLog.lastChild);
        }
    }

    saveToPersistentLog(objects, topPred, isHighRisk) {
        try {
            const history = JSON.parse(localStorage.getItem('obstacleai_history') || '[]');
            const entry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                objects,
                topObject: topPred.class,
                isMoving: topPred.isMoving,
                riskLevel: isHighRisk ? 'High' : 'Low',
                confidence: Math.round(topPred.score * 100)
            };
            history.unshift(entry);
            if (history.length > 200) history.pop();
            localStorage.setItem('obstacleai_history', JSON.stringify(history));
        } catch (e) { console.error('History save failed:', e); }
    }

    updateStats(predictions) {
        this.fpsStat.textContent = this.currentFps + ' FPS';
        this.objectsStat.textContent = predictions.length + ' obj';
    }

    sendAlert() {
        const objects = this._lastLogObjects || 'Obstacles';
        if (window.triggerEmergencyAlert) {
            window.triggerEmergencyAlert(objects);
        } else {
            this.showToast('Alert system unavailable', 'error');
        }
    }

    setStatus(text, type) {
        this.statusText.textContent = text;
        this.statusDot.className = 'status-dot ' + type;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
        <div class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '!' : 'i'}</div>
        <div class="toast-message">${message}</div>
    `;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        });
        setTimeout(() => {
            toast.style.transform = 'translateY(100%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.detector = new ObstacleDetector();
});