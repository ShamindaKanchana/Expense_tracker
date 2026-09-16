(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var requestedLanguage = params.get("lang");
  var language = ["en", "si", "ta"].indexOf(requestedLanguage) >= 0 ? requestedLanguage : "en";

  var translations = {
    en: {
      dashboard: "Dashboard",
      addExpense: "Add Expense",
      monthlyReport: "Monthly Report",
      account: "Account",
      logout: "Logout",
      theme: "Theme",
      totalMonth: "Total This Month",
      highestMonth: "Highest Spending Month",
      topCategory: "Top Category",
      monthlyExpenses: "Monthly Expenses",
      byCategory: "Expenses by Category",
      recentExpenses: "Recent Expenses",
      description: "Description",
      category: "Category",
      date: "Date",
      amount: "Amount",
      food: "Food",
      voiceExpense: "Voice expense",
      oneExpense: "One expense per recording",
      addWithVoice: "Add expense with voice",
      listeningLanguage: "Listening language",
      languageName: "English (Sri Lanka)",
      listening: "Listening…",
      speakHelp: "Say the item, amount, category, and date naturally.",
      cancel: "Cancel",
      stop: "Stop recording",
      youSaid: "You said",
      justNow: "Just now",
      transcript: "Lunch at the canteen, two thousand five hundred rupees, today.",
      draft: "Expense draft",
      descriptionValue: "Lunch at the canteen",
      inferred: "Inferred",
      defaulted: "Defaulted",
      displayDate: "Sep 14, 2026",
      warning: "Please check the inferred category and default date before proceeding.",
      proceed: "Proceed",
      retry: "Retry",
      discard: "Discard",
      confirmTitle: "Save this expense?",
      confirmCopy: "This will add the reviewed expense to your account.",
      back: "Back",
      confirmSave: "Confirm & save",
      saved: "Expense saved successfully"
    },
    si: {
      dashboard: "උපකරණ පුවරුව",
      addExpense: "වියදම එක් කරන්න",
      monthlyReport: "මාසික වාර්තාව",
      account: "ගිණුම",
      logout: "ඉවත් වන්න",
      theme: "තේමාව",
      totalMonth: "මෙම මාසයේ මුළු වියදම",
      highestMonth: "වැඩිම වියදම් කළ මාසය",
      topCategory: "ප්‍රධාන කාණ්ඩය",
      monthlyExpenses: "මාසික වියදම්",
      byCategory: "කාණ්ඩ අනුව වියදම්",
      recentExpenses: "මෑත වියදම්",
      description: "විස්තරය",
      category: "කාණ්ඩය",
      date: "දිනය",
      amount: "මුදල",
      food: "ආහාර",
      voiceExpense: "හඬින් වියදමක්",
      oneExpense: "එක් පටිගත කිරීමකට එක් වියදමක්",
      addWithVoice: "හඬින් වියදමක් එක් කරන්න",
      listeningLanguage: "සවන් දෙන භාෂාව",
      languageName: "සිංහල (ශ්‍රී ලංකාව)",
      listening: "සවන් දෙමින්…",
      speakHelp: "භාණ්ඩය, මුදල, කාණ්ඩය සහ දිනය ස්වභාවිකව කියන්න.",
      cancel: "අවලංගු කරන්න",
      stop: "පටිගත කිරීම නවත්වන්න",
      youSaid: "ඔබ පැවසුවේ",
      justNow: "දැන්",
      transcript: "අද ආපනශාලාවේ දිවා ආහාරයට රුපියල් දෙදහස් පන්සියයි.",
      draft: "වියදම් කෙටුම්පත",
      descriptionValue: "ආපනශාලාවේ දිවා ආහාරය",
      inferred: "අනුමාන කළ",
      defaulted: "පෙරනිමි",
      displayDate: "2026 සැප්තැම්බර් 14",
      warning: "ඉදිරියට යාමට පෙර අනුමාන කළ කාණ්ඩය සහ පෙරනිමි දිනය පරීක්ෂා කරන්න.",
      proceed: "ඉදිරියට",
      retry: "නැවත උත්සාහ කරන්න",
      discard: "ඉවත දමන්න",
      confirmTitle: "මෙම වියදම සුරකින්නද?",
      confirmCopy: "මෙය සමාලෝචිත වියදම ඔබගේ ගිණුමට එක් කරයි.",
      back: "ආපසු",
      confirmSave: "තහවුරු කර සුරකින්න",
      saved: "වියදම සාර්ථකව සුරකින ලදී"
    },
    ta: {
      dashboard: "முகப்புப் பலகை",
      addExpense: "செலவைச் சேர்",
      monthlyReport: "மாதாந்திர அறிக்கை",
      account: "கணக்கு",
      logout: "வெளியேறு",
      theme: "தோற்றம்",
      totalMonth: "இந்த மாத மொத்தம்",
      highestMonth: "அதிக செலவு செய்த மாதம்",
      topCategory: "முதன்மை வகை",
      monthlyExpenses: "மாதாந்திர செலவுகள்",
      byCategory: "வகைப்படி செலவுகள்",
      recentExpenses: "சமீபத்திய செலவுகள்",
      description: "விவரம்",
      category: "வகை",
      date: "தேதி",
      amount: "தொகை",
      food: "உணவு",
      voiceExpense: "குரல் செலவு",
      oneExpense: "ஒரு பதிவுக்கு ஒரு செலவு",
      addWithVoice: "குரல் மூலம் செலவைச் சேர்",
      listeningLanguage: "கேட்கும் மொழி",
      languageName: "தமிழ் (இலங்கை)",
      listening: "கேட்கிறது…",
      speakHelp: "பொருள், தொகை, வகை மற்றும் தேதியை இயல்பாகச் சொல்லுங்கள்.",
      cancel: "ரத்துசெய்",
      stop: "பதிவை நிறுத்து",
      youSaid: "நீங்கள் சொன்னது",
      justNow: "இப்போது",
      transcript: "இன்று உணவகத்தில் மதிய உணவுக்கு இரண்டாயிரத்து ஐந்நூறு ரூபாய்.",
      draft: "செலவு வரைவு",
      descriptionValue: "உணவக மதிய உணவு",
      inferred: "ஊகிக்கப்பட்டது",
      defaulted: "இயல்புநிலை",
      displayDate: "14 செப்டம்பர் 2026",
      warning: "தொடர்வதற்கு முன் ஊகிக்கப்பட்ட வகையையும் இயல்புநிலை தேதியையும் சரிபார்க்கவும்.",
      proceed: "தொடர்க",
      retry: "மீண்டும் முயல்க",
      discard: "நிராகரி",
      confirmTitle: "இந்தச் செலவைச் சேமிக்கவா?",
      confirmCopy: "மதிப்பாய்வு செய்த செலவு உங்கள் கணக்கில் சேர்க்கப்படும்.",
      back: "பின்செல்",
      confirmSave: "உறுதிசெய்து சேமி",
      saved: "செலவு வெற்றிகரமாகச் சேமிக்கப்பட்டது"
    }
  };

  var copy = translations[language];
  document.documentElement.lang = language;

  function setText(selector, value, root) {
    var element = (root || document).querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  }

  function setTexts(selector, values) {
    document.querySelectorAll(selector).forEach(function (element, index) {
      if (values[index] !== undefined) {
        element.textContent = values[index];
      }
    });
  }

  function setAction(selector, value) {
    var element = document.querySelector(selector);
    if (!element) {
      return;
    }

    var icon = element.querySelector("svg");
    var iconWasFirst = icon && (
      element.firstElementChild === icon ||
      element.classList.contains("draft-card-header")
    );
    element.textContent = value;

    if (icon) {
      if (iconWasFirst) {
        element.insertBefore(icon, element.firstChild);
      } else {
        element.appendChild(icon);
      }
    }
  }

  setTexts(".desktop-nav .nav-link", [copy.dashboard, copy.addExpense, copy.monthlyReport]);
  setText(".account-label", copy.account);
  setText(".logout-button", copy.logout);
  setText(".theme-label", copy.theme);
  setText(".dashboard-heading h1", copy.dashboard);
  setTexts(".summary-card h2", [copy.totalMonth, copy.highestMonth, copy.topCategory]);
  setText(".summary-card:nth-child(3) .context", copy.food);
  setTexts(".chart-card h2", [copy.monthlyExpenses, copy.byCategory]);
  setText(".recent-card h2", copy.recentExpenses);
  setTexts(".recent-card th", [copy.description, copy.category, copy.date, copy.amount]);
  setTexts(".mobile-nav a > span:last-child", [copy.dashboard, copy.addExpense, copy.monthlyReport, copy.account]);

  var voiceEntry = document.querySelector(".voice-entry");
  voiceEntry.setAttribute("aria-label", copy.addWithVoice);
  voiceEntry.setAttribute("data-tooltip", copy.addWithVoice);

  setText(".sheet-heading h2", copy.voiceExpense);
  setText(".sheet-heading p", copy.oneExpense);
  setText(".small-label", copy.listeningLanguage);
  setText(".language-pill", copy.languageName);
  setText(".recording-title", copy.listening);
  setText(".recording-help", copy.speakHelp);
  setAction(".sheet-actions .action-secondary", copy.cancel);
  setAction(".stop-action", copy.stop);

  setText(".user-message-wrap .message-label", copy.youSaid);
  setText(".user-message", copy.transcript);
  setText(".message-time", copy.justNow);
  setAction(".draft-card-header", copy.draft);
  setTexts(".draft-field .field-label", [copy.description, copy.amount, copy.category, copy.date]);
  setText(".draft-field:nth-child(1) .field-value", copy.descriptionValue);
  setText(".draft-field:nth-child(3) .field-value", copy.food);
  setText(".draft-field:nth-child(3) .status-chip", copy.inferred);
  setText(".draft-field:nth-child(4) .field-value", copy.displayDate);
  setText(".draft-field:nth-child(4) .status-chip", copy.defaulted);
  setText(".review-warning > span:last-child", copy.warning);
  setAction(".proceed-action", copy.proceed);
  setAction(".retry-action", copy.retry);
  setAction(".action-danger-text", copy.discard);

  setText("#confirm-title", copy.confirmTitle);
  setText(".confirm-copy", copy.confirmCopy);
  setTexts(".confirm-row > span", [copy.description, copy.amount, copy.category, copy.date]);
  setText(".confirm-row:nth-child(1) strong", copy.descriptionValue);
  setText(".confirm-row:nth-child(3) strong", copy.food);
  setText(".confirm-row:nth-child(4) strong", copy.displayDate);
  setAction(".confirm-actions .action-secondary", copy.back);
  setAction(".confirm-action", copy.confirmSave);

  var languageButtons = document.querySelectorAll(".lang");
  var languageCodes = ["en", "si", "ta"];
  languageButtons.forEach(function (button, index) {
    var code = languageCodes[index];
    button.classList.toggle("active", code === language);
    button.setAttribute("aria-pressed", code === language ? "true" : "false");
    button.addEventListener("click", function () {
      params.set("lang", code);
      window.location.search = params.toString();
    });
  });

  document.querySelectorAll('a[href*=".html"]').forEach(function (link) {
    var href = link.getAttribute("href");
    if (!href || href.indexOf("lang=") >= 0) {
      return;
    }
    link.setAttribute("href", href + (href.indexOf("?") >= 0 ? "&" : "?") + "lang=" + language);
  });

  var savedToast = document.querySelector(".saved-toast span");
  if (savedToast) {
    savedToast.textContent = copy.saved;
  }
}());
