require('dotenv').config();
const express = require('express'),
    cors = require('cors'),
    helmet = require('helmet'),
    morgan = require('morgan'),
    path = require('path'),
    bcrypt = require('bcryptjs'),
    jwt = require('jsonwebtoken'),
    session = require('express-session'),
    passport = require('passport'),
    GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express(),
    PORT = process.env.PORT || 3000,
    JWT_SECRET = process.env.JWT_SECRET || 'obstacleai-secret';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'), { extensions: ['html'] }));

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '..', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '..', 'signup.html')));
app.get('/detect', (req, res) => res.sendFile(path.join(__dirname, '..', 'detect.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, '..', 'profile.html')));

app.use(session({
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

const users = [];

passport.serializeUser((u, d) => d(null, u.id));
passport.deserializeUser((id, d) => { d(null, users.find(u => u.id === id) || null) });

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
        scope: ['profile', 'email']
    }, (at, rt, profile, done) => {
        let user = users.find(u => u.googleId === profile.id || u.email === profile.emails[0].value);
        if (!user) {
            user = {
                id: Date.now().toString(),
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                phone: '',
                password: null
            };
            users.push(user);
        }
        return done(null, user);
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    console.log('Google OAuth: READY');
} else {
    console.log('Google OAuth: NOT CONFIGURED - add GOOGLE_CLIENT_ID to .env');
}

function auth(req, res, next) {
    const t = req.headers.authorization?.split(' ')[1];
    if (!t) return res.status(401).json({ message: 'No token' });
    try {
        req.user = jwt.verify(t, JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).json({ message: 'Bad token' });
    }
}

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html?error=google_failed' }),
    (req, res) => {
        const token = jwt.sign({ id: req.user.id, email: req.user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.redirect('/index.html?token=' + token + '&name=' + encodeURIComponent(req.user.name) + '&email=' + encodeURIComponent(req.user.email));
    }
);

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;
        if (users.find(u => u.email === email)) return res.status(400).json({ message: 'Email exists' });
        const h = await bcrypt.hash(password, 10);
        const user = { id: Date.now().toString(), firstName, lastName, email, phone, password: h, name: firstName + ' ' + lastName };
        users.push(user);
        const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: { id: user.id, name: user.name, email, phone }, token });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email);
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        if (!user.password) return res.status(401).json({ message: 'This account uses Google Sign-In' });
        if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: { id: user.id, name: user.name, email, phone: user.phone }, token });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/api/describe-scene', auth, async (req, res) => {
    try {
        if (!process.env.OPENAI_API_KEY) return res.status(500).json({ message: 'OpenAI not configured' });
        const OpenAI = require('openai');
        const o = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const c = await o.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'Describe scenes for visually impaired. Be concise.' },
                { role: 'user', content: 'Detected: ' + req.body.detectedObjects }
            ],
            max_tokens: 150
        });
        res.json({ description: c.choices[0].message.content });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/api/alert', async (req, res) => {
    try {
        const { userEmail, phone, contactName, detectedObjects, timestamp, message } = req.body;
        console.log('[ALERT] To:', contactName, '(' + phone + ') From:', userEmail, 'Objects:', detectedObjects);
        if (!process.env.FAST2SMS_API_KEY) {
            return res.json({ message: 'Alert logged (Fast2SMS not configured)', logged: true });
        }
        const to = phone || '';
        if (!to) return res.status(400).json({ message: 'No phone number provided' });
        // Fast2SMS requires 10-digit Indian number. Let's make the cleaning more robust:
        // 1. Remove all non-digits
        // 2. If it starts with 91 and has 12 digits, remove the 91
        // 3. If it starts with 0 and has 11 digits, remove the 0
        let cleaned = to.replace(/\D/g, '');
        if (cleaned.length === 12 && cleaned.startsWith('91')) cleaned = cleaned.substring(2);
        if (cleaned.length === 11 && cleaned.startsWith('0')) cleaned = cleaned.substring(1);

        if (cleaned.length !== 10) {
            console.error('[Alert] Invalid number format after cleaning:', to, '->', cleaned);
            return res.status(400).json({ message: 'Invalid Indian phone number: ' + to });
        }
        const smsBody = message || '[ObstacleAI Alert] ' + detectedObjects + ' detected near ' + (userEmail || 'user') + '. Please check on them immediately.';
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: { 'authorization': process.env.FAST2SMS_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ route: 'q', message: smsBody, language: 'english', flash: 0, numbers: cleaned })
        });
        const result = await response.json();
        console.log('[Fast2SMS]', result);
        if (result.return === true) {
            res.json({ message: 'Alert sent via Fast2SMS', sentTo: cleaned });
        } else {
            throw new Error(result.message || JSON.stringify(result));
        }
    } catch (e) {
        console.error('Fast2SMS Error:', e.message);
        res.status(500).json({ message: e.message });
    }
});

app.get('/api/health', (req, res) => res.json({
    status: 'ok',
    google: !!(process.env.GOOGLE_CLIENT_ID),
    fast2sms: !!(process.env.FAST2SMS_API_KEY),
    openai: !!(process.env.OPENAI_API_KEY)
}));

app.listen(PORT, () => {
    console.log('\nObstacleAI Server: http://localhost:' + PORT);
    console.log('Google:', process.env.GOOGLE_CLIENT_ID ? 'YES' : 'NO');
    console.log('Fast2SMS:', process.env.FAST2SMS_API_KEY ? 'YES' : 'NO');
    console.log('OpenAI:', process.env.OPENAI_API_KEY ? 'YES' : 'NO', '\n');
});