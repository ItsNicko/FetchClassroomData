# Google Classroom → Microsoft To Do Sync (via Google Sheets + n8n)

## Overview

Procrastination turns simple assignments into mountains, it’s not about laziness, but the friction to get started. To hack that, I built a system that pulls my active Google Classroom assignments into a Google Sheet, then pushes them into Microsoft To Do through n8n, where I actually get stuff done.

### Problem

Because school/Google blocks direct access to Google Classroom’s API, I use Google Apps Script running inside Google’s ecosystem to fetch assignments and write them to Sheets. Then n8n watches the sheet for new tasks to send over. It’s a workaround born from necessity, but it smooths the workflow and helps me focus by making tasks visible where I want them.

---

## How It Works (Workflow Summary)

- **Google Apps Script** runs regularly and:
  - Fetches all active assignments from your Google Classroom courses.
  - Adds or updates assignment rows in the Google Sheet with:
    - Class Teacher
    - Assignment title
    - Due Date (or "No due date")
    - Status (`CREATED`, `RETURNED`, or blank)
    - A `Synced` flag that tracks if n8n already processed it.
  - Removes assignments that are no longer active or are marked as **TURNED_IN**.
  - Keeps the `Synced` flag intact for assignments already processed.

- **Google Sheet** acts as a staging area holding all active, unsynced assignments.

- **n8n Workflow**:
  - Watches for rows where `Synced` is empty.
  - Updates the `Synced` flag when it processes an assignment.
  - Sends assignment details to Microsoft To Do, so you get reminders where it actually motivates you.

---

## Why This Exists

Since I'm under 18, I can’t use Google Cloud’s full API access because of their age restrictions. That’s why I rely on Google Apps Script running inside Google’s ecosystem, it’s an official, allowed way to access Classroom data without breaking rules. This workaround keeps everything legit while still giving me the control I need to sync assignments to Microsoft To Do.

It’s not just code; it’s a personal productivity hack that turns the overwhelm into something manageable.

---

## Column Definitions

| Column        | Description                                                        |
|---------------|--------------------------------------------------------------------|
| Class Teacher | The name of the course or teacher from Google Classroom           |
| Assignment    | The title of the assignment                                        |
| Due Date      | Due date in YYYY-MM-DD format, or "No due date" if none set       |
| Status        | Submission state: usually `CREATED` or `RETURNED`, blank if not yet synced |
| Synced       | Flag indicating if n8n has processed this assignment              |

---

## Example Rows

| Class Teacher | Assignment         | Due Date   | Status     | Synced |
|---------------|--------------------|------------|------------|--------|
| Mr. Smith     | Read Chapter 5     | 2025-08-15 | CREATED    | YES    |
| Ms. Johnson   | Science Project    | No due date| RETURNED   |        |

*(Note: The blank `Synced` means n8n hasn’t processed it yet.)*

---

## Setup & Usage

### Google Apps Script

1. Open your Google Sheet (or create one).
2. Attach this script (`exportClassroomAssignmentsToSheet`) in the script editor.
3. Set your target Spreadsheet ID and sheet name in the script config.
4. Run it once and authorize permissions.
5. Schedule the script to run periodically (e.g., every 10 minutes) to keep your assignments up to date.

### n8n Workflow

1. Connect Google Sheets to read rows where `Synced` is empty.
2. When n8n picks a row, update `Synced` to mark it processed.
3. Send the assignment data as a task to Microsoft To Do.
4. Repeat on schedule or trigger to keep syncing fresh tasks.

---

## Notes & Behavior

- Assignments marked **TURNED_IN** in Google Classroom get removed from the sheet, so you don’t see completed tasks.
- When rows are deleted, their `Synced` flags disappear naturally.
- The script preserves the `Synced` flag for assignments already synced, avoiding duplicates.
- This workflow depends on your Google account’s OAuth permissions to access Classroom data.

---

## Script Walkthrough (High-Level)

- Opens the target Google Sheet or creates it if missing.
- Ensures correct headers exist; clears old data if headers changed.
- Loads existing assignments into a map keyed by "Class Teacher|Assignment" for quick lookup.
- Uses Apps Script’s OAuth token to fetch active courses and coursework from Google Classroom API.
- Deletes rows for assignments no longer active.
- For active coursework, fetches submission status and skips those already turned in.
- Updates or adds rows for current assignments, preserving the synced status.
- Logs actions for transparency.

---

## Why I Built This

Procrastination isn’t just a problem, it’s a signal that the way work is presented to me isn’t motivating. By moving assignments into Microsoft To Do, where I get visual reminders and satisfaction from crossing things off, I trick my brain into starting and staying on track. This isn’t just tech, it’s a personal ecosystem to turn intention into action.
