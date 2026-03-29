# Security Policy

## Supported Versions

DoBook is a live SaaS product. Only the latest 
production deployment is supported with security updates.

| Version | Supported |
| ------- | --------- |
| Latest (main branch) | ✅ |
| Older deployments | ❌ |

---

## Reporting a Vulnerability

If you discover a security vulnerability in DoBook, 
please report it responsibly.

**DO NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

Email: support@do-book.com  
Subject line: [SECURITY] Brief description of the issue

Please include:
- Description of the vulnerability
- Steps to reproduce it
- Potential impact (what an attacker could do)
- Any suggested fix if you have one

### What to Expect

- Acknowledgement within 48 hours
- Status update within 7 days
- We will notify you when the vulnerability is fixed
- We will credit you in our changelog if you wish

---

## Scope

The following are in scope for security reports:

- https://www.do-book.com and all subdomains
- DoBook API endpoints (/api/*)
- DoBook Flutter mobile app (iOS and Android)
- Authentication and session management
- Payment and billing flows (Stripe integration)
- Customer data and booking records
- Admin panel access controls

### Out of Scope

- Spam or social engineering attacks
- Denial of service attacks
- Third party services (Supabase, Stripe, Vercel, Resend)
- Vulnerabilities requiring physical device access
- Issues in outdated browsers

---

## Security Measures

DoBook implements the following security controls:

**Authentication**
- Password hashing using bcrypt
- HttpOnly session cookies (no localStorage tokens)
- Session expiry and invalidation on logout
- Admin panel protected by multi-layer authentication

**Data Protection**
- All data encrypted in transit (HTTPS/TLS)
- Supabase Row Level Security (RLS) on all tables
- Business data is strictly isolated per account
- Sensitive fields never returned in API responses

**Infrastructure**
- Hosted on Vercel with automatic HTTPS
- Database on Supabase with RLS policies
- Environment variables never committed to code
- Rate limiting on all public endpoints

**Payments**
- All payments processed by Stripe (PCI compliant)
- DoBook never stores card numbers or CVV
- Stripe webhook signature verification enabled

**Admin**
- Admin panel hidden behind secret URL
- Multi-factor authentication layers
- All admin actions logged in activity log
- Admin access restricted to authorized personnel

---

## Privacy

DoBook collects and stores:
- Business owner name and email
- Business contact details and ABN
- Customer booking information
- Payment transaction records

We do not sell or share this data with third parties.  
For full details see our Privacy Policy at:  
https://www.do-book.com/privacy

---

## Bug Bounty

DoBook does not currently offer a paid bug bounty 
program. However, we deeply appreciate responsible 
disclosure and will publicly credit researchers 
who report valid vulnerabilities (with their permission).

---

## Contact

Security issues: direct2digitalweb@gmail.com 
General contact: direct2digitalweb@gmail.com
Website: https://www.do-book.com
