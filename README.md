# Set Up Shop Online — cPanel deployment

Always use https://github.com/vgutennm/setupshoponline-live.git, branch main.

## Publish
In cPanel → Git Version Control → Manage → Pull or Deploy, choose Update from Remote, then Deploy HEAD Commit. The deployment preserves the existing destination /home/aha7hfr64vl1/public_html and unrelated files.

## Lead magnet
PHP 8.3 with PDO SQLite and cURL is required (verified enabled in cPanel). The deployment installs the backend under /home/aha7hfr64vl1/.setupshoponline-workbook/app and the private database under its sibling data directory. Only the API entrypoint and frontend are copied into public_html. Leads save and downloads work even while email is disabled. The human checkbox is required on both client and server; it is not a third-party CAPTCHA.

Copy server/config.example.php to /home/aha7hfr64vl1/.setupshoponline-workbook/config.php using cPanel File Manager. Enter the Microsoft secret only there, never in this repository. Set permissions to 600. Email remains disabled until credentials and Microsoft mailbox-scoped Application Mail.Send permission are configured. Use only vlad@setupshoponline.com as sender. The full signature includes the approved $497 invitation.

Add a cPanel cron job every five minutes using the PHP 8.3 CLI path confirmed for the account:
`/opt/alt/php83/usr/bin/php /home/aha7hfr64vl1/.setupshoponline-workbook/app/cron.php`
Confirm the binary path on the account before saving. Submission also attempts immediate email processing after its response. Failed authentication/rate-limit attempts retry; ambiguous sends are held for manual review to avoid duplicates. Accepted means Microsoft accepted the message, not confirmed inbox delivery.

## Verification
Local PHP 8.3 tests cover required human confirmation, durable lead/email jobs, idempotency, mismatched retries, token access, fixed sender, original PDF bytes and email rate limits. Test a live submission with [TEST] in the name and Vlad’s email after deployment. Verify download, subscriber email and lead alert before claiming email delivery works. No live email has been verified yet.

Retired pages retain 410 responses and unknown URLs retain 404 responses. Existing Apache security headers are preserved. Added routes: /free-workbook, /workbook-access, /thank-you/workbook and the explicit /api/workbook endpoints.

Website build source: c17152acf0fdd574aa0c97f610f215d81ac7ca81. Latest layout places the industry section after the hero, the business introduction before the workbook, and removes the four outcome cards.
