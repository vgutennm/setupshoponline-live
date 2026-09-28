# Set Up Shop Online: cPanel deployment

This repository contains the built website ready for cPanel. No Node.js build is required on the server.

## Publish in cPanel

1. Open **Git Version Control** and select **Manage** for this repository.
2. Confirm the selected branch is **main**.
3. Open **Pull or Deploy** and click **Update from Remote**.
4. When the update completes, click **Deploy HEAD Commit**.

Repository: https://github.com/vgutennm/setupshoponline-live.git

The existing deployment destination is preserved: `/home/aha7hfr64vl1/public_html/`.

The checked-in `.cpanel.yml` copies assets, all eight page files, QR codes, search summaries, and Apache routing. It copies `index.html` last. It does not delete unrelated files from the hosting account.

## Included copy update

- Business-first positioning for small and midsized service businesses.
- Measurable business value, implementation, adoption, and measurement.
- Seven-step method on Why Us.
- Greater capacity, more freedom and choice.
- Website prices and the homepage reviews section removed.

The AI Strategy Call remains a one-hour session. Calendly account settings are managed separately.

## Build provenance

Built from website source revision `95d0df879f0fe8800e3d5931502496d8821b5e9c` on September 28, 2026.

For future updates, rebuild the website source and copy its generated public files here. Keep this deployment configuration and do not publish source files, credentials, or `node_modules` into the web root.

cPanel documentation: https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-deployment/
