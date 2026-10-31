<?php
// Copy outside public_html to .setupshoponline-workbook/alignable-config.php.
// Configure TEST first; use separate prices, API keys and webhook endpoints for LIVE.
return [
 'STRIPE_MODE'=>'test',
 'STRIPE_SECRET_KEY'=>'',
 'STRIPE_PRICE_ID'=>'price_1UWgduD6EfIksOoB9YbPNGAd', // Supplied by Vlad. Verify account, mode and USD 499 cents before enabling.
 'STRIPE_WEBHOOK_SECRET'=>'',
 'TAX_TOTAL_CONFIRMED'=>false, // Vlad must confirm $4.99 final total and applicable seller/tax requirements.
 'SENDER_VERIFIED'=>false, // Verify production authenticated Outlook sender and real delivery to Vlad.
 'BOOKING_VERIFIED'=>true, // Verified active, 15 min, with available dates on October 31, 2026. Recheck before launch.
 'VIDEO_URL'=>'', // Final video under 60 seconds, HTTPS MP4.
 'VIDEO_CAPTIONS_URL'=>'', // HTTPS WebVTT captions.
];
