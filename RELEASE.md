# Native cPanel assessment release

The public assessment backend runs directly on setupshoponline.com in PHP. It never forwards visitor cookies, contact details, or hosting credentials to the private Sites preview. The private preview remains a separate owner review environment.

## One-time configuration

1. In the existing private directory `/home/aha7hfr64vl1/.setupshoponline-workbook`, create `assessment-config.php` using `server/assessment-config.example.php` as the structure. Enter the OpenAI API key securely in cPanel. Set file permissions to 600. Never commit the populated file or place it under public_html. The model can be changed with OPENAI_MODEL.
2. Preserve the existing `config.php`, OAuth tokens, workbook.sqlite, and Google reCAPTCHA settings. No new Google or Outlook connection is needed when the existing one works.
3. The existing PHP cron invokes app/cron.php. Its growth_run_background function now processes local assessment reports and delivery; it makes no call to the Sites preview. Confirm the job runs every minute and uses PHP with PDO SQLite, cURL, and iconv.
4. Deploy through cPanel Git Version Control: Update from Remote, then Deploy HEAD Commit. The deployment checks AI, CAPTCHA, and Outlook configuration before replacing application files. It backs up the existing private app directory. Credentials and stored leads are never overwritten.
5. Check `/api/agentic/config`, `/api/growth/config`, and `/api/conversionkit/config` for ready settings without revealing any secrets. Complete the public Google CAPTCHA manually on a test request, then verify report generation, PDF opening, and real Outlook delivery.

## Backend behavior

- Names, emails, phone numbers, and business names remain in the private hosting database and the intended Outlook fulfillment messages.
- Only questionnaire content and the generated report go directly to OpenAI for generation and quality review. Visitors are told not to include private client information in answers.
- Separate agentic/growth cookies, hashed session tokens, 24-hour access, same-origin POST checks, server-side CAPTCHA, input limits, rate limits, and protected PDFs remain enforced.
- A separate quality check must approve a report before a PDF or email is released. Unconfirmed provider requests stop for review instead of automatically creating another charge or email.
- The report PDF is generated locally with embedded fonts. The visitor gets the report and optional free review link; Vlad gets a copy. An unfinished assessment creates one owner notification after one hour.
- Old assessment records stored in the remote preview are not copied or deleted. They do not become local sessions. Before switching, resolve any in-progress remote reports. The previous private application backup supports rollback if needed.
- Keep `/conversionkit` unlisted and noindex. Its existing private PDF, Google CAPTCHA, transactional email, and optional 15-minute intro link remain unchanged.

## Verification

Run `scripts/export-cpanel-assessment.mjs` after editing question or report definitions. Run `scripts/build-assessment-fonts.py` after changing report fonts. `cpanel/tests/test_assessment.py` checks the PHP flow with provider calls mocked in a temporary copy. `cpanel/tests/test_conversionkit.py` checks the existing kit workflow. These tests never send real emails.

A passing build and Git push do not prove live CAPTCHA, OpenAI account access, the cron schedule, or inbox delivery. Those checks require deployment and a real owner-approved test.
