# Set Up Shop Online publishing workflow

For this website, the public production site is https://setupshoponline.com on cPanel. Publishing the Sites review copy alone does not publish the public website.

When Vlad requests publishing website changes:

1. Prepare and verify the updated website build.
2. Push the production website changes to https://github.com/vgutennm/setupshoponline-live.git on branch main. Inspect that repository's existing structure and deployment configuration first. Preserve its PHP gateways, configuration, and cron integrations.
3. In cPanel Git Version Control, select setupshoponline-live at /home/aha7hfr64vl1/repositories/setupshoponline-live.
4. Use Update from Remote, then Deploy HEAD Commit.
5. Verify the deployed commit and the requested changes on https://setupshoponline.com before reporting public publication as complete.

The hosting management server shown by Vlad is p3plzcpnl508833.prod.phx3.secureserver.net:2083. Reuse an authorized session or secure sign-in flow; never request secrets in chat.

If repository or hosting access is unavailable, explain the specific blocker. Do not substitute a Sites publication or claim cPanel was updated. The Sites project is appgprj_6abab2a1219481918c6104b0b15bc920 and its review URL is https://setupshoponline.vlad554726.chatgpt.site.

Vlad explicitly requested that this workflow be remembered for all future work on this website.


## Button changes

Show full desktop navigation from 1024px upward: Home; AI Journey with Products, Services, and Solutions; Company Info with Why Us and Contact; a blue 201-757-0134 link to tel:+12017570134; and the red Free Agentic Readiness Assessment action to /free-agentic-readiness-assessment. Use the hamburger only below 1024px. Keep the conversion kit header consistent while keeping the landing page unlisted.

Before changing an action label, URL, style, or behavior, find every equivalent instance in desktop navigation, mobile navigation, hero, sticky bars, footer, and other pages. Update them together and search active source and generated output for obsolete variants. Keep distinct offers distinct. Preserve the agentic assessment draft, including its separate call to action, when editing other pages.

## Conversion kit

Keep /conversionkit unlisted. Never link to this landing page from desktop or mobile navigation, the footer, other pages, public discovery files, or the PDF access page. Exclude it from the sitemap and retain noindex in both static and client-rendered metadata. Visitors reach it through a directly shared address. Preserve PDF access and the confirmation email's private PDF link.

The /conversionkit form is a transactional request only. It must not enroll people in marketing, authorize sales calls or texts, or add unrelated data collection. Reuse the production Google reCAPTCHA and delegated Outlook configuration through cpanel/server/app.php. The private Sites preview must not collect contact data or pretend to send emails. Keep backend files and PDFs outside public_html; provide authenticated inline PDF access plus an email attachment.

## Primary assessment promotion
Use Free Agentic Readiness Assessment and /free-agentic-readiness-assessment for all general website assessment calls to action. Keep Free Business Strategy Report promotion only in its Products catalog entry; preserve that product’s assessment flow. Agentic Readiness is the first Products offering. Keep booking and mobile intro actions separate. Audit shared sections, footers, contact, booking, and thank-you pages whenever updating assessment promotion.
