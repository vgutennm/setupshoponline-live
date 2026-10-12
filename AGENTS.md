# Set Up Shop Online working instructions

## Button consistency

When Vlad requests a button label, destination, style, or behavior change, locate every instance of that same action before editing. Check the desktop header, mobile header and menu, hero, sticky action bar, footer, and other pages. Update equivalent instances together. Do not assume one responsive layout shares its implementation with another.

The free assessment action uses the exact label "Start My Free Assessment" and the destination "/free-business-strategy". Keep actual appointment booking and strategy review actions separate; do not relabel a different action merely because its text is similar.

Before reporting completion, search active source, rendered HTML, and referenced browser bundles for obsolete labels and links. Check desktop and mobile views when browser verification is available. If it is unavailable, state that limitation instead of claiming visual verification.

Use a shared label and destination definition in the editable application wherever possible. Preserve this instruction in the Sites source repository as well when that checkout becomes available.

## Source synchronization

On October 9, 2026, the Sites editing environment was offline. The production repository was updated directly with the exact free assessment label replacement in rendered pages and the active browser bundles. New bundle filenames avoid stale browser caches. The Sites review copy and its editable source have not received this label correction.

Before the next generated build is copied here, apply the same label correction to the Sites source, including both desktop navigation and the mobile menu, and carry these working instructions into that checkout. Confirm the source build preserves the hero dot alignment fix and the assessment labels. Do not overwrite this correction with older generated output.

## Publication

Use repository "vgutennm/setupshoponline-live", branch "main". Preserve PHP gateways, server configuration, cron integrations, and the existing cPanel deployment configuration.

Pushing to GitHub does not publish setupshoponline.com. Public publication requires cPanel Git Version Control: Update from Remote, then Deploy HEAD Commit. Verify the public result before claiming it is live. The Sites review URL is a separate publication.


## Conversion kit

Keep /conversionkit unlisted. Never link to this landing page from desktop or mobile navigation, the footer, other pages, public discovery files, or the PDF access page. Exclude it from the sitemap and retain noindex in both static and client-rendered metadata. Visitors reach it through a directly shared address. Preserve PDF access and the confirmation email's private PDF link.

The `/conversionkit` form delivers the Conversation to Client Conversion Kit using the existing Google reCAPTCHA and delegated Outlook services. Contact information is for kit fulfillment only; never enroll these requests in marketing, sales calls, or texts. Keep the PDF, templates, configuration, and lead records outside public_html. Preserve the old workbook behavior when modifying shared `server/app.php`.

The saved Sites source also contains a separate agentic assessment draft. A conversion kit release must copy only its new pages and assets plus its explicitly changed API/server/deployment files. Do not replace existing production pages with that separate draft. See CONVERSIONKIT.md for deployment and verification.




## Desktop navigation

Show the full header at viewport widths of 1024px and above, and the hamburger below 1024px. Include Home, AI Journey with Products/Services/Solutions, Company Info with Why Us/Contact, the blue 201-757-0134 link to tel:+12017570134, and the orange Free Business Strategy Report action to /free-business-strategy. Keep the conversion kit header consistent while leaving that landing page unlisted.
