window.voiceAssistantActive = false;
window._ttsActive = false;

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
        this.activeLang = localStorage.getItem('obstacleai_lang') || 'en';
        this.isListening = localStorage.getItem('obstacleai_listening') === 'true';
        this.isProcessing = false;
        this.voices = [];
        this.selectedVoices = {};
        this.isSpeaking = false;
        this.lastSpeakTime = 0;
        this.utterances = [];

        // ============================
        // TTS RESPONSES - Native script for proper pronunciation
        // ============================
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
                listening: "Listening...",
                objects: {
                    person: "person", car: "car", dog: "dog", cat: "cat", motorcycle: "motorcycle",
                    bicycle: "bicycle", truck: "truck", bus: "bus", chair: "chair", bottle: "bottle",
                    onLeft: "on your left", onRight: "on your right", atCenter: "in front",
                    veryClose: "very close", close: "close", medium: "at medium distance", far: "far away"
                }
            },
            hi: {
                greeting: "नमस्ते! मैं आपका ObstacleAI सहायक हूँ। Help बोलिए।",
                commands: "बोलिए: कैमरा चालू, कैमरा बंद, कैमरा बदलो, आवाज़ चालू, आवाज़ बंद, घर जाओ, डिटेक्शन खोलो, अलर्ट भेजो।",
                cameraStarted: "कैमरा चालू हो गया।",
                cameraStopped: "कैमरा बंद हो गया।",
                cameraFlipped: "कैमरा बदल गया।",
                soundOn: "आवाज़ चालू।",
                soundOff: "आवाज़ बंद।",
                navigating: "जा रहे हैं ",
                alertSent: "अलर्ट भेज दिया गया!",
                alertFailed: "इमरजेंसी कॉन्टैक्ट नहीं हैं। प्रोफाइल में जोड़ें।",
                langSwitch: "भाषा बदली: ",
                notUnderstood: "समझ नहीं आया। Help बोलिए।",
                helpTriggered: "इमरजेंसी! कॉन्टैक्ट्स को अलर्ट भेज रहा हूँ!",
                listening: "सुन रहा हूँ...",
                objects: {
                    person: "इंसान", car: "गाड़ी", dog: "कुत्ता", cat: "बिल्ली", motorcycle: "मोटरसाइकिल",
                    bicycle: "साइकिल", truck: "ट्रक", bus: "बस", chair: "कुर्सी", bottle: "बोतल",
                    onLeft: "आपके बाएं", onRight: "आपके दाएं", atCenter: "सामने",
                    veryClose: "बहुत पास", close: "पास", medium: "मध्यम दूरी पर", far: "दूर"
                }
            },
            te: {
                greeting: "నమస్కారం! నేను ObstacleAI అసిస్టెంట్ ని. Help చెప్పండి.",
                commands: "చెప్పండి: కెమెరా స్టార్ట్, కెమెరా స్టాప్, కెమెరా ఫ్లిప్, సౌండ్ ఆన్, సౌండ్ ఆఫ్, హోమ్ వెళ్ళండి, డిటెక్షన్ తీయండి, అలర్ట్ పంపండి.",
                cameraStarted: "కెమెరా స్టార్ట్ అయ్యింది.",
                cameraStopped: "కెమెరా ఆగింది.",
                cameraFlipped: "కెమెరా ఫ్లిప్ అయ్యింది.",
                soundOn: "సౌండ్ ఆన్ అయ్యింది.",
                soundOff: "సౌండ్ ఆఫ్ అయ్యింది.",
                navigating: "వెళ్తున్నాము ",
                alertSent: "అలర్ట్ పంపబడింది!",
                alertFailed: "కాంటాక్ట్స్ లేవు. ప్రొఫైల్ లో యాడ్ చేయండి.",
                langSwitch: "భాష మార్పబడింది: ",
                notUnderstood: "అర్థం కాలేదు. Help చెప్పండి.",
                helpTriggered: "ఎమర్జెన్సీ! కాంటాక్ట్స్ కి అలర్ట్ పంపుతున్నాను!",
                listening: "వింటున్నాను...",
                objects: {
                    person: "వ్యక్తి", car: "కారు", dog: "కుక్క", cat: "పిల్లి", motorcycle: "మోటార్ సైకిల్",
                    bicycle: "సైకిల్", truck: "ట్రక్కు", bus: "బస్సు", chair: "కుర్చీ", bottle: "సీసా",
                    onLeft: "మీ ఎడమ వైపు", onRight: "మీ కుడి వైపు", atCenter: "ముందు",
                    veryClose: "చాలా దగ్గర", close: "దగ్గర", medium: "మధ్యస్థంగా", far: "దూరంగా"
                }
            }
        };

        // ============================
        // COMMAND KEYWORDS - Roman + Native Script for ALL languages
        // ============================
        this.CMD = {
            help: ['help', 'madad', 'bachao', 'sahayam', 'emergency', 'madat', 'bachav', 'sahayamu', 'helpu',
                'मदद', 'बचाओ', 'बचाव', 'सहायता',
                'సహాయం', 'కాపాడండి', 'హెల్ప్'],
            startCam: ['start camera', 'camera start', 'start detection', 'camera on', 'start',
                'camera chalu', 'chalu karo', 'shuru karo', 'shuru', 'chalu',
                'camera teeyandi', 'teeyandi', 'open camera',
                'कैमरा चालू', 'चालू करो', 'शुरू करो', 'शुरू', 'चालू',
                'కెమెరా స్టార్ట్', 'స్టార్ట్', 'కెమెరా తీయండి', 'తీయండి', 'కెమెరా ఆన్'],
            stopCam: ['stop camera', 'camera stop', 'stop detection', 'camera off', 'stop',
                'camera band', 'band karo', 'ruko', 'band',
                'camera aapandi', 'aapandi', 'close camera',
                'कैमरा बंद', 'बंद करो', 'रुको', 'बंद',
                'కెమెరా స్టాప్', 'ఆపండి', 'ఆపు', 'కెమెరా ఆఫ్'],
            flipCam: ['flip camera', 'switch camera', 'camera flip', 'front camera', 'back camera',
                'camera badlo', 'badlo',
                'कैमरा बदलो', 'बदलो',
                'కెమెరా ఫ్లిప్', 'కెమెరా మార్చండి'],
            soundOn: ['sound on', 'volume on', 'voice on', 'unmute',
                'awaaz chalu', 'awaz chalu', 'sound chalu',
                'आवाज़ चालू', 'आवाज चालू',
                'సౌండ్ ఆన్', 'సౌండ్ చాలూ'],
            soundOff: ['sound off', 'volume off', 'voice off', 'mute',
                'awaaz band', 'awaz band', 'sound band',
                'आवाज़ बंद', 'आवाज बंद',
                'సౌండ్ ఆఫ్', 'సౌండ్ బంద్'],
            goHome: ['go home', 'go to home', 'home page', 'home', 'go back',
                'ghar jao', 'ghar', 'main page',
                'intiki', 'home ki vellandi', 'intiki vellandi',
                'घर जाओ', 'घर', 'होम',
                'ఇంటికి వెళ్ళండి', 'హోమ్', 'ఇంటికి', 'ఇంటికొచ్చాను'],
            goDetect: ['go to detection', 'go detection', 'open detection', 'detection page', 'detect',
                'detection jao', 'camera page', 'detection ki vellandi',
                'detection kholo', 'camera kholo', 'डिटेक्शन जाओ',
                'डिटेक्शन खोलो', 'कैमरा खोलो',
                'డిటెక్షన్ తీయండి', 'కెమెరా తీయండి', 'డిటెక్షన్ కి వెళ్ళండి'],
            goLogin: ['go to login', 'login', 'log in', 'sign in',
                'लॉगिन', 'లాగిన్'],
            goSignup: ['go to signup', 'sign up', 'signup', 'register', 'create account',
                'साइन अप', 'సైన్ అప్'],
            goProfile: ['go to profile', 'profile', 'emergency contacts', 'contacts', 'settings',
                'mera profile',
                'प्रोफाइल', 'कॉन्टैक्ट्स',
                'ప్రొఫైల్', 'కాంటాక్ట్స్'],
            sendAlert: ['send alert', 'alert bhejo', 'alert pampu', 'emergency alert', 'call for help',
                'अलर्ट भेजो',
                'అలర్ట్ పంపండి'],
            langHi: ['switch to hindi', 'hindi', 'hindi mode', 'hindi mein',
                'हिंदी', 'हिन्दी',
                'హిందీ'],
            langTe: ['switch to telugu', 'telugu', 'telugu mode', 'telugu mein', 'telugu lo',
                'तेलुगु',
                'తెలుగు'],
            langEn: ['switch to english', 'english', 'english mode', 'english mein', 'angrezi',
                'अंग्रेज़ी', 'इंग्लिश',
                'ఇంగ్లీష్'],
            greet: ['hello', 'hi', 'hey', 'namaste', 'namaskar', 'namaskaram', 'good morning', 'good evening',
                'नमस्ते', 'नमस्कार',
                'నమస్కారం', 'నమస్తే']
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
        this.handleMicPermission();
    }

    async handleMicPermission() {
        const startAssistant = () => {
            this.setupRecognition();
            if (this.isListening) { this.startListening(); } else { this.stopListening(); }
            if (!sessionStorage.getItem('obstacleai_greeted')) {
                this.speak(this.responses[this.activeLang].greeting);
                sessionStorage.setItem('obstacleai_greeted', 'true');
            }
        };
        if ('speechSynthesis' in window) {
            const loadVoices = () => { this.voices = window.speechSynthesis.getVoices(); this.updateSelectedVoices(); };
            loadVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) { window.speechSynthesis.onvoiceschanged = loadVoices; }
        }
        try {
            const status = await navigator.permissions.query({ name: 'microphone' });
            if (status.state === 'granted') { startAssistant(); return; }
        } catch (e) { }
        const trigger = () => {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => { stream.getTracks().forEach(t => t.stop()); const overlay = document.getElementById('va-start-overlay'); if (overlay) overlay.remove(); startAssistant(); })
                .catch(() => { this.showToast('Mic Blocked: Tap Lock/Aa icon in address bar to allow Microphone!', 'error'); this.updateFeedback('Tap Lock/Aa icon to Allow Mic'); });
            document.removeEventListener('click', trigger);
            document.removeEventListener('touchstart', trigger);
        };
        if (!this.isListening && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/')) {
            const overlay = document.createElement('div'); overlay.id = 'va-start-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;cursor:pointer';
            overlay.innerHTML = '<div style="background:rgba(255,255,255,0.1);padding:40px;border-radius:30px;border:1px solid rgba(139,92,246,0.3);text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.4);animation:overlayIn .8s cubic-bezier(.17,.67,.83,.67)"><div style="font-size:3rem;margin-bottom:20px">🎙️</div><h2 style="font-size:1.5rem;margin-bottom:12px;font-family:Outfit,Inter,sans-serif">Tap to Start AI Assistant</h2><p style="color:#a78bfa;font-size:0.9rem;opacity:0.8;max-width:240px">This enables real-time obstacle voice navigation.</p></div><style>@keyframes overlayIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}</style>';
            document.body.appendChild(overlay);
        }
        document.addEventListener('click', trigger);
        document.addEventListener('touchstart', trigger);
    }

    setupRecognition() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SR();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = this.languages[this.activeLang].code;
        this.recognition.maxAlternatives = 5;
        this.recognition.onstart = () => { console.log('[Voice] Recognition started in', this.recognition.lang); this.updateFeedback(this.responses[this.activeLang].listening); };
        this.recognition.onresult = (e) => {
            if (window._ttsActive || this.isSpeaking || window.speechSynthesis.speaking) { console.log('[Voice] Ignoring - TTS active'); return; }
            let best = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    for (let j = 0; j < e.results[i].length; j++) {
                        const a = e.results[i][j].transcript.trim().toLowerCase();
                        if (a.length > best.length) best = a;
                    }
                }
            }
            if (!best) return;
            // Always allow emergency commands regardless of timing or buffers
            const isEmergency = this.matchCmd(best) === 'help' || this.matchCmd(best) === 'sendAlert';
            if (isEmergency) {
                console.log('[Voice] EMERGENCY detected:', best);
                this.processCommand(best);
                return;
            }
            if (Date.now() - this.lastSpeakTime < 1500) { console.log('[Voice] Ignoring - echo buffer (non-emergency)'); return; }
            console.log('[Voice] Processing:', best);
            this.processCommand(best);
        };
        this.recognition.onend = () => {
            if (this.isListening) { setTimeout(() => { if (this.isListening && !window._ttsActive && !window.speechSynthesis.speaking) { try { this.recognition.start(); } catch (e) { } } }, 500); }
        };
        this.recognition.onerror = (e) => {
            if (e.error === 'not-allowed') { this.updateFeedback('Mic Blocked: Check browser settings'); }
            if (['no-speech', 'aborted', 'network', 'audio-capture'].includes(e.error) && this.isListening) {
                setTimeout(() => { if (this.isListening && !window._ttsActive && !window.speechSynthesis.speaking) { try { this.recognition.start(); } catch (e) { } } }, 1200);
            }
        };
    }

    // Match command from transcript - checks Roman + Native script keywords
    matchCmd(transcript) {
        for (const [cmd, keywords] of Object.entries(this.CMD)) {
            for (const kw of keywords) {
                if (transcript.includes(kw)) return cmd;
                const tw = transcript.split(' '), ks = kw.split(' ');
                if (ks.length > 1 && ks.every(k => tw.some(t => t === k || this.sim(t, k)))) return cmd;
                if (ks.length === 1 && tw.some(t => this.sim(t, kw))) return cmd;
            }
        }
        return null;
    }

    processCommand(t) {
        const c = t.replace(/\s+/g, ' ').trim();
        const m = this.matchCmd(c);
        // Emergency commands bypass the active check entirely
        if (m !== 'help' && m !== 'sendAlert' && !window.voiceAssistantActive) {
            console.log('[Voice] Ignoring command - assistant not in active state');
            return;
        }
        const r = this.responses[this.activeLang];
        this.updateFeedback('"' + t + '"');
        const c = t.replace(/\s+/g, ' ').trim();
        const m = this.matchCmd(c);

        switch (m) {
            case 'help':
                if (window.location.pathname.includes('detect')) { this.speak(r.helpTriggered); this.triggerAlert(); }
                else { this.speak(r.commands); }
                break;
            case 'startCam': this.exec('start'); this.speak(r.cameraStarted); break;
            case 'stopCam': this.exec('stop'); this.speak(r.cameraStopped); break;
            case 'flipCam': this.exec('flip'); this.speak(r.cameraFlipped); break;
            case 'soundOn': this.exec('soundOn'); this.speak(r.soundOn); break;
            case 'soundOff': this.exec('soundOff'); this.speak(r.soundOff); break;
            case 'goHome': this.speak(r.navigating + 'Home', () => window.location.href = 'index.html'); break;
            case 'goDetect': this.speak(r.navigating + 'Detection', () => window.location.href = 'detect.html'); break;
            case 'goLogin': this.speak(r.navigating + 'Login', () => window.location.href = 'login.html'); break;
            case 'goSignup': this.speak(r.navigating + 'Sign Up', () => window.location.href = 'signup.html'); break;
            case 'goProfile': this.speak(r.navigating + 'Profile', () => window.location.href = 'profile.html'); break;
            case 'sendAlert': this.speak(r.helpTriggered); this.triggerAlert(); break;
            case 'langHi': this.switchLang('hi'); break;
            case 'langTe': this.switchLang('te'); break;
            case 'langEn': this.switchLang('en'); break;
            case 'greet': this.speak(r.greeting); break;
            default: this.speak(r.notUnderstood);
        }
        this.isProcessing = false;
    }

    sim(a, b) {
        if (a === b) return true;
        if (Math.abs(a.length - b.length) > 2) return false;
        if (a.length < 3) return a === b;
        if (a.includes(b) || b.includes(a)) return true;
        let d = 0; const m = Math.max(a.length, b.length);
        for (let i = 0; i < m; i++) if (a[i] !== b[i]) d++;
        return d <= Math.floor(m * 0.3);
    }

    exec(cmd) {
        if (!window.detector) return;
        switch (cmd) {
            case 'start': if (!window.detector.isRunning) window.detector.toggleDetection(); break;
            case 'stop': if (window.detector.isRunning) window.detector.toggleDetection(); break;
            case 'flip': window.detector.switchCamera(); break;
            case 'soundOn': window.detector.speechEnabled = true; document.getElementById('toggleSoundBtn')?.classList.add('active'); break;
            case 'soundOff': window.detector.speechEnabled = false; document.getElementById('toggleSoundBtn')?.classList.remove('active'); break;
        }
    }

    triggerAlert() {
        const user = JSON.parse(localStorage.getItem('obstacleai_user') || '{}');
        const contacts = JSON.parse(localStorage.getItem('obstacleai_emergency_contacts') || '[]');
        const r = this.responses[this.activeLang];
        if (contacts.length === 0) { this.speak(r.alertFailed); return; }
        const obj = window.detector?._lastLogObjects || 'obstacles';
        const msg = 'EMERGENCY: ' + (user.name || 'User') + ' needs help! Detected: ' + obj;
        this.flashAlert();
        let sent = 0, failed = 0;

        // Use sequential sending with a delay to avoid Fast2SMS silent failures
        (async () => {
            for (const c of contacts) {
                try {
                    const res = await fetch('/api/alert', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userEmail: user.email || 'unknown', phone: c.phone, contactName: c.name, detectedObjects: obj, timestamp: new Date().toISOString(), message: msg })
                    });
                    if (res.ok) { sent++; } else { failed++; }
                } catch (e) { failed++; }
                // 1.5 second delay between multiple alerts
                if (contacts.length > 1) await new Promise(r => setTimeout(r, 1500));
            }

            if (sent > 0) {
                this.speak(this.responses[this.activeLang].alertSent);
                this.showToast('SMS sent to ' + sent + ' contact(s)!', 'success');
            } else {
                this.speak('Alert failed. Check Fast2SMS setup.');
            }
        })();
    }

    flashAlert() {
        const o = document.createElement('div');
        o.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;pointer-events:none;animation:af .4s ease 4';
        document.body.appendChild(o);
        if (!document.getElementById('afs')) { const s = document.createElement('style'); s.id = 'afs'; s.textContent = '@keyframes af{0%,100%{background:transparent}50%{background:rgba(239,68,68,0.25)}}'; document.head.appendChild(s); }
        setTimeout(() => o.remove(), 2000);
    }

    switchLang(lang) {
        this.activeLang = lang;
        localStorage.setItem('obstacleai_lang', lang);
        const li = this.languages[lang];
        this.currentLang = li.code;
        if (this.recognition) {
            this.recognition.lang = li.code;
            try { this.recognition.stop(); } catch (e) { }
            if (this.isListening) { setTimeout(() => { try { this.recognition.start(); } catch (e) { } }, 500); }
        }
        this.speak(this.responses[lang].langSwitch + li.name);
        const el = document.getElementById('langIndicator');
        if (el) el.textContent = lang.toUpperCase();
    }

    updateSelectedVoices() {
        const priority = ['google', 'microsoft', 'native'];
        ['en-US', 'hi-IN', 'te-IN'].forEach(code => {
            let matches = this.voices.filter(v => v.lang.replace('_', '-') === code || v.lang.startsWith(code.split('-')[0]));
            if (matches.length > 1) {
                matches.sort((a, b) => {
                    const ap = priority.findIndex(p => a.name.toLowerCase().includes(p));
                    const bp = priority.findIndex(p => b.name.toLowerCase().includes(p));
                    return (ap === -1 ? 99 : ap) - (bp === -1 ? 99 : bp);
                });
            }
            if (matches.length > 0) this.selectedVoices[code] = matches[0];
        });
        console.log('[Voice] Selected voices:', this.selectedVoices);
    }

    speak(text, callback) {
        if (!('speechSynthesis' in window)) { if (callback) callback(); return; }
        window.speechSynthesis.cancel();
        this.isSpeaking = true; window._ttsActive = true; window.voiceAssistantActive = false;
        if (this.recognition) { try { this.recognition.abort(); } catch (e) { } }

        const u = new SpeechSynthesisUtterance(text);
        this.utterances.push(u); if (this.utterances.length > 5) this.utterances.shift();
        u.lang = this.currentLang;
        if (this.selectedVoices[this.currentLang]) { u.voice = this.selectedVoices[this.currentLang]; }
        u.rate = 0.95; u.pitch = 1; u.volume = 1;

        let handled = false;
        const done = () => {
            if (handled) return; handled = true;
            this.isSpeaking = false; this.lastSpeakTime = Date.now();
            if (callback) { callback(); return; }
            setTimeout(() => {
                window._ttsActive = false;
                if (this.isListening && this.recognition && !window.speechSynthesis.speaking) {
                    window.voiceAssistantActive = true;
                    try { this.recognition.start(); } catch (e) { }
                }
            }, 600); // Reduced delay from 1200ms
        };
        u.onend = done;
        u.onerror = (e) => { console.error('[Voice] Speak Error:', e); done(); };
        if (callback) { setTimeout(() => { if (!handled) done(); }, 3000); }
        window.speechSynthesis.speak(u);
        this.updateFeedback(text);
    }

    speakDetection(text) {
        if (this.isSpeaking || window.speechSynthesis.speaking || window._ttsActive) { return; }
        this.speak(text);
    }

    startListening() {
        this.isListening = true; localStorage.setItem('obstacleai_listening', 'true');
        window.voiceAssistantActive = true;
        if (this.recognition) { try { this.recognition.start(); } catch (e) { } }
        this.updateFeedback(this.responses[this.activeLang].listening);
        const b = document.getElementById('voiceAssistantBtn'); if (b) b.className = 'va-listening';
    }

    stopListening() {
        this.isListening = false; localStorage.setItem('obstacleai_listening', 'false');
        window.voiceAssistantActive = false;
        if (this.recognition) try { this.recognition.stop(); } catch (e) { }
        const b = document.getElementById('voiceAssistantBtn'); if (b) b.className = 'va-paused';
        this.updateFeedback('Paused. Tap mic to resume.');
    }

    toggleListening() { if (this.isListening) this.stopListening(); else this.startListening(); }

    showToast(msg, type = 'info') {
        let c = document.querySelector('.toast-container');
        if (!c) { c = document.createElement('div'); c.className = 'toast-container'; c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px'; document.body.appendChild(c); }
        const t = document.createElement('div');
        const bc = type === 'success' ? 'rgba(16,185,129,0.4)' : type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(124,58,237,0.4)';
        t.style.cssText = 'padding:12px 20px;border-radius:12px;background:rgba(18,18,26,0.95);border:1px solid ' + bc + ';color:#f1f5f9;font-size:.85rem;font-weight:500;font-family:Inter,sans-serif;backdrop-filter:blur(10px);max-width:300px';
        t.textContent = msg; c.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 4000);
    }

    createUI() {
        const dp = document.body.classList.contains('detect-page');
        const btn = document.createElement('button'); btn.id = 'voiceAssistantBtn'; btn.className = 'va-listening';
        btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
        btn.addEventListener('click', () => this.toggleListening()); document.body.appendChild(btn);
        const lb = document.createElement('button'); lb.id = 'langIndicator'; lb.textContent = (this.activeLang || 'en').toUpperCase();
        lb.addEventListener('click', () => { const ls = ['en', 'hi', 'te']; this.switchLang(ls[(ls.indexOf(this.activeLang) + 1) % ls.length]); });
        document.body.appendChild(lb);
        this.feedbackEl = document.createElement('div'); this.feedbackEl.id = 'voiceFeedback'; document.body.appendChild(this.feedbackEl);
        const s = document.createElement('style');
        s.textContent = '#voiceAssistantBtn{position:fixed;bottom:' + (dp ? '120' : '100') + 'px;right:20px;z-index:9999;width:56px;height:56px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;transition:all .3s}#voiceAssistantBtn.va-listening{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 0 20px rgba(16,185,129,0.4);animation:vaPulse 2s ease-in-out infinite}#voiceAssistantBtn.va-paused{background:rgba(100,116,139,0.5);box-shadow:none;animation:none}@keyframes vaPulse{0%,100%{box-shadow:0 0 20px rgba(16,185,129,0.4)}50%{box-shadow:0 0 35px rgba(16,185,129,0.6),0 0 70px rgba(16,185,129,0.2)}}#langIndicator{position:fixed;bottom:' + (dp ? '185' : '165') + 'px;right:28px;z-index:9999;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.1);color:#a78bfa;display:flex;align-items:center;justify-content:center;border:1px solid rgba(124,58,237,0.3);cursor:pointer;font-size:.7rem;font-weight:700;font-family:Inter,sans-serif;backdrop-filter:blur(10px)}#voiceFeedback{position:fixed;bottom:' + (dp ? '120' : '100') + 'px;right:86px;z-index:9998;padding:10px 16px;border-radius:12px 12px 0 12px;background:rgba(18,18,26,0.95);border:1px solid rgba(124,58,237,0.3);color:#f1f5f9;font-size:.8rem;max-width:260px;font-family:Inter,sans-serif;opacity:0;transition:opacity .3s;pointer-events:none;backdrop-filter:blur(10px)}';
        document.head.appendChild(s);
    }

    updateFeedback(text) {
        if (!this.feedbackEl) return;
        this.feedbackEl.textContent = text; this.feedbackEl.style.opacity = '1';
        clearTimeout(this._ft); this._ft = setTimeout(() => { this.feedbackEl.style.opacity = '0'; }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const delay = window.location.pathname.includes('detect') ? 500 : 2000;
    setTimeout(() => {
        window.voiceAssistant = new VoiceAssistant();
        window.triggerEmergencyAlert = (obj) => { if (window.voiceAssistant) { window.voiceAssistant.triggerAlert(); } };
    }, delay);
});
