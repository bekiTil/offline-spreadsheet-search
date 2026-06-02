# Offline Spreadsheet Search

Offline Spreadsheet Search is an offline-first, installable browser app for non-technical office users.

The daily flow is simple:

```text
Install app → Open app → Add Files → Choose Search Columns → Search
```

The first screen is a simple install page. File upload is only available inside the installed app window.

## Privacy promise

Your spreadsheet files stay on this computer.

A static host only serves the app files. Spreadsheet work happens on the user's computer.

## Recommended Node version

Use Node 20 LTS or Node 22 LTS.

Do not use experimental Node 25 for this project.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

The local development app opens at:

```text
http://127.0.0.1:5173
```

The production preview opens at:

```text
http://127.0.0.1:4173
```

## If your install is broken

```bash
rm -rf node_modules package-lock.json
npm install
```

## If a Vite module error occurs

For example, if Vite tries to load a broken path like `node_modules/dist/node/cli.js`, clean the install and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The production app is created in:

```text
dist/
```

## Deploy to Vercel

Recommended Vercel settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

After deployment, give users the Vercel HTTPS link. They can install the app from the browser.

## Supported file types

- CSV
- TSV
- XLSX
- XLS

The code is structured so ODS support can be added later.

## Testing checklist

Use this before giving the app to users:

- [ ] Import one CSV
- [ ] Import multiple CSV files
- [ ] Import XLSX
- [ ] Import XLS
- [ ] Import TSV
- [ ] Invalid file error
- [ ] Missing values
- [ ] Many columns
- [ ] First screen asks the user to install the app
- [ ] Imported rows are visible before typing a search value
- [ ] Search one file
- [ ] Search all files
- [ ] Search selected column
- [ ] Exact search
- [ ] Partial search
- [ ] Case-insensitive search
- [ ] No results
- [ ] Close and reopen browser
- [ ] Offline after first load
- [ ] Install app from Vercel HTTPS link

## Important browser note

An installable PWA normally needs HTTPS or localhost. Do not expect double-clicking `index.html` from `file://` to install the app.

Use Mode A first for a startup-quality user experience.

## Final packaging instruction for developers

1. Run `npm run build`.
2. Use `dist/` as the production app.
3. Host `dist/` on Vercel or another HTTPS static host.
4. Give users the private app link.
5. Users install the app from the browser.


## Important: Vercel does not mean spreadsheet files go to the cloud

Mode A uses Vercel only to host the app files: HTML, CSS, JavaScript, icons, and the service worker. When a user imports a spreadsheet, the spreadsheet is parsed inside the user's browser and saved in that browser on that computer. This project has no backend API, no upload endpoint, no login, and no server database.

What Vercel can see: normal website requests for the app files, such as loading `index.html` and JavaScript assets.

What Vercel does not receive from this app: the user's imported spreadsheet contents, search terms, saved rows, or selected search columns.

For stricter company environments, the same `dist/` folder can also be hosted on any internal HTTPS static hosting.

## If the install option does not appear during local testing

1. Use Chrome or Edge.
2. Open `http://127.0.0.1:5173`.
3. Refresh the page once after the first load.
4. Look near the address bar. If Chrome shows **Open in app**, the app is already installed.
5. If you want to test installation again, remove the existing installed app from Chrome first, then refresh.

## Important: file upload works only in the installed app window

This version intentionally blocks file upload in the normal Chrome/Edge browser tab. This is to keep the non-technical user experience simple and app-like.

Expected flow:

1. Open the app link.
2. Install Spreadsheet Search.
3. Open the installed app window.
4. Add spreadsheet files inside the installed app window.

If Chrome shows **Open in app** near the address bar, click it. That means the app is already installed.

The normal browser tab may continue showing the install screen. That is intentional.
