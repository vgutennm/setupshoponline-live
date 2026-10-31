# Alignable kit launch checks

The landing page and thank you page are standalone and unlisted. Neither is in navigation, footer menus, homepage links, sitemap or LLM discovery documents. Both use noindex. Public direct URLs are not file authorization.

## Prepared implementation

* One time USD 499 cent Stripe Checkout. Server configured Price, fixed quantity one, card only. Delayed methods are not enabled; their payment success and failure events are still handled.
* Pending orders, Stripe event deduplication, server verification of amount, currency, mode, price, quantity, successful intent and charge before fulfillment.
* Fulfillment works from the webhook even when the browser closes. Browser redirect alone cannot trigger fulfillment.
* Two distinct PDFs in private `server/alignable-files/`, never frontend public assets or the Sites Worker. Actual cover previews are public images only.
* Email only PDF delivery. Website access, authorization and download endpoints return 404. Resend requires the verified order browser cookie or private operator verification.
* Separate visitor and owner mail jobs, plain text and branded HTML, two PDF attachments. Accepted means provider acceptance, not inbox delivery. Ambiguous sends stop for operator review; only known provider rejection retries automatically.
* Full, partial, pending and failed refund states reconciled from Stripe. Disputes suspend access, won disputes can restore paid access. Refunds are issued manually by Vlad in Stripe, to the original payment method. No automatic refund endpoint.
* Visits, purchase confirmation views, booking clicks and confirmed Calendly messages are distinct analytics events. A verified purchase is recorded once server side. Calendly confirmations require the exact iframe source and Calendly origin. The supplied Lumen iframe is embedded responsively; cross origin video completion is not claimed.

## Production setup still required

1. Copy `server/alignable-config.example.php` to the existing private `.setupshoponline-workbook/alignable-config.php`, outside public_html. Set permissions 600. Preserve all existing Outlook, Google reCAPTCHA, database and cron files. Never commit live credentials.
2. In Stripe test mode create a one time USD 499 cent Price and enter its Price ID, test secret key and test webhook signing secret. Register `/api/alignable-kit/webhook` for checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, charge.refunded, refund.created, refund.updated, refund.failed, charge.dispute.created, charge.dispute.updated and charge.dispute.closed.
3. Confirm seller requirements and existing tax settings with Vlad. This implementation has a fixed $4.99 final total with automatic tax disabled only on its own Checkout Sessions. It does not change the Stripe account settings. Do not set TAX_TOTAL_CONFIRMED until the intended total and requirements are resolved. If taxes must change the total, update the validation and all offer copy before enabling purchases.
4. Verify the existing authenticated sender and send a controlled test only to Vlad. Confirm both distinct PDF attachments and separate owner notification. Set SENDER_VERIFIED only after production verification. Check cron runs at least once a minute and invokes the updated private `app/cron.php`.
5. Complete real Stripe test mode checkout, canceled/failed payment, raw signature rejection, duplicate webhook, browser close, delivery retry and full refund reconciliation. Offline mocked tests pass, but do not replace these provider integration tests. No live charges or refunds as tests.
6. Configure separate live Price, key and webhook endpoint after tests pass. Keep mode/key/Price aligned. Enable Stripe customer receipts; a receipt is separate from the kit delivery email.
7. The existing Calendly event was inspected October 31, 2026: active `15 Minute Intro`, 15 min, with available November dates. Its slug stays `15-minute-intro`; campaign labels say review. No event or availability settings were changed. Recheck the inline calendar and fallback on production. Confirmed iframe booking messages are counted separately from clicks; no booking was created during testing.
8. The supplied video embed is https://lumen5.com/embed/ld8rz/. Verify playback on the production page.
9. Deploy through cPanel Update from Remote, then Deploy HEAD Commit. Check direct route loads, noindex headers/meta, sitemap exclusion, and no links elsewhere. Do not call the funnel launch ready until the production payment, email attachment delivery work.

## Private order support

Use `php app/alignable-admin.php status ORDER_ID` for payment, refund and delivery status. No public buyer directory exists.

For a verified buyer, use `reissue ORDER_ID` with the verified purchase email on stdin. This rotates the browser authorization token and queues a replacement email with both attachments. Verify buyer identity against existing correspondence first. Do not use email alone to identify an arbitrary order.

Use `reconcile ORDER_ID` to read current Stripe refund/dispute state. Issue refunds in Stripe Dashboard; never reimburse again while a refund is pending or a dispute already covers the purchase.

For an ambiguous email, inspect provider Sent Items before `resolve-email JOB_ID accepted|retry`. Retry only after confirming the provider did not send the message.

## Validation

`python3 cpanel/tests/test_alignable.py` uses a temporary database and mocked provider calls. No payment provider or email recipient is contacted. Configure PHP_BIN and PHP_FLAGS only when the local PHP executable requires them.

References: https://docs.stripe.com/checkout/fulfillment and https://docs.stripe.com/refunds

## Release status on October 31, 2026

Vlad authorized publishing the review update and pushing the production repository. The conversion layout includes a shorter opening, video beside the offer, a two field form, actual PDF cover previews and a source verified ebook example, concise guarantee reminders, and a mobile purchase bar that hides around the opening and checkout form.

Price ID: `price_1UWgduD6EfIksOoB9YbPNGAd`. It is recorded in the configuration template. Verify its account, mode, currency and amount through authenticated Stripe access before enablement. No separate Payment Link is needed.

Production enablement is incomplete: Stripe sign in returned incorrect credentials in the available browser. cPanel also requires sign in. No live credentials or webhook signing secret have been installed, no live email delivery test has been completed, and no charges or refunds were created. Offline payment and attachment tests pass. Do not enable purchases until the production setup above succeeds.

The paid PDFs are deliberately excluded from the public GitHub repository. Upload ebook.pdf and workbook.pdf securely to `/home/aha7hfr64vl1/.setupshoponline-workbook/app/alignable-files/` before enablement. Keep them outside public_html. The existing free workbook files are separate and must remain unchanged.

For tests in the production checkout, set AK_PRIVATE_FILES to the private local folder containing both PDFs. Never commit those PDFs or private configuration. Set PHP_BIN and PHP_FLAGS as needed by the local runtime.

Desktop and 390 pixel mobile layouts, anchor navigation and required field focus were checked in the browser. Purchase anchors target the form directly to avoid an extra mobile scroll. Video playback is blocked in the test browser by missing WebGL; the supplied Lumen embed and an external fallback link are present. Check playback on a standard browser before launch.
