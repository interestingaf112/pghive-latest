# Site Audit Report
**Date:** 2026-06-24
**Project:** PG wala (pg-web)
**Detected stack:** React 19.2.6, Firebase 10.7.0, Vite 8.0.12, Lucide-React 0.468.0
**Detected audience/goal:** College students and young professionals seeking zero-brokerage paying guest (PG) accommodations in Bangalore, and property owners seeking direct listing visibility.
**Design system maturity:** Partially tokenized — Uses a structured CSS variable system for colors, shape scales, and spacing, though some ad-hoc CSS properties exist.

---

## Anti-Pattern Verdict
Does this look AI-generated? **Partially**
- **Trending Color Sameness**: Uses the classic Action Blue (`#0066cc`) accent color. While clean, this is heavily featured in AI templates.
- **Decorative Glassmorphism & Blobs**: Includes 4 floating ambient blur gradient background blobs (`blob-1`, `blob-2`, etc.) which are purely decorative, though visually pleasing.
- **Card-Grid Overuse**: The PG listings page and Neighborhood Hubs are laid out in card grids. However, this is standard UX for directories (e.g., Airbnb).
- **Template Layout**: The structure follows a standard marketing flow: Centered split hero → Neighborhood hub cards → Search filters → Listing catalog grid → Step-by-step "how it works" flow → Footer.
- **Verifiable Dynamic Metrics**: **No slop tell here!** The metric ("Join Bangalore's largest co-living community with X verified listings") dynamically renders `{pgs.length}`, meaning it represents real database counts rather than a fabricated static number.
- **Verdict Score:** **3/4** (Highly functional, includes clean custom logic and dynamic calculators, but follows typical layout templates).

---

## Audit Health Score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | Modals lack focus traps, Escape key dismissals, and form label/input association. |
| 2 | Performance | 3/4 | The wildcard transition rule `* { transition: ... }` causes layout recalculation overhead. |
| 3 | Security | 3/4 | Local fallback mode stores admin password updates in plaintext in `localStorage`. |
| 4 | Theming & design system | 4/4 | Robust light/dark theme CSS variables with support for browser CSS view-transitions. |
| 5 | Responsive design | 3/4 | Fully responsive grid system, but touch targets on mobile close buttons/nav are sub-44px. |
| 6 | Anti-patterns | 3/4 | Standard catalog layout, but features dynamic data integrations instead of mock values. |
| | **Total** | **18/24** | **Good** |

Rating bands: 21-24 Excellent · 16-20 Good · 11-15 Acceptable · 6-10 Poor · 0-5 Critical

