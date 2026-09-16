# Voice Expense Input UI Prototypes

These static prototypes visualize the approved architecture against the current Expense Tracker dashboard design. They do not call a microphone, STT provider, LLM, or backend API.

Use the EN / සිං / த controls in any scenario to switch the complete voice flow and sample transcript between English, Sinhala, and Tamil. The chosen language is preserved while navigating between screens.

Open [index.html](index.html) in a browser, then review each state:

1. [Dashboard mic entry](01-dashboard-mic.html)
2. [Recording / voice input](02-recording.html)
3. [Transcript and extracted draft](03-draft-preview.html)
4. [Final save confirmation](04-confirm-dialog.html)

The pages share prototype.css and prototype.js. Buttons link between the scenarios so the flow can be reviewed without running the React application.

## Intended interaction

    Dashboard mic
      -> recording panel
      -> transcript and expense draft
      -> Proceed
      -> confirmation dialog
      -> Confirm and save

Retry returns to recording. Discard returns to the dashboard. The final confirmation is the only point at which the eventual implementation would call POST /api/expenses.

## Review questions

- Is the mic discoverable but unobtrusive?
- Should the voice panel be a desktop side card and mobile bottom sheet?
- Is the transcript-as-message presentation clear?
- Are all expense fields and inferred/defaulted warnings visible enough?
- Is the extra confirmation dialog desirable, or should Proceed save directly?
