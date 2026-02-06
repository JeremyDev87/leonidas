# Security Guidelines

## Overview

Security is critical for protecting users and systems. These guidelines help identify and prevent common vulnerabilities.

## Input Validation

### Validate All External Input
Never trust data from users, APIs, or files:

❌ **Bad:**
```javascript
router.get('/user/:id', (req, res) => {
  const query = `SELECT * FROM users WHERE id = ${req.params.id}`;
  db.query(query); // SQL injection vulnerability
});
```

✅ **Good:**
```javascript
router.get('/user/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  db.query('SELECT * FROM users WHERE id = ?', [id]);
});
```

### Sanitize User Input
Remove or escape dangerous characters:

```javascript
import validator from 'validator';

function validateEmail(email) {
  if (!validator.isEmail(email)) {
    throw new ValidationError('Invalid email format');
  }
  return validator.normalizeEmail(email);
}
```

### Whitelist, Don't Blacklist
Define what's allowed rather than what's forbidden:

❌ **Bad:** Blocking `<script>`, `onerror=`, `javascript:`, etc. (incomplete list)
✅ **Good:** Allow only alphanumeric + specific characters you need

## SQL Injection Prevention

### Always Use Parameterized Queries
Never concatenate user input into SQL:

❌ **Bad:**
```javascript
const query = `SELECT * FROM users WHERE email = '${email}'`;
db.query(query);
```

✅ **Good:**
```javascript
db.query('SELECT * FROM users WHERE email = ?', [email]);
```

### Use ORMs Safely
Even with ORMs, avoid raw queries with user input:

✅ **Good:**
```javascript
User.findOne({ where: { email: email } });
```

❌ **Bad:**
```javascript
User.query(`SELECT * FROM users WHERE email = '${email}'`);
```

## Cross-Site Scripting (XSS) Prevention

### Escape Output
Escape user-generated content when rendering:

❌ **Bad:**
```javascript
res.send(`<div>Hello ${username}</div>`); // XSS if username is "<script>alert('xss')</script>"
```

✅ **Good:**
```javascript
import { escape } from 'html-escaper';
res.send(`<div>Hello ${escape(username)}</div>`);
```

### Use Content Security Policy
Set CSP headers to prevent inline scripts:

```javascript
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'");
  next();
});
```

### Don't Use `eval()` or `Function()`
Never execute user input as code:

❌ **Bad:** `eval(userInput)`
❌ **Bad:** `new Function(userInput)()`
✅ **Good:** Use JSON.parse() for data, not eval()

## Authentication and Authorization

### Hash Passwords
Never store passwords in plaintext:

❌ **Bad:**
```javascript
db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, password]);
```

✅ **Good:**
```javascript
import bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash(password, 10);
db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
```

### Use Secure Session Management
Configure sessions securely:

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET, // from environment variable
  cookie: {
    httpOnly: true,  // prevent client-side access
    secure: true,    // HTTPS only
    sameSite: 'strict', // CSRF protection
    maxAge: 3600000  // 1 hour
  }
}));
```

### Implement Authorization Checks
Verify user permissions for every protected action:

❌ **Bad:**
```javascript
router.delete('/post/:id', async (req, res) => {
  await Post.delete(req.params.id); // anyone can delete any post
});
```

✅ **Good:**
```javascript
router.delete('/post/:id', async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (post.authorId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await post.delete();
});
```

## Secret Management

### Never Commit Secrets
Don't hardcode secrets in source code:

❌ **Bad:**
```javascript
const API_KEY = "sk_live_abc123xyz";
const DB_PASSWORD = "mySecretPassword";
```

✅ **Good:**
```javascript
const API_KEY = process.env.API_KEY;
const DB_PASSWORD = process.env.DB_PASSWORD;

// .env file (git-ignored)
API_KEY=sk_live_abc123xyz
DB_PASSWORD=mySecretPassword
```

### Use Environment Variables
Load secrets from environment:

```javascript
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.API_KEY) {
  throw new Error('API_KEY environment variable is required');
}
```

### Add `.env` to `.gitignore`
```
# .gitignore
.env
.env.local
.env.*.local
```

## Path Traversal Prevention

### Validate File Paths
Prevent directory traversal attacks:

❌ **Bad:**
```javascript
const filename = req.query.file;
res.sendFile(`/uploads/${filename}`); // vulnerable to ../../../etc/passwd
```

✅ **Good:**
```javascript
import path from 'path';

const filename = path.basename(req.query.file); // removes directory components
const fullPath = path.join('/uploads', filename);

if (!fullPath.startsWith('/uploads/')) {
  return res.status(400).json({ error: 'Invalid file path' });
}

res.sendFile(fullPath);
```

## Command Injection Prevention

### Avoid Executing Shell Commands with User Input
Never pass unsanitized input to shell:

❌ **Bad:**
```javascript
import { exec } from 'child_process';
exec(`git clone ${userProvidedUrl}`); // command injection
```

✅ **Good:**
```javascript
import { execFile } from 'child_process';
execFile('git', ['clone', userProvidedUrl]); // uses argument array
```

### Use Argument Arrays
Pass arguments separately, not as a concatenated string:

❌ **Bad:** `exec(`ffmpeg -i ${filename}`)`
✅ **Good:** `execFile('ffmpeg', ['-i', filename])`

## Cross-Site Request Forgery (CSRF) Prevention

### Use CSRF Tokens
Require tokens for state-changing operations:

```javascript
import csrf from 'csurf';

app.use(csrf({ cookie: true }));

router.post('/transfer', (req, res) => {
  // CSRF token automatically verified by middleware
  // process transfer
});
```

### Check Origin/Referer Headers
Verify requests come from your domain:

```javascript
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && !origin.includes('yourdomain.com')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});
```

## Dependency Security

### Keep Dependencies Updated
Regularly update packages to patch vulnerabilities:

```bash
npm audit
npm audit fix
```

### Review New Dependencies
Before adding a dependency:
- Check npm weekly downloads
- Review GitHub stars and last commit date
- Check for known vulnerabilities on Snyk or npm audit

### Use Lock Files
Commit `package-lock.json` to ensure consistent versions:

```bash
npm ci  # install from lock file in CI/CD
```

## Rate Limiting

### Prevent Brute Force Attacks
Limit login attempts and API requests:

```javascript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later'
});

router.post('/login', loginLimiter, (req, res) => {
  // process login
});
```

## Logging and Monitoring

### Log Security Events
Record authentication failures, authorization denials:

```javascript
logger.warn('Failed login attempt', {
  email: req.body.email,
  ip: req.ip,
  timestamp: new Date()
});
```

### Don't Log Sensitive Data
Never log passwords, tokens, or personal information:

❌ **Bad:** `logger.info('User logged in', { password: req.body.password })`
✅ **Good:** `logger.info('User logged in', { userId: user.id })`
