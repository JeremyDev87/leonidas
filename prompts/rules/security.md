# Security Guidelines

## Purpose
Prevent common security vulnerabilities and protect sensitive data.

## Input Validation

### Validate All External Input
- User input from forms, APIs, CLI arguments
- File uploads and file paths
- Environment variables and configuration
- Never trust external data

### Sanitization
- Remove or escape dangerous characters
- Use allowlists rather than denylists
- Validate data types and formats

Example:
```typescript
// ✅ Good: Input validation
function getUserById(id: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) {
    throw new ValidationError('Invalid user ID format');
  }
  return database.query('SELECT * FROM users WHERE id = ?', [id]);
}
```

## Authentication and Authorization

### Authentication (Who are you?)
- Use established libraries (Passport, Auth0, etc.)
- Never roll your own crypto
- Use bcrypt or similar for password hashing
- Implement rate limiting on auth endpoints

### Authorization (What can you do?)
- Check permissions before every sensitive operation
- Implement principle of least privilege
- Don't rely on client-side checks alone
- Use role-based or attribute-based access control

## Secret Management

### Never Commit Secrets
- No API keys, passwords, or tokens in code
- Use environment variables for configuration
- Add sensitive files to `.gitignore`
- Use secret management tools (AWS Secrets Manager, HashiCorp Vault)

### Secure Storage
- Encrypt secrets at rest
- Use secure key derivation functions
- Rotate secrets regularly
- Never log sensitive data

## Common Vulnerabilities

### SQL Injection
- ❌ Never concatenate user input into SQL queries
- ✅ Always use parameterized queries or ORMs

```typescript
// ❌ Bad: SQL injection vulnerability
database.query(`SELECT * FROM users WHERE email = '${userEmail}'`);

// ✅ Good: Parameterized query
database.query('SELECT * FROM users WHERE email = ?', [userEmail]);
```

### Cross-Site Scripting (XSS)
- Escape user-generated content before rendering
- Use Content Security Policy headers
- Sanitize HTML input
- Use frameworks that escape by default (React, Vue)

### Cross-Site Request Forgery (CSRF)
- Use CSRF tokens for state-changing operations
- Verify origin headers
- Use SameSite cookie attribute

### Path Traversal
- Validate and sanitize file paths
- Use path.resolve() and check the result is within allowed directory
- Never pass user input directly to file system operations

```typescript
// ❌ Bad: Path traversal vulnerability
const content = readFileSync(`./uploads/${userFilename}`);

// ✅ Good: Validate path
const safePath = path.resolve('./uploads', userFilename);
if (!safePath.startsWith(path.resolve('./uploads'))) {
  throw new Error('Invalid file path');
}
```

### Command Injection
- Avoid executing shell commands with user input
- If necessary, use libraries that don't invoke shell
- Validate and sanitize all input
- Use allowlists for allowed commands

## Security Headers

### Set Appropriate Headers
- `Strict-Transport-Security`: Enforce HTTPS
- `X-Content-Type-Options: nosniff`: Prevent MIME sniffing
- `X-Frame-Options: DENY`: Prevent clickjacking
- `Content-Security-Policy`: Restrict resource loading

## Dependency Security

### Keep Dependencies Updated
- Regularly audit dependencies with `npm audit`
- Update packages with known vulnerabilities
- Use tools like Dependabot or Renovate
- Review security advisories
