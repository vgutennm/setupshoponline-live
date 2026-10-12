# Release preparation — NOT READY TO DEPLOY

This branch contains the updated marketing pages, desktop/mobile red agentic CTA, approved round logo, assessment pages, and unlisted conversion kit. The existing production main branch and deployment configuration are unchanged.

## Blocking item

The public agentic PHP gateway was rejected by automatic approval review, including after explicit user approval, because the proxy forwards authentication, session cookies, and contact details to the assessment service. The destination was verified as the owner's existing private Site, but review still prohibited uploading this route. The blocked gateway, its entry point, and new deployment/rewrite rules are deliberately absent from this branch. Do not merge or deploy this branch until an approved production assessment backend and routes are in place; the new red button otherwise has no working public destination.

## Verified locally

- Frontend type checks and build passed.
- Agentic questions, saved sessions, category isolation, and protected reports passed.
- Public assessment gateway authentication, CAPTCHA proof, method allowlists, and session expiry passed in isolated tests.
- Conversion kit validation, PDF bytes/access, both email recipients, attachment and intro link passed with external HTTP mocked; no real email sent.
- Conversion kit has no incoming site links and is excluded from discovery files.

## After the blocker is resolved

Deploy through cPanel Update from Remote and Deploy HEAD Commit. Preserve private credentials, lead data, and cron configuration. Verify the public CAPTCHA, report generation, PDF opening, and actual email delivery before declaring the release live.
