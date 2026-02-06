# Security Guidelines

Follow these security practices to prevent vulnerabilities.

## Input Validation

### Validate All External Input
- User input from forms, CLI arguments, API requests
- File contents, environment variables, configuration files
- Data from external APIs or databases

### Validation Strategy
- **Whitelist approach**: Define what's allowed, reject everything else
- **Type checking**: Ensure data matches expected types
- **Range checking**: Validate numeric bounds, string lengths
- **Format validation**: Use regex or parsers for structured data (emails, URLs, dates)

### Example
```typescript
function validateUserId(id: string): void {
  if (!/^[0-9]+$/.test(id)) {
    throw new Error("Invalid user ID format");
  }
  const numId = parseInt(id, 10);
  if (numId <= 0 || numId > 1000000) {
    throw new Error("User ID out of range");
  }
}
```

## Authentication and Authorization

### Authentication (Who are you?)
- Never store passwords in plain text
- Use established libraries for auth (bcrypt, Passport, Auth0)
- Implement session timeouts
- Use secure, random session tokens

### Authorization (What can you do?)
- Check permissions before every privileged operation
- Don't rely on client-side checks alone
- Use role-based or attribute-based access control
- Fail securely (deny by default)

## Secret Handling

### Never Commit Secrets
- No API keys, passwords, tokens, or credentials in code
- Use environment variables for configuration
- Add sensitive files to `.gitignore`
- Use secret management tools (Vault, AWS Secrets Manager)

### Example .gitignore
```
.env
.env.local
*.key
*.pem
secrets.json
credentials.json
```

## Common Vulnerabilities

### SQL Injection
- Use parameterized queries or prepared statements
- Never concatenate user input into SQL strings
- Use an ORM with built-in protections

### Cross-Site Scripting (XSS)
- Escape user input before rendering in HTML
- Use Content Security Policy headers
- Sanitize HTML if accepting rich text

### Command Injection
- Avoid spawning shell processes with user input
- Use library functions instead of shell commands
- If unavoidable, strictly validate and escape input

### Path Traversal
- Validate file paths to prevent `../` attacks
- Use path normalization and whitelist allowed directories
- Never construct file paths from user input directly

### Cross-Site Request Forgery (CSRF)
- Use CSRF tokens for state-changing operations
- Check `Origin` and `Referer` headers
- Use SameSite cookie attribute

## Secure Defaults

- Enable security features by default
- Use HTTPS for all external communications
- Set secure headers (HSTS, X-Content-Type-Options, X-Frame-Options)
- Keep dependencies updated (run `npm audit` regularly)
