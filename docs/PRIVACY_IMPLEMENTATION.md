# Privacy implementation and launch review

Current code uses the essential `pclease_session` cookie, language and theme
storage, and session storage for recovery of pending customer actions. Google
Fonts are loaded remotely. No analytics or advertising integrations were found
in the checked project code. Hosting, external CDN/proxy settings and browser
network behaviour must be audited again before launch.

The preferences banner stores a versioned choice and timestamp in this browser;
the choice expires after 180 days. It is not a server-side consent log and does
not establish legal compliance by itself. The local privacy page is explicitly a
draft. Controller identity, providers, transfers, retention, user-rights
procedures and the final notice need confirmation and legal review.

Before adding an optional integration, update the notices, increment the
preference key and version, and require fresh consent for the actual service.
Load the service only after `optionalTrackingAllowed` approves its category;
subscribe to `pc-lease:privacy-preferences-changed` to stop it and remove its
nonessential cookies and identifiers on withdrawal. Prove both pre-consent and
withdrawal behaviour in browser/network tests. Do not classify marketing as
essential or rely on a prior preference for a newly added provider.