**Legal & compliance flags:**
- **Privacy Policy:** **Missing / Orphaned** (Footer link points to `#`). This is a compliance exposure since personal user emails and phone numbers are captured.
- **Terms & Conditions:** **Present** (Linked via modal `TermsModal` in the footer).
- **Cookie consent:** **Missing** (No user consent modal before placing theme and session preferences in `localStorage`).
- **GDPR signals:** **Missing** (No way for users to request data export or deletion).
- **COPPA:** **N/A** (Platform doesn't target children under 13).

---

## Executive Summary
PG wala features a highly polished user experience, solid dynamic state management, and reliable client-side sanitization. The implementation of client-side image compression and direct Firestore Base64 uploads successfully avoids billing requirements on the free tier. The primary areas requiring attention are accessibility issues (missing keyboard focus loops and unassociated inputs) and legal compliance gaps (missing privacy policy content and cookie consent notices).

Total findings by severity: P0 [0] · P1 [4] · P2 [4] · P3 [3]

---

## Quick Wins
The highest-impact issues that are also straightforward to fix:
1. **Light Mode Contrast Violation** (P1) — Change light mode `--colors-muted` from `#7a7a7a` to `#757575` or darker to meet the WCAG AA 4.5:1 contrast requirement.
2. **Wildcard transition selector** (P2) — Remove `* { transition: ... }` in [index.css:90](file:///Users/abdulnafi/Desktop/pg%20web%20copy/src/index.css#L90) and target specific elements (buttons, inputs) to prevent layout thrashing.
3. **Escape Key Dismissal** (P1) — Add a global `keyup` window event listener in `App.jsx` to close active modals when the `Escape` key is pressed.

---

## Findings

### P0 — Blocking
*No issues found*

### P1 — Major

#### Missing Keyboard Focus Traps in Modals
- **Category:** Accessibility / Usability Heuristics (visibility of system status)
- **Location:** `src/components/PGDetailsModal.jsx`, `src/components/ListYourPGModal.jsx`, `src/components/PurchaseModal.jsx`
- **Issue:** When a modal is open, keyboard navigation (using the `Tab` key) is not trapped inside the dialog. Focus continues to cycle through background page elements.
- **User impact:** Blind and motor-impaired keyboard users will get disoriented, as they will interact with elements behind the modal overlay that they cannot see.
- **Fix:** Utilize a focus trap library (or implement a custom `keydown` listener checking for `Tab`/`Shift+Tab` boundary tags) to keep focus locked inside active modal windows.

#### Missing Escape Key Dismissal
- **Category:** Accessibility / Heuristics (user control and freedom)
- **Location:** `src/components/PGDetailsModal.jsx`, `src/components/ListYourPGModal.jsx`, `src/components/PurchaseModal.jsx`
- **Issue:** Modals cannot be closed using the standard `Escape` keyboard key. They can only be closed by clicking the small close icon or clicking the background overlay.
- **User impact:** Users navigating strictly with a keyboard cannot close overlays easily, leading to keyboard traps and abandoned tasks.
- **Fix:** Add a global `useEffect` listener for `keydown` events inside the modals to trigger the `onClose` callback when `event.key === 'Escape'`.

#### Unassociated Form Labels and Inputs
- **Category:** Accessibility (WCAG AA violation)
- **Location:** `src/components/ListYourPGModal.jsx` (Lines 191-224), `src/components/ResetPasswordModal.jsx` (Lines 75-96), `src/components/AdminDashboard.jsx`
- **Issue:** Input fields lack unique `id` attributes, and their corresponding `<label>` tags lack `htmlFor` properties referencing them.
- **User impact:** Screen readers will not announce what the input field is when focused, leaving visually impaired users unable to fill out listings or register securely.
- **Fix:** Add unique `id` tags to each `<input>` and `<select>` element, and match them with a `htmlFor` attribute on the corresponding `<label>`.

#### Missing Privacy Policy
- **Category:** Legal & Compliance
- **Location:** `src/App.jsx:876` (Footer component)
- **Issue:** The footer contains a "Privacy" link pointing to a dead anchor (`href="#"`), but no privacy policy page or terms are actually linked or present in the workspace.
- **User impact:** Collecting user emails, phone numbers, and WhatsApp contact details without a visible Privacy Policy violates FTC guidelines and GDPR compliance.
- **Fix:** Add a dedicated `PrivacyModal` or routing link that outlines what user data is collected and how it is protected.

---

### P2 — Minor

#### Wildcard CSS Transitions (Performance)
- **Category:** Performance
- **Location:** `src/index.css:90`
- **Issue:** The wildcard selector `*` is assigned transitions on `background-color`, `color`, `border-color`, and `box-shadow`.
- **User impact:** Triggers unnecessary style recalculations and layout rendering delays across every DOM node whenever any element changes state, resulting in scrolling lag.
- **Fix:** Explicitly define transitions on components that need them (e.g., `.btn`, `.form-input`, `.hub-card`) instead of targeting all nodes globally.

#### Sub-44px Mobile Touch Targets
- **Category:** Responsive design / Usability Heuristics
- **Location:** `src/index.css:1475` (`.image-nav-btn`), `src/index.css:700` (`.wishlist-heart-btn`)
- **Issue:** Touch targets for the image slider navigation buttons (28px) and wishlist save buttons (32px) are smaller than the recommended 44px minimum.
- **User impact:** Mobile users will struggle to tap image slider arrows and hearts, occasionally clicking the card instead and opening the details modal unintentionally.
- **Fix:** Increase the tap target size of slider buttons and heart icons using outer padding or larger dimensions (`min-width: 44px; min-height: 44px;`).

#### Low Contrast Muted Text in Light Mode
- **Category:** Accessibility
- **Location:** `src/index.css:22` (variable `--colors-muted`)
- **Issue:** In light mode, `--colors-muted` is set to `#7a7a7a` which has a contrast ratio of `4.06:1` against white backgrounds (`#ffffff`).
- **User impact:** Fails the WCAG AA contrast ratio of `4.5:1` for regular text, making text hard to read for users with moderate visual impairments.
- **Fix:** Darken the light mode muted color token to `#757575` or lower.

#### Plaintext Password in LocalStorage (Local Mode fallback)
- **Category:** Security
- **Location:** `src/firebase.js:1059`
- **Issue:** When running in mock Local Mode, password changes are written directly to `localStorage` in plaintext (`localStorage.setItem('pg_wala_admin_pass', newPassword)`).
- **User impact:** If the application is vulnerable to an XSS attack, any script running in the browser could access the local admin password.
- **Fix:** Hash the password (e.g., using SHA-256) before storing it in `localStorage` in mock local mode.

---

### P3 — Polish

#### Non-Semantic Elements with Click Listeners
- **Category:** Usability Heuristics / Accessibility
- **Location:** `src/components/PGDetailsModal.jsx:103` (Modal overlay `div`)
- **Issue:** The overlay uses a standard `div` element with an `onClick` listener but has no `role="button"`, no `tabIndex`, and no keyboard listener.
- **User impact:** Screen readers will not recognize the overlay as interactive, and keyboard users cannot trigger overlay clicks.
- **Fix:** Add a close button that is accessible, or attach a keyboard listener and role characteristics to the overlay element.

#### Emojis Used directly as Icons
- **Category:** Usability Heuristics (aesthetic and minimalist design)
- **Location:** `src/App.jsx:802` (`🔍 Search Catalog`), `src/App.jsx:808` (`🏠 List PG Free`)
- **Issue:** Emojis are embedded directly in raw button text without wrapper span controls or semantic wrappers.
- **User impact:** Screen readers will announce "magnifying glass Search Catalog" instead of just "Search Catalog", which can disrupt user reading flows.
- **Fix:** Wrap emojis in `<span role="img" aria-hidden="true">` or replace them with Lucide SVG icons.

#### Non-Semantic Table Elements for Fee Breakdown
- **Category:** Accessibility
- **Location:** `src/components/PGDetailsModal.jsx:392` (`.fee-breakdown-stack`)
- **Issue:** Spans and divs are used to create the layout for the price fee breakdown instead of standard HTML structure.
- **User impact:** Screen readers cannot navigate the rows/columns structurally.
- **Fix:** Re-factor pricing breakdowns to use standard `<table>`, `<tr>`, and `<td>` elements.

---

## Systemic Patterns
1. **Form Input Disconnects**: Across all modals and dashboards, text input structures fail to map `<label>` tags to `<input>` tags using standard identifier links.
2. **Modal Inaccessibility**: All modal overlays contain no focus traps, keyboard handlers, or background scrolls, creating keyboard navigation traps.
3. **Sub-Optimal Touch Targets**: Small tap points (under 44px) are repeatedly used for utility items like arrows, hearts, and close actions.

---

## Strengths
1. **Browser-side Image Optimization**: The dynamic client-side resizing and JPEG quality compression (yielding ~80KB images) prevent server document overflow without degrading visual quality.
2. **HMAC Tamper-Proof Credit System**: The use of HMAC-SHA256 signatures for local data variables is an exceptionally creative way to prevent credit tampering in local fallback mode.
3. **URL Slug Router**: Synchronizing locality filters with SEO-friendly path slugs (`/pg-in-koramangala`) via clean HTML5 `popstate` events is lightweight and robust.

---

## Recommended Priority Order

1. **Explicitly Associate Form Labels**: Add `id` to inputs and match them with `htmlFor` in labels in all form files. (Prevents major screen reader failures).
2. **Add Escape Key Close listener**: Bind `keydown` Escape events to all active modal windows. (Allows keyboard users to exit dialogs).
3. **Darken Muted Contrast Color**: Darken `--colors-muted` in `index.css` to `#757575`. (Resolves WCAG contrast ratio violations).
4. **Remove Wildcard transitions**: Change `* { transition: ... }` to target specific elements in `index.css`. (Improves frame rates and scrolling performance).
5. **Add a Privacy Policy Modal**: Create and link a simple privacy document modal to replace the dead footer link. (Protects against compliance liabilities).
