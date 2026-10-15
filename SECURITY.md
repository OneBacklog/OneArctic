# Security Policy

## Supported Versions

Only the latest release receives security fixes. Please make sure you are running the latest image (`ghcr.io/onebacklog/onearctic:latest`) before reporting.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Email **hello@irfanfadilah.com** with:

- A description of the vulnerability and its impact
- Steps to reproduce, or a proof of concept
- The affected version (image tag or commit)

You should receive a reply within 7 days. Once the issue is confirmed, a fix will be prepared and released, and you will be credited in the release notes unless you prefer to stay anonymous.

## Scope

OneArctic is a self-hosted, single-user app. Reports are especially welcome for:

- Authentication or session bypass
- Access to notes or attachments without a valid session
- Stored XSS or code execution through notes or uploaded files
- Path traversal or arbitrary file read/write

Issues that require an already-authenticated session to attack your own data, or that depend on a misconfigured deployment (for example running without HTTPS), are generally out of scope.
