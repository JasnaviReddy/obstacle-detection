# ObstacleAI - Real-Time Obstacle Detection Web App

> AI-powered obstacle detection in your browser. Built with TensorFlow.js, WebRTC, Web Speech API.

## Project Structure
```
obstacle-detection-app/
├── index.html          # Landing page (animated hero, features, CTA)
├── detect.html         # Detection page (camera + AI overlay)
├── login.html          # Login with Google OAuth option
├── signup.html         # Signup with password strength meter
├── css/style.css       # Dark theme, glassmorphism, responsive
├── js/
│   ├── main.js         # Landing page animations
│   ├── detector.js     # Camera + TensorFlow.js + Speech engine
│   └── auth.js         # Auth logic (local fallback + backend)
├── server/
│   ├── package.json    # Node.js dependencies
│   ├── server.js       # Express (auth, OpenAI, Twilio routes)
│   └── .env.example    # Environment variables template
└── README.md
```

## Quick Start (Frontend Only - No Server Needed!)

Detection works entirely in the browser!

```bash
# Option 1: Python
python -m http.server 8080

# Option 2: Node.js
npx serve .

# Option 3: VS Code Live Server extension
# Right-click index.html -> Open with Live Server
```

Then open `http://localhost:8080` on your phone or desktop.

## Backend Setup (Auth + OpenAI + Twilio)

```bash
cd server
npm install
cp .env.example .env   # Edit with your API keys
npm run dev             # Start with auto-reload
```

## Integration Guide

### OpenAI (Scene Description)
1. Get key from https://platform.openai.com/api-keys
2. Add to `.env`: `OPENAI_API_KEY=sk-...`
3. Endpoint: `POST /api/describe-scene`

### Twilio (SMS & Call Alerts)
1. Sign up at https://twilio.com
2. Get Account SID, Auth Token, Phone Number
3. Add to `.env` (see .env.example)
4. Endpoint: `POST /api/alert`

### Google OAuth
1. Create OAuth credentials at https://console.cloud.google.com
2. Add Client ID/Secret to `.env`
3. Add passport-google-oauth20 setup to server.js

### Firebase Auth (Production)
Replace in-memory user store with Firebase Admin SDK for production use.

## Features
| Feature | Tech | Status |
|---------|------|--------|
| Object Detection (80+ types) | TensorFlow.js COCO-SSD | ✅ Working |
| Camera Access | WebRTC getUserMedia | ✅ Working |
| Voice Alerts | Web Speech API | ✅ Working |
| Position Estimation | Bounding box analysis | ✅ Working |
| Neon Bounding Boxes | Canvas 2D | ✅ Working |
| Login/Signup | JWT + bcrypt | ✅ Working |
| Offline Auth Fallback | LocalStorage | ✅ Working |
| Scene Description | OpenAI GPT-3.5 | ⚙️ Needs Key |
| SMS Alerts | Twilio | ⚙️ Needs Key |
| Call Alerts | Twilio | ⚙️ Needs Key |
| Google OAuth | Passport.js | ⚙️ Needs Setup |

## Browser Support
Chrome (Android/Desktop) ✅ | Safari (iOS 15+) ✅ | Firefox ✅ | Edge ✅

## Upgrading to YOLOv5/v8
```bash
pip install ultralytics
yolo export model=yolov8n.pt format=tfjs
```
Then update `detector.js` to load the custom model.

## Voice Assistant (NEW!)
- **Always listening** on every page (like Siri)
- **Multilingual**: English, Hindi (हिंदी), Telugu (తెలుగు)
- Say **"help"** during detection → SMS sent to emergency contacts
- Voice commands: start/stop camera, flip, sound, navigate pages
- Click language badge (EN/HI/TE) to switch languages

## Emergency Contacts
- Go to **Profile** page to add emergency contacts
- Say "help" / "madad" / "sahayam" on detection page → triggers SMS alerts
- Contacts stored in localStorage (use database for production)

## License
MIT - Built for accessibility.
