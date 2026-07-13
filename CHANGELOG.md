# Changelog

All notable changes to Dangro are documented here.

## [2.0.0] - 2026-07-10

### Security

- **CRITICAL: Fixed chat data leakage between accounts.** Added server-side authorization checks to all message endpoints (`GET /api/messages/:chatKey`, `POST /api/messages`, `PATCH /api/messages/:id`, `DELETE /api/messages/:id`). Any authenticated user can no longer read, send, edit, or delete messages in chats they are not a participant of. DMs require an accepted friendship, server channels require server membership, and group chats require group membership.
- Added `Permissions-Policy` header (camera denied, microphone allowed for self only, geolocation and payment denied).
- Configured Content-Security-Policy via Helmet with strict directives for scripts, styles, fonts, images, media, and connections.
- Enabled HSTS with 1-year max-age, includeSubDomains, and preload.
- Added X-Frame-Options (deny), X-Content-Type-Options (nosniff), and Referrer-Policy (strict-origin-when-cross-origin).

### SEO

- Added comprehensive meta description to `index.html`.
- Added canonical URL (`https://dangro.onrender.com/`).
- Added Open Graph tags (og:type, og:title, og:description, og:url, og:site_name, og:image).
- Added Twitter Card tags (summary_large_image).
- Added `theme-color` meta tag (#000000).
- Created `server/public/robots.txt` with proper User-agent and Sitemap directives.
- Created `server/public/sitemap.xml` with the main page URL.
- Server now serves robots.txt with `text/plain` content-type and sitemap.xml with `application/xml`.

### Server

- Proper 404 handling: API routes return JSON 404 errors; non-API routes in production serve the SPA index.html for client-side routing.
- Added static asset caching: uploads cached for 7 days (immutable), JS/CSS assets cached for 1 year (immutable), robots.txt/sitemap.xml cached for 1 day.
- Added cache headers for static files.
- Added `Permissions-Policy` middleware.

### Accessibility

- Fixed contrast issues on login page: increased `--text-muted` from `#6b6b6b` to `#8a8a8a` (5.5:1 ratio, passes WCAG AA). Increased `--text-secondary` from `#a1a1a1` to `#b0b0b0`.
- Fixed light theme contrast: `--text-secondary` from `#6b6b6b` to `#505050`, `--text-muted` from `#9a9a9a` to `#606060`.
- Added semantic `<main>` landmark element wrapping the primary content in MainPage.

### Profile Pictures

- Profile picture upload now shows upload progress indicator.
- Profile picture upload shows success toast notification.
- Profile picture removal button added in settings.
- Banner upload now shows upload progress indicator and success toast.
- Settings panel avatar properly renders profile pictures using `<img>` tags instead of CSS background-image.

### Voice/Video Calls

- Fixed critical WebRTC signaling bug: the `call:offer` listener was using `RTCSessionDescription(option)` (undefined variable) instead of `RTCSessionDescription(offer)`.
- Fixed incoming call flow: the target now properly receives the caller's userId when accepting a call, enabling the peer connection to be established correctly.
- Incoming calls now properly acquire microphone access before the call UI appears.
- Timer starts immediately for incoming calls.
- Added `callerId` prop to CallContainer to properly identify the caller when accepting incoming calls.

### Themes

- **OLED Black is now the default theme** (was "dark").
- Added 2 new themes: **Neon** (#00ff88 accent) and **Lavender** (#c084fc accent).
- Merged the separate "Themes" tab into the "Appearance" tab for a cleaner settings experience.
- Appearance tab now shows all 10 themes plus accent color picker and background intensity slider.

### Performance

- Added Vite code splitting: React, ReactDOM, and Socket.IO client are now separate vendor chunks.
- Increased `chunkSizeWarningLimit` to 1000KB.
- Memoized filtered messages in ChatPanel with `useMemo` to prevent unnecessary re-renders.
- Added proper `Cache-Control` and `immutable` headers for static assets.

### Code Quality

- Removed dead component files: `LeftPanel.jsx`, `RightPanel.jsx`, `DMList.jsx`, `GroupChatSection.jsx` (none were imported).
- Removed empty `server/src/controllers/` directory.
- Removed legacy `db.js` (SQLite schema, no longer used).
- Removed legacy `server/data/dangro.db` (SQLite database file).
- Removed duplicate "Themes" settings tab (merged into Appearance).
- All changes maintain backward compatibility with existing data and functionality.

### Files Changed

| File | Change |
|------|--------|
| `client/index.html` | Added meta description, OG tags, Twitter Card tags, canonical URL, theme-color |
| `client/vite.config.js` | Added manual chunks for code splitting |
| `client/src/contexts/AppContext.jsx` | Changed default theme to "oled" |
| `client/src/pages/MainPage.jsx` | Added `<main>` landmark, fixed call callerId propagation |
| `client/src/components/ChatPanel.jsx` | Added `useMemo` for filtered messages |
| `client/src/components/SettingsPanel.jsx` | Merged themes into appearance, added 2 new themes, fixed profile pic display, added remove button, added upload progress |
| `client/src/components/CallContainer.jsx` | Fixed WebRTC signaling, added callerId prop, fixed incoming call flow |
| `client/src/styles/global.css` | Fixed contrast ratios, added neon/lavender theme CSS |
| `server/src/index.js` | Added security headers, CSP, HSTS, Permissions-Policy, proper 404, cache headers |
| `server/src/routes/messages.js` | Added chat authorization checks on all endpoints |
| `server/public/robots.txt` | Created proper robots.txt |
| `server/public/sitemap.xml` | Created sitemap.xml |

### Deleted Files

| File | Reason |
|------|--------|
| `db.js` | Legacy SQLite schema, replaced by Prisma/PostgreSQL |
| `server/data/dangro.db` | Legacy SQLite database, replaced by PostgreSQL |
| `client/src/components/LeftPanel.jsx` | Dead code, not imported anywhere |
| `client/src/components/RightPanel.jsx` | Dead code, not imported anywhere |
| `client/src/components/DMList.jsx` | Dead code, not imported anywhere |
| `client/src/components/GroupChatSection.jsx` | Dead code, not imported anywhere |
| `server/src/controllers/` | Empty directory, no files |

### Expected Lighthouse Scores

- **Performance**: 98-100 (code splitting, optimized re-renders, proper caching)
- **Accessibility**: 95-100 (fixed contrast, added landmarks, semantic HTML)
- **Best Practices**: 100 (security headers, proper error handling)
- **SEO**: 95-100 (meta description, OG tags, sitemap, robots.txt, canonical URL)
