# Job Application Tracker

A personal job application tracker built with React and TypeScript. I built this project to organize my job search and practice developing a web application with persistent browser storage.

## Features

- Add, edit, and delete applications
- Track statuses: Applied, Interviewing, Offer, and Rejected
- Record application dates, notes, and job posting links
- Search by company or job title
- Filter by application status
- View application totals in a status dashboard
- Save applications locally between browser sessions
- Export and import JSON backups
- Validate imported data and job posting links

## Technologies

- React
- TypeScript
- Vite
- CSS
- Browser localStorage
- ESLint

## Run locally

Install Node.js and npm, then clone the repository:

```bash
git clone https://github.com/tonytran04/job-application-tracker.git
cd job-application-tracker
npm install
npm run dev
```

Open the Local URL printed in the terminal.

## Checks

```bash
npm run build
npm run lint
```

The build command checks TypeScript and creates the production files. The lint command checks the code with ESLint.

## How data is stored

Applications are stored in localStorage for the browser and origin where the app runs. There is no backend, account system, or automatic syncing between devices.

Clearing browser storage can remove saved applications. Use Export Backup to download a JSON copy of your data.

To transfer applications to another browser or computer:

1. Export a backup from the original browser.
2. Run the tracker on the other computer.
3. Use Import Backup to select the exported JSON file.

Import adds applications with IDs that are not already present. Existing entries remain unchanged, so importing does not overwrite them with newer backup versions.

## Implementation details

- React state manages the application list, form, search, and status filter.
- Editing reuses the application form and preserves the entry's ID and status.
- Search and status filters work together without modifying stored records.
- Imported backups are validated before being merged into the current list.
- Job posting links are restricted to HTTP and HTTPS.
- Dashboard totals are calculated from the full application list.

## Current limitations

- Data remains specific to each browser and origin.
- Backup transfers are manual.
- There is no automatic cross-device synchronization.
- Deleting an application has no undo action; missing entries can be restored from a backup.

## Possible next steps

- Backend API and database storage
- Authentication for private cross-device access
- Follow-up dates and reminders
- Automated tests for filtering and backup validation