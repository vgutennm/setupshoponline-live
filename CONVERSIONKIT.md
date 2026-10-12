# Conversion kit production overlay

The public website runs in the `vgutennm/setupshoponline-live` repository on cPanel. The Sites Worker is an owner preview. Its conversion kit form deliberately disables submissions because the production Google reCAPTCHA keys are restricted to the public hostname.

The server files here implement the shared production delivery service. Their editable mirror is in `cpanel/` in the Sites source. Existing credentials and SQLite records remain outside `public_html`; never copy or replace the private `config.php`, tokens, or data directory.

## Deploying this page

Build the website, then publish only `conversionkit.html`, `conversionkit/access.html`, their new hashed assets, the two `images/conversionkit/*.webp` files, the new API gateway, the conversion kit PHP/PDF/templates, the shared `server/app.php` changes, `.htaccess`, `.cpanel.yml`, and removal of the landing page from the sitemap. Preserve existing production pages and their assets. The saved agentic assessment is a separate draft and must not be incidentally published with this landing page.

Source checkpoint: `281210684912ca325a0db1e2b61da7923c46305f` in Sites project `appgprj_6abab2a1219481918c6104b0b15bc920`.

Use cPanel Git Version Control to Update from Remote and Deploy HEAD Commit, then verify `/conversionkit` and `/api/conversionkit/config` on the public hostname. A Git push alone does not deploy cPanel.

## Unlisted landing page

Keep /conversionkit unlisted. Never link to this landing page from desktop or mobile navigation, the footer, other pages, public discovery files, or the PDF access page. Exclude it from the sitemap and retain noindex in both static and client-rendered metadata. Visitors reach it through a directly shared address. Preserve PDF access and the confirmation email's private PDF link.

## Delivery and privacy

The form reuses the Google reCAPTCHA v2 key and secret, existing Outlook authorization, private lead database, and retry queue. It stores only requested contact details and necessary delivery records. Source `/conversionkit` and consent `conversionkit-delivery-only-v1` select the new templates, PDF, and fulfillment-only privacy promise. There is no marketing enrollment or authorization for sales calls or texts.

Successful submissions set a secure, HttpOnly cookie. The PDF opens inline in a new tab; `?download=1` requests an attachment. The confirmation includes the exact PDF and a private link with its access token in the URL fragment. The access page removes that fragment before continuing. The owner notification goes to `vlad@setupshoponline.com`.

The existing cron processes queued emails. A successful API submission means the request was stored, not proof that a message reached an inbox. Verify a real test after deployment with the owner's address and normal reCAPTCHA completion.

## Verification

`cpanel/tests/test_conversionkit.py` in the saved Sites source exercises PHP validation, reCAPTCHA failures, duplicate requests, access protection, the PDF bytes, MIME attachments, both recipients, and existing workbook behavior. It copies the application into a temporary directory and replaces external HTTP calls only in that copy. It never sends real email or changes production data. Set `PHP_BINARY` and optionally `PHP_EXTENSION_DIR` to a PHP CLI with PDO SQLite and cURL.

The graphic prompts are saved in `design/conversionkit-image-prompts.json`.

