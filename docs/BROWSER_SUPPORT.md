# Browser portability (NFR-07)

Requirement: the web client renders and operates correctly on the latest two major released
versions of Chrome, Firefox and Safari.

## Approach

- Plain HTML + one stylesheet; scripts use `XMLHttpRequest` and ES5 syntax only, no external
  CDN resources, no vendor-prefixed CSS.
- CSS limited to long-standing features (flexbox, grid with `auto-fit/minmax`, custom
  properties, `:focus-visible`, `prefers-reduced-motion`).
- Browser storage is wrapped in `try/catch` (Safari private mode, blocked storage).
- `npx jest tests/browser-compat.test.js` lints every page in `web/` for these rules and runs in CI.

## Manual verification matrix (run before release)

Record the version tested and Pass/Fail. "Latest two" = current stable and the one before it.

| Page / flow | Chrome N | Chrome N-1 | Firefox N | Firefox N-1 | Safari N | Safari N-1 |
|---|---|---|---|---|---|---|
| login.html: form renders, submits | | | | | | |
| board.html: columns lay out, search works | | | | | | |
| task.html: details and comments render | | | | | | |
| dashboard.html: counts load, 401 redirects to login | | | | | | |
| Keyboard: skip link, tab order, focus ring visible | | | | | | |
| Narrow viewport (360px): no horizontal scroll | | | | | | |

Safari must be checked on macOS or iOS; it cannot be run from Windows/Linux CI. BrowserStack or a
Mac is needed for that column.
