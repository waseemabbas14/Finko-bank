// utils.js
// utils.js - UPDATED: Added Repayment Scenarios utility functions
// - NEW: Enforce 2dp on any LVR % displayed in the Details panel
// - NEW: Dynamic summary for "Access Equity from My Home" based on selected purpose

function num(val) {
  const n = parseFloat(String(val).toString().replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmt(n, d = 2) {
  const v = Number(n);
  if (isNaN(v)) return (0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  return Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

// NEW: lightweight percent formatter (always 2dp)
function fmtPct2(n) {
  const v = Number(n);
  if (isNaN(v)) return '';
  return Math.abs(v).toFixed(2);
}

// NEW: Calculate extra repayment scenarios
function calculateExtraRepaymentScenario(loanAmount, annualRate, loanTerm, extraRepayment) {
  const monthlyRate = annualRate / 12;
  const totalMonths = loanTerm * 12;
  
  // Calculate standard monthly repayment
  const standardMonthlyRepayment = calcMonthlyRepayment(loanAmount, annualRate, loanTerm);
  const totalMonthlyRepayment = standardMonthlyRepayment + extraRepayment;
  
  let balance = loanAmount;
  let totalInterestWithoutExtra = 0;
  let totalInterestWithExtra = 0;
  let monthsWithExtra = 0;
  
  // Calculate without extra repayments
  balance = loanAmount;
  for (let month = 1; month <= totalMonths; month++) {
    const interest = balance * monthlyRate;
    totalInterestWithoutExtra += interest;
    const principal = standardMonthlyRepayment - interest;
    balance -= principal;
    
    if (balance <= 0) break;
  }
  
  // Calculate with extra repayments
  balance = loanAmount;
  for (let month = 1; month <= totalMonths; month++) {
    const interest = balance * monthlyRate;
    totalInterestWithExtra += interest;
    const principal = totalMonthlyRepayment - interest;
    balance -= principal;
    
    if (balance <= 0) {
      monthsWithExtra = month;
      break;
    }
  }
  
  const termWithExtra = Math.ceil(monthsWithExtra / 12);
  const interestSaved = totalInterestWithoutExtra - totalInterestWithExtra;
  const timeSaved = loanTerm - termWithExtra;
  
  return {
    withoutExtra: {
      totalInterest: Math.round(totalInterestWithoutExtra),
      termYears: loanTerm
    },
    withExtra: {
      totalInterest: Math.round(totalInterestWithExtra),
      termYears: termWithExtra
    },
    interestSaved: Math.round(interestSaved),
    timeSaved: timeSaved,
    monthlyRepayment: Math.round(standardMonthlyRepayment)
  };
}

// NEW: Enhanced Extra Repayment Scenario Calculation with Frequency
function calculateExtraRepaymentScenarioWithFrequency(loanAmount, annualRate, loanTerm, extraRepayment, frequency = 'monthly') {
  const monthlyRate = annualRate / 12;
  const totalMonths = loanTerm * 12;
  
  // Calculate standard monthly repayment
  const standardMonthlyRepayment = calcMonthlyRepayment(loanAmount, annualRate, loanTerm);
  
  // Convert extra repayment to monthly equivalent based on frequency
  let monthlyExtraRepayment;
  switch (frequency) {
    case 'weekly':
      monthlyExtraRepayment = extraRepayment * 52 / 12;
      break;
    case 'fortnightly':
      monthlyExtraRepayment = extraRepayment * 26 / 12;
      break;
    case 'monthly':
    default:
      monthlyExtraRepayment = extraRepayment;
      break;
  }
  
  const totalMonthlyRepayment = standardMonthlyRepayment + monthlyExtraRepayment;
  
  let balance = loanAmount;
  let totalInterestWithoutExtra = 0;
  let totalInterestWithExtra = 0;
  let monthsWithExtra = 0;
  
  // Calculate without extra repayments
  balance = loanAmount;
  for (let month = 1; month <= totalMonths; month++) {
    const interest = balance * monthlyRate;
    totalInterestWithoutExtra += interest;
    const principal = standardMonthlyRepayment - interest;
    balance -= principal;
    
    if (balance <= 0) break;
  }
  
  // Calculate with extra repayments
  balance = loanAmount;
  for (let month = 1; month <= totalMonths; month++) {
    const interest = balance * monthlyRate;
    totalInterestWithExtra += interest;
    const principal = totalMonthlyRepayment - interest;
    balance -= principal;
    
    if (balance <= 0) {
      monthsWithExtra = month;
      break;
    }
  }
  
  const termWithExtra = Math.ceil(monthsWithExtra / 12);
  const interestSaved = totalInterestWithoutExtra - totalInterestWithExtra;
  const timeSaved = loanTerm - termWithExtra;
  
  return {
    withoutExtra: {
      totalInterest: Math.round(totalInterestWithoutExtra),
      termYears: loanTerm
    },
    withExtra: {
      totalInterest: Math.round(totalInterestWithExtra),
      termYears: termWithExtra
    },
    interestSaved: Math.round(interestSaved),
    timeSaved: timeSaved,
    monthlyRepayment: Math.round(standardMonthlyRepayment),
    extraRepaymentFrequency: frequency,
    extraRepaymentAmount: extraRepayment,
    monthlyExtraRepayment: Math.round(monthlyExtraRepayment)
  };
}

// Keep existing utility functions
function calcMonthlyRepayment(P, annualRate, years) {
  const r = annualRate / 12;
  const n = years * 12;
  if (annualRate === 0) return P / n;
  return P * r / (1 - Math.pow(1 + r, -n));
}

/* =========================
   DOM Enhancements (NEW)
   ========================= */

// Enforce 2dp for any "%” on lines that mention LVR inside the Details panel.
// This fixes cases like "Base LVR: 66.6666666666%" -> "66.67%"
(function attachLVR2dpEnforcer() {
  function enforceInDetails() {
    const root = document.getElementById('details');
    if (!root) return;

    // Only transform elements that mention "LVR" in their text
    const nodes = root.querySelectorAll('.dash-col-content *');
    nodes.forEach(el => {
      if (!el || !el.innerHTML) return;
      const txt = el.textContent || '';
      if (!txt.includes('LVR') || !txt.includes('%')) return;
      // Replace any number before % with 2dp
      const newHTML = el.innerHTML.replace(/(\d+(?:\.\d+)?)(?=%)/g, (m, num) => {
        const v = parseFloat(num);
        if (isNaN(v)) return m;
        return v.toFixed(2);
      });
      if (newHTML !== el.innerHTML) {
        el.innerHTML = newHTML;
      }
    });
  }

  function observeDetails() {
    const root = document.getElementById('details');
    if (!root) return;
    const mo = new MutationObserver(() => enforceInDetails());
    mo.observe(root, { childList: true, subtree: true });
    // Initial pass
    enforceInDetails();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeDetails);
  } else {
    observeDetails();
  }
})();

// Dynamic summary message for Access Equity ("home_equity") based on selected purpose
(function attachDynamicEquitySummary() {
  function getPurposeLabel(val) {
    switch (val) {
      case 'home_renovation': return 'Home Renovation';
      case 'investment': return 'Investment';
      case 'debt_consolidation': return 'Debt Consolidation';
      case 'other': return 'Other Purpose';
      default: return 'your selected purpose';
    }
  }

  function renderDynamicSummaryIfEquity() {
    const lpSel = document.getElementById('loanPurpose');
    const summaryEl = document.getElementById('summary');
    if (!lpSel || !summaryEl) return;
    const lp = lpSel.value;
    if (lp !== 'home_equity' && lp !== 'home_equity_release') return;

    const purposeSel = document.getElementById('equityPrimaryPurpose');
    const label = getPurposeLabel(purposeSel ? purposeSel.value : '');

    const message = `You’re planning to access the equity in your property for ${label}. This calculator shows an estimate of how this might affect your LVR and any LMI that could apply.

Please note: The results are estimates only and do not constitute an approval. If you proceed with a full application, the lender will usually order a valuation, and the assessed property value may differ from the amount you have entered here.`;

    summaryEl.innerHTML = `<h2 class="col-title">SUMMARY</h2><p class="muted" style="white-space:pre-line">${message}</p>`;
  }

  function onFormSubmitAfter() {
    // Run after the main handler has updated the UI
    setTimeout(renderDynamicSummaryIfEquity, 0);
  }

  function onPurposeChangeMaybeUpdate(e) {
    if (e && e.target && e.target.id === 'equityPrimaryPurpose') {
      // If results already shown, update summary live
      onFormSubmitAfter();
    }
  }

  function boot() {
    const form = document.getElementById('loanForm');
    const dyn = document.getElementById('dynamicFields');
    if (form) form.addEventListener('submit', onFormSubmitAfter);
    if (dyn) dyn.addEventListener('change', onPurposeChangeMaybeUpdate, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
