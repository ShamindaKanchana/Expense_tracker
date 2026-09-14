(function () {
  "use strict";

  var icons = {
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6.5a3.5 3.5 0 1 0-7 0V12a3.5 3.5 0 0 0 3.5 3.5Z"/><path d="M5.5 11.5v.5a6.5 6.5 0 0 0 13 0v-.5M12 18.5V22M8.5 22h7"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>',
    receipt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10a2 2 0 0 1 2 2v15l-3-1.7-4 1.7-4-1.7-3 1.7v-15a2 2 0 0 1 2-2Z"/><path d="M8.5 8h7M8.5 11.5h7"/></svg>',
    alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17.5v.1"/></svg>',
    retry: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 8a7.5 7.5 0 1 0 .2 7.7"/><path d="M19 3.5V8h-4.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"/></svg>',
    add: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
    report: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V10M10 19V5M15 19v-7M20 19V8"/></svg>',
    account: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="3.25"/><path d="M6.5 19c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/></svg>'
  };

  var baseMarkup = `
    <div class="app-shell">
      <header class="navbar">
        <a class="brand" href="01-dashboard-mic.html">ExpenseTracker</a>
        <nav class="desktop-nav" aria-label="Primary">
          <a class="nav-link active" href="#">Dashboard</a>
          <a class="nav-link" href="#">Add Expense</a>
          <a class="nav-link" href="#">Monthly Report</a>
        </nav>
        <div class="nav-actions">
          <div class="lang-switcher" aria-label="Language">
            <button class="lang active" type="button">EN</button>
            <button class="lang" type="button">සිං</button>
            <button class="lang" type="button">த</button>
          </div>
          <button class="theme-toggle" type="button" aria-label="Toggle theme">
            <span class="theme-icon"></span><span class="theme-label">Theme</span>
          </button>
          <span class="account-chip">
            <span class="account-avatar">S</span>
            <span class="account-copy"><span class="account-label">Account</span><span class="account-name">shaminda</span></span>
          </span>
          <button class="logout-button" type="button">Logout</button>
        </div>
      </header>

      <main class="main-content">
        <div class="dashboard-heading">
          <h1>Dashboard</h1>
          <a class="voice-entry" href="02-recording.html" aria-label="Add expense with voice"></a>
        </div>

        <section class="summary-cards" aria-label="Expense summary">
          <article class="summary-card">
            <h2>Total This Month</h2>
            <p class="amount">Rs 48,250.00</p>
          </article>
          <article class="summary-card">
            <h2>Highest Spending Month</h2>
            <p class="context">August 2026</p>
            <p class="amount">Rs 72,340.00</p>
          </article>
          <article class="summary-card">
            <h2>Top Category</h2>
            <p class="context">Food</p>
            <p class="amount">Rs 18,650.00</p>
          </article>
        </section>

        <section class="chart-row" aria-label="Expense charts">
          <article class="chart-card">
            <h2>Monthly Expenses</h2>
            <div class="bar-chart" aria-label="Static monthly expense chart">
              <div class="bar-group"><span class="bar" style="height:42%"></span><span class="bar-label">Apr 2026</span></div>
              <div class="bar-group"><span class="bar" style="height:60%"></span><span class="bar-label">May 2026</span></div>
              <div class="bar-group"><span class="bar" style="height:51%"></span><span class="bar-label">Jun 2026</span></div>
              <div class="bar-group"><span class="bar" style="height:76%"></span><span class="bar-label">Jul 2026</span></div>
              <div class="bar-group"><span class="bar" style="height:94%"></span><span class="bar-label">Aug 2026</span></div>
              <div class="bar-group"><span class="bar" style="height:66%"></span><span class="bar-label">Sep 2026</span></div>
            </div>
          </article>
          <article class="chart-card">
            <h2>Expenses by Category</h2>
            <div class="donut-layout">
              <div class="donut" aria-label="Static category doughnut chart"></div>
              <div class="legend">
                <span class="legend-item"><i class="legend-dot" style="background:#ff6384"></i>Food</span>
                <span class="legend-item"><i class="legend-dot" style="background:#36a2eb"></i>Bills</span>
                <span class="legend-item"><i class="legend-dot" style="background:#ffce56"></i>Transport</span>
                <span class="legend-item"><i class="legend-dot" style="background:#4bc0c0"></i>Shopping</span>
                <span class="legend-item"><i class="legend-dot" style="background:#9966ff"></i>Other</span>
              </div>
            </div>
          </article>
        </section>

        <section class="recent-card">
          <h2>Recent Expenses</h2>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Description</th><th>Category</th><th>Date</th><th>Amount</th></tr></thead>
              <tbody>
                <tr><td>Electricity bill</td><td>Bills</td><td>9/12/2026</td><td>Rs 6,840.00</td></tr>
                <tr><td>Weekly groceries</td><td>Food</td><td>9/10/2026</td><td>Rs 8,250.00</td></tr>
                <tr><td>Bus pass</td><td>Transport</td><td>9/8/2026</td><td>Rs 2,400.00</td></tr>
                <tr><td>Pharmacy</td><td>Health</td><td>9/5/2026</td><td>Rs 1,780.00</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <nav class="mobile-nav" aria-label="Mobile navigation">
        <a class="active" href="#"><span class="mobile-icon home-icon"></span><span>Home</span></a>
        <a href="#"><span class="mobile-icon add-icon"></span><span>Add</span></a>
        <a href="#"><span class="mobile-icon report-icon"></span><span>Report</span></a>
        <a href="#"><span class="mobile-icon account-icon"></span><span>Account</span></a>
      </nav>
    </div>
    <div id="voice-layer"></div>
    <nav class="prototype-nav" aria-label="Prototype navigation">
      <a href="index.html">All screens</a>
      <a href="01-dashboard-mic.html">1</a>
      <a href="02-recording.html">2</a>
      <a href="03-draft-preview.html">3</a>
      <a href="04-confirm-dialog.html">4</a>
      <span class="prototype-step"></span>
    </nav>
  `;

  var sheetHeader = `
    <span class="sheet-handle" aria-hidden="true"></span>
    <header class="sheet-header">
      <span class="sheet-title-icon"></span>
      <span class="sheet-heading"><h2>Voice expense</h2><p>One expense per recording</p></span>
      <a class="icon-button close-action" href="01-dashboard-mic.html" aria-label="Close"></a>
    </header>
  `;

  var recordingMarkup = `
    <div class="voice-scrim"></div>
    <section class="voice-sheet" role="dialog" aria-modal="true" aria-labelledby="voice-title">
      <div class="recording-header-slot"></div>
      <div class="sheet-body">
        <div class="language-row">
          <span class="small-label">Listening language</span>
          <span class="language-pill"><span aria-hidden="true">●</span> English (Sri Lanka)</span>
        </div>
        <div class="recording-center">
          <div class="mic-orbit"><span class="mic-core"></span></div>
          <h3 class="recording-title">Listening…</h3>
          <p class="recording-help">Say the item, amount, category, and date naturally.</p>
          <p class="recording-time">00:07 / 00:30</p>
          <div class="waveform" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
        <div class="sheet-actions">
          <a class="action-button action-secondary" href="01-dashboard-mic.html">Cancel</a>
          <a class="action-button action-primary stop-action" href="03-draft-preview.html">Stop recording</a>
        </div>
      </div>
    </section>
  `;

  var previewSheetMarkup = `
    <div class="voice-scrim"></div>
    <section class="voice-sheet" role="dialog" aria-modal="true" aria-label="Voice expense preview">
      <div class="preview-header-slot"></div>
      <div class="sheet-body">
        <div class="message-stack">
          <div class="user-message-wrap">
            <div class="message-label">You said</div>
            <div class="user-message">Lunch at the canteen, two thousand five hundred rupees, today.</div>
            <div class="message-time">Just now</div>
          </div>
          <div class="assistant-message">
            <div class="message-label">ExpenseTracker</div>
            <article class="draft-card">
              <header class="draft-card-header"><span class="receipt-icon"></span>Expense draft</header>
              <div class="draft-fields">
                <div class="draft-field"><span class="field-label">Description</span><strong class="field-value">Lunch at the canteen</strong></div>
                <div class="draft-field"><span class="field-label">Amount</span><strong class="field-value amount">Rs 2,500.00</strong></div>
                <div class="draft-field">
                  <span class="field-label">Category</span>
                  <span class="field-with-chip"><strong class="field-value">Food</strong><span class="status-chip">Inferred</span></span>
                </div>
                <div class="draft-field">
                  <span class="field-label">Date</span>
                  <span class="field-with-chip"><strong class="field-value">Sep 14, 2026</strong><span class="status-chip">Defaulted</span></span>
                </div>
              </div>
            </article>
            <div class="review-warning"><span class="alert-icon"></span><span>Please check the inferred category and default date before proceeding.</span></div>
          </div>
        </div>
        <div class="preview-actions">
          <a class="action-button action-primary proceed-action" href="04-confirm-dialog.html">Proceed</a>
          <a class="action-button action-secondary retry-action" href="02-recording.html">Retry</a>
          <a class="action-button action-danger-text" href="01-dashboard-mic.html">Discard</a>
        </div>
      </div>
    </section>
  `;

  var confirmMarkup = previewSheetMarkup + `
    <div class="confirm-scrim">
      <section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <div class="confirm-content">
          <div class="confirm-icon"></div>
          <h2 id="confirm-title">Save this expense?</h2>
          <p class="confirm-copy" id="confirm-description">This will add the reviewed expense to your account.</p>
          <div class="confirm-summary">
            <div class="confirm-row"><span>Description</span><strong>Lunch at the canteen</strong></div>
            <div class="confirm-row"><span>Amount</span><strong>Rs 2,500.00</strong></div>
            <div class="confirm-row"><span>Category</span><strong>Food</strong></div>
            <div class="confirm-row"><span>Date</span><strong>Sep 14, 2026</strong></div>
          </div>
        </div>
        <footer class="confirm-actions">
          <a class="action-button action-secondary" href="03-draft-preview.html">Back</a>
          <a class="action-button action-primary confirm-action" href="01-dashboard-mic.html?saved=1">Confirm &amp; save</a>
        </footer>
      </section>
    </div>
  `;

  var stage = document.body.getAttribute("data-stage") || "entry";
  document.body.insertAdjacentHTML("afterbegin", baseMarkup);

  document.querySelector(".voice-entry").innerHTML = icons.mic;
  document.querySelector(".theme-icon").innerHTML = icons.moon;
  document.querySelector(".home-icon").innerHTML = icons.home;
  document.querySelector(".add-icon").innerHTML = icons.add;
  document.querySelector(".report-icon").innerHTML = icons.report;
  document.querySelector(".account-icon").innerHTML = icons.account;

  var layer = document.getElementById("voice-layer");
  if (stage === "recording") {
    layer.innerHTML = recordingMarkup;
  } else if (stage === "preview") {
    layer.innerHTML = previewSheetMarkup;
  } else if (stage === "confirm") {
    layer.innerHTML = confirmMarkup;
  }

  if (stage !== "entry") {
    var headerSlot = document.querySelector(".recording-header-slot, .preview-header-slot");
    if (headerSlot) {
      headerSlot.innerHTML = sheetHeader;
    }
    document.querySelector(".sheet-title-icon").innerHTML = icons.mic;
    document.querySelector(".close-action").innerHTML = icons.close;
  }

  var micCore = document.querySelector(".mic-core");
  if (micCore) {
    micCore.innerHTML = icons.mic;
  }

  var stopAction = document.querySelector(".stop-action");
  if (stopAction) {
    stopAction.insertAdjacentHTML("afterbegin", icons.stop);
  }

  var receiptIcon = document.querySelector(".receipt-icon");
  if (receiptIcon) {
    receiptIcon.innerHTML = icons.receipt;
  }

  var alertIcon = document.querySelector(".alert-icon");
  if (alertIcon) {
    alertIcon.innerHTML = icons.alert;
  }

  var retryAction = document.querySelector(".retry-action");
  if (retryAction) {
    retryAction.insertAdjacentHTML("afterbegin", icons.retry);
  }

  var proceedAction = document.querySelector(".proceed-action");
  if (proceedAction) {
    proceedAction.insertAdjacentHTML("beforeend", icons.arrow);
  }

  var confirmIcon = document.querySelector(".confirm-icon");
  if (confirmIcon) {
    confirmIcon.innerHTML = icons.receipt;
  }

  var confirmAction = document.querySelector(".confirm-action");
  if (confirmAction) {
    confirmAction.insertAdjacentHTML("afterbegin", icons.check);
  }

  var stageNames = {
    entry: "Screen 1 · Mic entry",
    recording: "Screen 2 · Listening",
    preview: "Screen 3 · Draft",
    confirm: "Screen 4 · Confirm"
  };
  document.querySelector(".prototype-step").textContent = stageNames[stage];

  var themeButton = document.querySelector(".theme-toggle");
  themeButton.addEventListener("click", function () {
    var root = document.documentElement;
    root.setAttribute("data-theme", root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  var params = new URLSearchParams(window.location.search);
  if (params.get("saved") === "1") {
    var toast = document.createElement("div");
    toast.className = "saved-toast";
    toast.innerHTML = icons.check + "<span>Expense saved successfully</span>";
    document.body.appendChild(toast);
  }
}());
