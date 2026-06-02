# Delivery Guide

## Recommended startup delivery: Mode A

Mode A is the recommended version for non-technical users.

### Developer flow

1. Build the app.

```bash
npm run build
```

2. Deploy the project to Vercel.

Use these settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

3. Give users the private HTTPS app link.

Example:

```text
https://spreadsheet-search-your-company.vercel.app
```

4. Users open the link and install the app from the browser.

### User flow

1. Open the Spreadsheet Search link.
2. Click **Install Spreadsheet Search**.
3. Confirm installation.
4. Use the app icon next time.

### Why Mode A is best first

- No OS-specific installer
- No Windows/macOS/Linux packaging problem
- No command-line steps for final users
- Works through a normal secure browser link
- Easy to update for all users
- Still keeps spreadsheet files on the user's computer

## Later option: Mode B

Mode B is a fully offline package that can be added later.

### Future developer flow

1. Build the app with `npm run build`.
2. Wrap the built app with a tiny local launcher or Tauri shell.
3. Package a zip.

### Future user flow

1. Extract zip.
2. Double-click **Start Spreadsheet Search**.
3. Browser opens local app.
4. Use the app.

## Important PWA reality

An installable browser app normally needs HTTPS or localhost.

Do not promise that users can double-click `index.html` from `file://` and install the PWA.

## What Vercel stores

Vercel stores and serves only the app code.

The user's spreadsheet files are not sent to Vercel by this app. They are read, saved, and searched locally in the user's browser.


## Privacy explanation for Mode A

Hosting on Vercel does not make the spreadsheet data cloud-based. Vercel hosts only the application shell. The browser downloads the app, and then the app reads spreadsheet files locally in the user's browser.

This project does not include:
- a backend server
- an upload API
- a server database
- login accounts
- cloud file storage

The imported spreadsheet rows stay in the user's browser storage on the same computer/browser. Users should use the same browser to keep their imported files.

## Install troubleshooting

If Chrome shows **Open in app** near the address bar, the PWA is already installed. Click that button to open the installed app window.

If the install prompt does not show on localhost, refresh once. During development, the service worker may need one page load before Chrome decides the app is installable.

## Strict install-first behavior

The app intentionally does not allow spreadsheet import from the regular browser tab. Users must install and open the PWA app window first.

This makes the product feel like a real desktop-style app and prevents non-technical users from mixing browser-tab usage with installed-app usage.

For Vercel mode:

1. User opens the HTTPS Vercel link.
2. User installs the app.
3. User opens the installed app window.
4. User imports and searches files locally.

Vercel still does not receive spreadsheet files. It only serves the static app files.
