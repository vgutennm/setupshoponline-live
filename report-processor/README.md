# Report processor source reference

These files record the PDF CTA changes used by the separately deployed Sites report processor. They are source references, not standalone PHP or deployable Worker files. The full source and bundled assets are maintained in Sites project appgprj_6abab2a1219481918c6104b0b15bc920 at source commit e776063fe9a546f882b02f395e632a849667f4a6.

The processor is already deployed. cPanel calls it through server/growth-public.php. Existing .cpanel.yml tasks intentionally do not copy this reference directory into public_html.
