# 💰 FinWise – Expense Tracker

A simple, mobile-friendly web app to track savings and daily expenses.

## Features
- Add total savings with source of income; add more any time
- Record daily expenses with category and description (where & why)
- Amount is deducted from savings automatically
- Monthly spending limit with warnings at 80% and when crossed
- Spending tips when you overspend
- Edit or delete any savings or expense entry
- Installable on your phone (PWA), works offline, light/dark mode
- Data is stored privately in your browser (`localStorage`) – no server

## Run locally
Open `index.html` in a browser, or run `python3 -m http.server 8000` and visit http://localhost:8000

## Deploy on GitHub Pages
1. Create a new GitHub repository (e.g. `finwise`).
2. Upload all files from this folder (or `git push` them) to the `main` branch.
3. Go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The included workflow deploys automatically. Your app goes live at
   `https://<your-username>.github.io/<repo-name>/`

(Alternative: Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.)

## Notes
- Data lives in the browser of the device you use; it does not sync between devices. Clearing browser data erases it.
- Tips on the Budget tab are rule-based here. Real AI suggestions need a backend that keeps an API key secret; never put an API key in front-end code.
- Icons are cropped from the FinWise artwork you supplied.

## Structure
```
index.html   css/style.css   js/app.js
manifest.json   sw.js   assets/   .github/workflows/pages.yml
```
