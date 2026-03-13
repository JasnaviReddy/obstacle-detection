// Set up a global flag to coordinate with detector
window.voiceAssistantActive = false;

class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentLang = 'en-US';
        this.languages = {
            en: { code: 'en-US', name: 'English' },
            hi: { code: 'hi-IN', name: 'Hindi' },
            te: { code: 'te-IN', name: 'Telugu' }
        };
        this.activeLang = 'en';
        this.isProcessing = false;
        this.feedbackEl = null;
        this.responses = {
            en: {
                greeting: "Hi! I'm your ObstacleAI assistant. Say help for commands.",
                commands: "Say: start camera, stop camera, flip camera, sound on, sound off, go home, open detection, send alert, switch to Hindi, switch to Telugu.",
                cameraStarted: "Camera started.",
                cameraStopped: "Camera stopped.",
                cameraFlipped: "Camera flipped.",
                soundOn: "Sound on.",
                soundOff: "Sound off.",
                navigating: "Going to ",
                alertSent: "Emergency alert sent to your contacts!",
                alertFailed: "No emergency contacts. Go to Profile to add them.",
                langSwitch: "Switched to ",
                notUnderstood: "Didn't catch that. Say help for commands.",
                helpTriggered: "Emergency! Sending alert to your contacts!",
                listening: "Listening..."
            },
            hi: {
                greeting: "Namaste! Main ObstacleAI sahayak hoon. Help boliye.",
                commands: "Boliye: camera chalu, camera band, camera badlo, awaaz chalu, awaaz band, ghar jao, detection kholo, alert bhejo.",
                cameraStarted: "Camera chalu.",
                cameraStopped: "Camera band.",
                cameraFlipped: "Camera badal gaya.",
                soundOn: "Awaaz chalu.",
                soundOff: "Awaaz band.",
                navigating: "Jaa rahe hain ",
                alertSent: "Alert bhej diya!",
                alertFailed: "Contacts nahi hain. Profile mein add karein.",
                langSwitch: "Bhasha: ",
                notUnderstood: "Samajh nahi aaya. Help boliye.",
                helpTriggered: "Emergency! Alert bhej raha hoon!",
                listening: "Sun raha hoon..."
            },
            te: {
                greeting: "Namaskaram! Nenu ObstacleAI assistant. Help cheppandi.",
                commands: "Cheppandi: camera start, camera stop, camera flip, sound on, sound off, home vellandi, detection teeyandi, alert pampandi.",
                cameraStarted: "Camera start.",
                cameraStopped: "Camera aagindi.",
                cameraFlipped: "Camera flip.",
                soundOn: "Sound on.",
                soundOff: "Sound off.",
                navigating: "Veltunnamu ",
                alertSent: "Alert pampabadindi!",
                alertFailed: "Contacts ledhu. Profile lo add cheyandi.",
                langSwitch: "Bhasha: ",
                notUnderstood: "Artham kaaledu. Help cheppandi.",
                helpTriggered: "Emergency! Alert pamputhunnanu!",
                listening: "Vintunnanu..."
            }
        };
        this.init();
    }

    init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech Recognition not supported');
            this.createUI();
            return;
        }
        this.createUI();
        this.setupRecognition();
        setTimeout(() => this.startListening(), 1000);
    }

    setupRecognition() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SR();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.languages[this.activeLang].code;
        this.recognition.maxAlternatives = 5;
        this.recognition.onresult = (e) => {
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    let best = '';
                    for (let j = 0; j < e.results[i].length; j++) {
                        const a = e.results[i][j].transcript.trim().toLowerCase();
                        if (a.length > best.length) best = a;
                    }
                    console.log('[Voice]', best);
                    this.processCommand(best);
                }
            }
        };
        this.recognition.onend = () => {
            if (this.isListening) setTimeout(() => { try { this.recognition.start() } catch (e) { } }, 300);
        };
        this.recognition.onerror = (e) => {
            if (e.error === 'not-allowed') this.updateFeedback('Allow microphone access');
            if (['no-speech', 'aborted', 'network', 'audio-capture'].includes(e.error) && this.isListening) {
                setTimeout(() => { try { this.recognition.start() } catch (e) { } }, 1000);
            }
        };
    }

    processCommand(t) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        const r = this.responses[this.activeLang];
        this.updateFeedback('"' + t + '"');
        const c = t.replace(/\s+/g, ' ').trim();
        const m = this.f(c, ['help', 'madad', 'bachao', 'sahayam', 'emergency', 'bachav', 'bacha', 'sahay', 'madat', 'helpu']) ? 'help'
            : this.f(c, ['start camera', 'camera start', 'start detection', 'camera chalu', 'chalu karo', 'shuru karo', 'shuru', 'camera on', 'chalu', 'kamera start', 'camera teeyandi', 'teeyandi', 'start']) ? 'startCam'
                : this.f(c, ['stop camera', 'camera stop', 'stop detection', 'camera band', 'band karo', 'ruko', 'camera off', 'band', 'kamera stop', 'camera aapandi', 'aapandi', 'stop']) ? 'stopCam'
                    : this.f(c, ['flip camera', 'camera flip', 'switch camera', 'camera badlo', 'badlo', 'front camera', 'back camera', 'camera badal', 'camera maarandi', 'flip']) ? 'flipCam'
                        : this.f(c, ['sound on', 'awaaz chalu', 'volume on', 'voice on', 'unmute', 'awaz chalu', 'sound chalu']) ? 'soundOn'
                            : this.f(c, ['sound off', 'awaaz band', 'volume off', 'voice off', 'mute', 'awaz band', 'sound band']) ? 'soundOff'
                                : this.f(c, ['go to home', 'go home', 'ghar jao', 'ghar', 'home page', 'home', 'main page', 'home ki vellandi', 'intiki vellandi']) ? 'goHome'
                                    : this.f(c, ['go to detection', 'open camera', 'detection jao', 'detection kholo', 'camera kholo', 'detect', 'detection ki vellandi', 'camera teeyandi', 'detection page', 'detection']) ? 'goDetect'
                                        : this.f(c, ['login', 'log in', 'sign in']) ? 'goLogin'
                                            : this.f(c, ['sign up', 'signup', 'register']) ? 'goSignup'
                                                : this.f(c, ['profile', 'emergency contact', 'contacts', 'settings', 'mera profile']) ? 'goProfile'
                                                    : this.f(c, ['send alert', 'alert bhejo', 'alert pampandi', 'emergency alert', 'call for help']) ? 'sendAlert'
                                                        : this.f(c, ['switch to hindi', 'hindi', 'hindi mein', 'hindi me', 'hindi lo']) ? 'langHi'
                                                            : this.f(c, ['switch to telugu', 'telugu', 'telugu mein', 'telugu me', 'telugu lo']) ? 'langTe'
                                                                : this.f(c, ['switch to english', 'english', 'english mein', 'english me', 'angrezi']) ? 'langEn'
                                                                    : this.f(c, ['hello', 'hi', 'hey', 'namaste', 'namaskaram']) ? 'greet'
                                                                        : null;

        switch (m) {
            case 'help':
                if (window.location.pathname.includes('detect')) {
                    this.speak(r.helpTriggered);
                    this.triggerAlert();
                } else {
                    this.speak(r.commands);
                }
                break;
            case 'startCam': this.exec('start'); this.speak(r.cameraStarted); break;
            case 'stopCam': this.exec('stop'); this.speak(r.cameraStopped); break;
            case 'flipCam': this.exec('flip'); this.speak(r.cameraFlipped); break;
            case 'soundOn': this.exec('soundOn'); this.speak(r.soundOn); break;
            case 'soundOff': this.exec('soundOff'); this.speak(r.soundOff); break;
            case 'goHome': this.speak(r.navigating + 'Home'); setTimeout(() => window.location.href = 'index.html', 1500); break;
            case 'goDetect': this.speak(r.navigating + 'Detection'); setTimeout(() => window.location.href = 'detect.html', 1500); break;
            case 'goLogin': this.speak(r.navigating + 'Login'); setTimeout(() => window.location.href = 'login.html', 1500); break;
            case 'goSignup': this.speak(r.navigating + 'Sign Up'); setTimeout(() => window.location.href = 'signup.html', 1500); break;
            case 'goProfile': this.speak(r.navigating + 'Profile'); setTimeout(() => window.location.href = 'profile.html', 1500); break;
            case 'sendAlert': this.speak(r.helpTriggered); this.triggerAlert(); break;
            case 'langHi': this.switchLang('hi'); break;
            case 'langTe': this.switchLang('te'); break;
            case 'langEn': this.switchLang('en'); break;
            case 'greet': this.speak(r.greeting); break;
            default: this.speak(r.notUnderstood);
        }
        this.isProcessing = false;
    }

    f(t, kws) {
        return kws.some(kw => {
            if (t.includes(kw)) return true;
            const tw = t.split(' '), ks = kw.split(' ');
            if (ks.every(k => tw.some(w => w === k || this.sim(w, k)))) return true;
            if (ks.length === 1 && tw.some(w => this.sim(w, kw))) return true;
            return false;
        });
    }

    sim(a, b) {
        if (a === b) return true;
        if (Math.abs(a.length - b.length) > 2) return false;
        if (a.length < 3) return a === b;
        if (a.includes(b) || b.includes(a)) return true;
        let d = 0;
        const m = Math.max(a.length, b.length);
        for (let i = 0; i < m; i++) if (a[i] !== b[i]) d++;
        return d <= Math.floor(m * 0.3);
    }

    exec(cmd) {
        if (!window.detector) return;
        switch (cmd) {
            case 'start': if (!window.detector.isRunning) window.detector.toggleDetection(); break;
            case 'stop': if (window.detector.isRunning) window.detector.toggleDetection(); break;
            case 'flip': window.detector.switchCamera(); break;
            case 'soundOn':
                window.detector.speechEnabled = true;
                document.getElementById('toggleSoundBtn')?.classList.add('active');
                break;
            case 'soundOff':
                window.detector.speechEnabled = false;
                document.getElementById('toggleSoundBtn')?.classList.remove('active');
                break;
        }
    }

    triggerAlert() {
        const user = JSON.parse(localStorage.getItem('obstacleai_user') || '{}');
        const contacts = JSON.parse(localStorage.getItem('obstacleai_emergency_contacts') || '[]');
        const r = this.responses[this.activeLang];
        if (contacts.length === 0) { this.speak(r.alertFailed); return }
        const obj = window.detector?._lastLogObjects || 'obstacles';
        const msg = 'EMERGENCY: ' + (user.name || 'User') + ' needs help! Detected: ' + obj;
        this.flashAlert();
        let sent = 0, failed = 0;
        const promises = contacts.map(c =>
            fetch('/api/alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmail: user.email || 'unknown',
                    phone: c.phone,
                    contactName: c.name,
                    detectedObjects: obj,
                    timestamp: new Date().toISOString(),
                    message: msg
                })
            }).then(async res => {
                const data = await res.json();
                if (!res.ok) {
                    console.error('[Alert] FAILED for ' + c.name + ':', data.message);
                    failed++;
                    this.showToast('SMS FAILED for ' + c.name + ': ' + data.message, 'error');
                } else {
                    console.log('[Alert] Sent to ' + c.name + ':', data.message);
                    sent++;
                }
            }).catch(e => {
                console.error('[Alert] Network error for ' + c.name + ':', e.message);
                failed++;
                this.showToast('SMS FAILED for ' + c.name + ' (network error)', 'error');
            })
        );
        Promise.all(promises).then(() => {
            if (sent > 0) {
                this.speak(r.alertSent);
                this.showToast('Emergency SMS sent to ' + sent + ' contact(s)!', 'success');
            } else {
                this.speak('Alert failed. Check your Twilio setup.');
            }
        });
    }

    flashAlert() {
        const o = document.createElement('div');
        o.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;pointer-events:none;animation:af .4s ease 4';
        document.body.appendChild(o);
        if (!document.getElementById('afs')) {
            const s = document.createElement('style');
            s.id = 'afs';
            s.textContent = '@keyframes af{0%,100%{background:transparent}50%{background:rgba(239,68,68,0.25)}}';
            document.head.appendChild(s);
        }
        setTimeout(() => o.remove(), 2000);
    }

    switchLang(lang) {
        this.activeLang = lang;
        const li = this.languages[lang];
        this.currentLang = li.code;
        if (this.recognition) {
            this.recognition.lang = li.code;
            try { this.recognition.stop() } catch (e) { }
            setTimeout(() => { try { this.recognition.start() } catch (e) { } }, 500);
        }
        this.speak(this.responses[lang].langSwitch + li.name);
        const el = document.getElementById('langIndicator');
        if (el) el.textContent = lang.toUpperCase();
    }

    speak(text) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        if (this.recognition) try { this.recognition.stop() } catch (e) { }
        /* Temporarily mark assistant as not listening while speaking to avoid self-trigger */
        window.voiceAssistantActive = false;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = this.currentLang;
        u.rate = 1;
        u.pitch = 1;
        u.volume = 1;
        u.onend = () => {
            /* Add a slightly longer delay to avoid picking up own voice */
            setTimeout(() => {
                if (this.isListening && this.recognition) {
                    window.voiceAssistantActive = true;
                    try { this.recognition.start() } catch (e) { }
                }
            }, 900);
        };
        window.speechSynthesis.speak(u);
        this.updateFeedback(text);
    }

    startListening() {
        this.isListening = true;
        window.voiceAssistantActive = true;
        if (this.recognition) try { this.recognition.start() } catch (e) { }
        this.updateFeedback(this.responses[this.activeLang].listening);
        const b = document.getElementById('voiceAssistantBtn');
        if (b) b.className = 'va-listening';
    }

    stopListening() {
        this.isListening = false;
        window.voiceAssistantActive = false;
        if (this.recognition) try { this.recognition.stop() } catch (e) { }
        const b = document.getElementById('voiceAssistantBtn');
        if (b) b.className = 'va-paused';
        this.updateFeedback('Paused. Tap mic to resume.');
    }

    toggleListening() {
        if (this.isListening) this.stopListening();
        else this.startListening();
    }

    showToast(msg, type = 'info') {
        let c = document.querySelector('.toast-container');
        if (!c) {
            c = document.createElement('div');
            c.className = 'toast-container';
            c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px';
            document.body.appendChild(c);
        }
        const t = document.createElement('div');
        const bc = type === 'success' ? 'rgba(16,185,129,0.4)' : type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(124,58,237,0.4)';
        t.style.cssText = 'padding:12px 20px;border-radius:12px;background:rgba(18,18,26,0.95);border:1px solid ' + bc + ';color:#f1f5f9;font-size:.85rem;font-weight:500;font-family:Inter,sans-serif;backdrop-filter:blur(10px);max-width:300px';
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300) }, 4000);
    }

    createUI() {
        const dp = document.body.classList.contains('detect-page');
        const btn = document.createElement('button');
        btn.id = 'voiceAssistantBtn';
        btn.className = 'va-listening';
        btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
        btn.addEventListener('click', () => this.toggleListening());
        document.body.appendChild(btn);

        const lb = document.createElement('button');
        lb.id = 'langIndicator';
        lb.textContent = 'EN';
        lb.addEventListener('click', () => {
            const ls = ['en', 'hi', 'te'];
            this.switchLang(ls[(ls.indexOf(this.activeLang) + 1) % ls.length]);
        });
        document.body.appendChild(lb);

        this.feedbackEl = document.createElement('div');
        this.feedbackEl.id = 'voiceFeedback';
        document.body.appendChild(this.feedbackEl);

        const s = document.createElement('style');
        s.textContent = '#voiceAssistantBtn{position:fixed;bottom:' + (dp ? '120' : '100') + 'px;right:20px;z-index:9999;width:56px;height:56px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;transition:all .3s}#voiceAssistantBtn.va-listening{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 0 20px rgba(16,185,129,0.4);animation:vaPulse 2s ease-in-out infinite}#voiceAssistantBtn.va-paused{background:rgba(100,116,139,0.5);box-shadow:none;animation:none}@keyframes vaPulse{0%,100%{box-shadow:0 0 20px rgba(16,185,129,0.4)}50%{box-shadow:0 0 35px rgba(16,185,129,0.6),0 0 70px rgba(16,185,129,0.2)}}#langIndicator{position:fixed;bottom:' + (dp ? '185' : '165') + 'px;right:28px;z-index:9999;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.1);color:#a78bfa;display:flex;align-items:center;justify-content:center;border:1px solid rgba(124,58,237,0.3);cursor:pointer;font-size:.7rem;font-weight:700;font-family:Inter,sans-serif;backdrop-filter:blur(10px)}#voiceFeedback{position:fixed;bottom:' + (dp ? '120' : '100') + 'px;right:86px;z-index:9998;padding:10px 16px;border-radius:12px 12px 0 12px;background:rgba(18,18,26,0.95);border:1px solid rgba(124,58,237,0.3);color:#f1f5f9;font-size:.8rem;max-width:260px;font-family:Inter,sans-serif;opacity:0;transition:opacity .3s;pointer-events:none;backdrop-filter:blur(10px)}';
        document.head.appendChild(s);
    }

    updateFeedback(text) {
        if (!this.feedbackEl) return;
        this.feedbackEl.textContent = text;
        this.feedbackEl.style.opacity = '1';
        clearTimeout(this._ft);
        this._ft = setTimeout(() => { this.feedbackEl.style.opacity = '0' }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => { window.voiceAssistant = new VoiceAssistant() });