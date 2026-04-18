# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in TC Work Zone Locator, please report it responsibly:

**Do NOT create a public GitHub issue for security vulnerabilities.**

Instead, please:

1. Email the maintainer directly via GitHub's private vulnerability reporting
2. Or use GitHub's [Security Advisories](https://github.com/instructor-ship-it/roadfinder/security/advisories) feature

Include the following information:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution**: Depends on severity and complexity

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.34.x  | ✅ Yes    |
| 1.33.x  | ✅ Yes    |
| 1.32.x  | ✅ Yes    |
| < 1.32  | ❌ No     |

## Security Best Practices for Users

### API Keys

- **Never share your API keys** with others
- **Store API keys securely** - they are stored in your browser's localStorage
- **Clear API keys** after use on shared/public devices
- API keys are never transmitted to our servers

### Cloud Sync (Traffic Event Logger)

- **Use your own Google Sheet** - never use someone else's sync URL
- **Keep your Google Apps Script URL private**
- **Use the optional secret key** for additional authentication

### Data Storage

All data is stored **client-side only**:

- **localStorage**: User preferences, AfterCare jobs, Q&A history
- **IndexedDB**: Offline road data, speed zones, saved locations

No data is sent to external servers unless you explicitly configure cloud sync.

## Security Audit History

| Date       | Version | Auditor  | Status    |
| ---------- | ------- | -------- | --------- |
| 2026-04-13 | 1.29.0  | Internal | ✅ Passed |
| 2026-03-28 | 1.9.5   | Internal | ✅ Passed |

### v1.29.0 Audit Summary

- ✅ No hardcoded API keys or secrets in source code
- ✅ Google Sheets URL is user-configurable (not shared)
- ✅ API keys stored server-side via environment variables
- ✅ All external API calls use HTTPS
- ✅ JSON parsing wrapped in try-catch blocks
- ⚠️ API keys in localStorage (user responsibility on shared devices)

---

**Last Updated**: 2026-04-19
