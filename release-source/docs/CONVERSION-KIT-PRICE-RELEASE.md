# Conversion Kit $49.99 release — November 16, 2026

Prepared for deployment by Vlad. No cPanel or Sites deployment was performed.

## Private configuration and deployment order

1. In cPanel File Manager, privately back up `/home/aha7hfr64vl1/.setupshoponline-workbook/alignable-config.php` and the existing data directory. Keep backups outside public_html. Do not put credentials, database files, or paid PDFs in GitHub.
2. In that existing configuration file, temporarily set only `TAX_TOTAL_CONFIRMED` to `false` to pause new checkout creation. Keep the webhook, cron, Outlook connection and existing orders running. Existing checkout sessions may still complete; this release supports their original price. Record the existing value so it can be restored after verification.
3. In cPanel Git Version Control, manage `/home/aha7hfr64vl1/repositories/setupshoponline-live`. Choose **Update from Remote** on branch **main**, verify the release commit, then **Deploy HEAD Commit**. Do not deploy Sites instead. The existing deployment copies the private application before the public pages. Its preflight and private-workbook integrity checks must succeed; if any step fails, keep new checkout creation paused and resolve that failure before continuing.
4. After successful deployment, edit just this entry in the existing private `alignable-config.php`:

   `'STRIPE_PRICE_ID' => 'price_1UcRNPD6EfIksOoBoArlsA2B',`

   Do not replace the whole file with the example. Preserve STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_MODE, SENDER_VERIFIED, BOOKING_VERIFIED, video settings, and any other values. No secrets, product ID, or amount settings need to be added. The code checks product `prod_VXmCcMuO6Bus9N`, USD, one-time payment, and a 4999-cent list price. The existing promotion-code behavior is preserved; authorized discounts reduce the actual amount paid.
5. Verify in Stripe that this price belongs to the intended product/account and is active, USD 49.99, one time, and matches the existing live mode. Confirm the displayed price and intended tax treatment, then restore `TAX_TOTAL_CONFIRMED` to its previously verified true value. Do not turn on SENDER_VERIFIED or change keys merely to bypass a failed readiness check. Preserve config permissions (600).
6. Reload `/alignable-conversion-kit` in a fresh browser and check $49.99 USD, both purchase buttons, FAQ, replacement investment wording and the 30-day guarantee. Check `/api/alignable-kit/config` reports checkoutEnabled true when all private prerequisites are satisfied. Existing sessions can retain their original $4.99 total. Keep their price record and fulfillment/refund history; do not migrate them to $49.99 or delete queues.
7. Confirm the existing webhook still points to `https://setupshoponline.com/api/alignable-kit/webhook` and cron still runs the private `app/cron.php`. Check logs/order status for existing transactions. No customer test emails or live charges are required by this handoff. Actual Stripe Checkout, webhook delivery, cPanel PHP CLI behavior and real inbox delivery remain production-access checks; a build or push cannot prove them.

The private price setting is NOT updated by deployment. Neither the shared private config.php, Outlook tokens, database, reCAPTCHA keys nor cron settings need changes. Both paid PDFs must remain at the existing private app/alignable-files paths; the deployment does not supply them. The existing workbook integrity updater remains unchanged. The free workbook/kit is separate and unchanged.

## Changes and checks

- New orders explicitly store 4999 cents, their price ID and original subtotal even on the old SQLite schema. The idempotent schema migration adds nullable price fields; existing rows remain identifiable as legacy $4.99 orders. Refunds and emails use actual paid amounts, not the new list price.
- New-price, legacy delayed-payment, refund, duplicate-event, discounted/zero-cost, attachment-byte, recipient, resend and retry tests passed against mocked providers. No external Stripe or mail calls were made.
- Tests used PHP 8.3.33 WASM with SQLite. The isolated test fixture bypasses the CLI-only operator guard because WASM has its own SAPI. Native cPanel CLI restriction/runtime verification remains outstanding.
- Website library and frontend type checks, production Vite build and prerender completed. Vite reported sourcemap and large-bundle warnings, with no build failure.
- Dedicated release audit passed for price/config agreement, every active JS bundle, metadata/JSON-LD syntax, assets, noindex/discovery exclusion, preserved unrelated HTML content and logo/private-PDF isolation.
- The older broad search-output checker is stale: it treats image URL query strings as filesystem names and fails on existing logo URLs. It was not counted as passing. The release audit resolves URL paths correctly.
- Local browser review confirmed the price, replacement copy, FAQ, guarantee and purchase anchor. No checkout form was submitted. Responsive mobile-width purchase card was visually inspected; no complete multi-device regression is claimed.
- The GitHub deployment keeps unrelated static HTML content intact; its shared active JS gets a price-only replacement, while the paid landing and thank-you pages use the fresh source build. Historical unused bundles are retained for compatibility but are not referenced by current pages.
- The editable Sites source incorporates the newer production footer, form labels, discount support and email styling so a later build does not revert those existing changes. Full Vlad signature appears once in each email format. Follow-up links and the optional 15-minute review remain intact.
- Private paid PDFs previously tracked in the private Sites source are removed from its current tracked tree and ignored; local files remain private. No paid PDFs or credentials are added to GitHub. Existing Git history is not rewritten.
