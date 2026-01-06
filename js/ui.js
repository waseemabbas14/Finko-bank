// ui.js
/*
// ui.js - COMPLETE UPDATED (Implements review changes from 3 documents)
// - Home Upgrade: dynamic LVR/Loan Amount linking with 2dp precision
// - Access Equity: rename to "Access Equity From My Home" + add "Primary Purpose for Equity Access" field + add "Rate Type", remove LVR input, reorder fields
// - Debt Consolidation: expandable multi-debt list (add/remove rows with type, balance, rate, monthly payment)
// - Minor: LVR % inputs support 2 decimals; number formatting preserved
// - Hooks keep working with eventListeners.js auto-recalc
*/

(function setupGlobalAutoRecalc() {
  window.resetAutoRecalcGate = function () {
    window.hasCalculated = false;
    try { if (window.__recalcTimer) clearTimeout(window.__recalcTimer); } catch (e) { }
    window.__autoRecalcBlockedUntil = Date.now() + 600;
  };

  window.hasCalculated = false;
  window.isAutoRecalc = false;

  function scheduleRecalc() {
    if (!window.hasCalculated) return;

    if (window.__autoRecalcBlockedUntil && Date.now() < window.__autoRecalcBlockedUntil) return;
    try { if (window.__recalcTimer) clearTimeout(window.__recalcTimer); } catch (e) { }

    window.__recalcTimer = setTimeout(() => {
      const loanPurpose = document.getElementById('loanPurpose')?.value;
      const form = document.getElementById('loanForm');
      if (!loanPurpose || !form) return;

      window.isAutoRecalc = true;

      try {
        const evt = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(evt);
      } catch (e) {
        try { form.submit(); } catch (e2) { }
      }

      window.isAutoRecalc = false;
    }, 400);
  }

  function attachAutoRecalcDelegation() {
    const df = document.getElementById('dynamicFields');
    if (!df || df.__autoRecalcAttached) return;
    df.addEventListener('input', scheduleRecalc, true);
    df.addEventListener('change', scheduleRecalc, true);
    df.__autoRecalcAttached = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachAutoRecalcDelegation);
  } else {
    attachAutoRecalcDelegation();
  }

  const mo = new MutationObserver(() => {
    attachAutoRecalcDelegation();
  });
  try {
    mo.observe(document.body, { childList: true, subtree: true });
  } catch (e) { }
})();

function updateStepTitle(loanCategory, calculatorType, loanPurpose) {
  const stepTitle = document.querySelector('.step-title');
  if (!stepTitle) return;

  if (loanCategory) {
    stepTitle.innerHTML = '<h4 style="background: rgba(255, 255, 255, 0.1);border-radius:10px; padding: 8px 0px;">Select your purpose for ' + getLoanTypeDisplayName(loanCategory) + '</h4>';
  } else {
    stepTitle.innerHTML = `
      <h3>HELLO</h3>
      <br>
      <h4 style="background: rgba(255, 255, 255, 0.1);border-radius:10px; padding: 8px 0px;">What brings you here today?</h4>
    `;
  }
}

function getLoanTypeDisplayName(loanCategory) {
  switch (loanCategory) {
    case 'home': return 'Home Loan';
    case 'commercial': return 'Commercial Loan';
    case 'smsf': return 'SMSF Loan';
    default: return 'Loan';
  }
}

function updateContainerForLoanType(loanCategory, calculatorType, loanPurpose) {
  const summaryEl = document.getElementById('summary');
  const detailsEl = document.getElementById('details');

  if (!summaryEl || !detailsEl) return;

  if (loanCategory) {
    summaryEl.innerHTML = '';
  }

  if (loanCategory === 'home') {
    if (!loanPurpose) {
      detailsEl.innerHTML = `
        <div class="dash-col-header">STEP 2: Select your purpose</div>
        <div class="dash-col-content">
          <div class="muted">Welcome to the Home Loan section. Please select your purpose for further calculations.</div>
        </div>
      `;
    } else {
      detailsEl.innerHTML = `
        <div class="dash-col-header">STEP 3: Enter your details</div>
        <div class="dash-col-content">
          <div class="muted">Fill out the inputs on the left and click Calculate to see your results. Adjust inputs and recalculate anytime.</div>
        </div>
      `;
    }
  }

  else if (loanCategory === 'commercial') {
    if (!calculatorType) {
      detailsEl.innerHTML = `
        <div class="dash-col-header">STEP 2: Select your Calculator</div>
        <div class="dash-col-content">
          <div class="muted">Welcome to the Commercial Loan calculator. Please select a calculator type for further steps.</div>
        </div>
      `;
    } else if (calculatorType === 'simple') {
      detailsEl.innerHTML = `
        <div class="dash-col-header">STEP 2: SELECT PURPOSE</div>
        <div class="dash-col-content">
          <div class="muted">Estimate your monthly loan payments and total cost.</div>
        </div>
      `;
    } else if (calculatorType === 'financial') {
      detailsEl.innerHTML = `
        <div class="dash-col-header">STEP 2: SELECT PURPOSE</div>
        <div class="dash-col-content">
          <div class="muted">Choose from advanced financial analysis tools for commercial lending.</div>
        </div>
      `;
    }
  }

  else if (loanCategory === 'smsf') {
    if (!calculatorType) {
      detailsEl.innerHTML = `
        <div class="dash-col-header">STEP 2: Select your Calculator</div>
        <div class="dash-col-content">
          <div class="muted">Welcome to the SMSF Loan calculator. Please select a calculator type for further steps.</div>
        </div>
      `;
    } else if (calculatorType === 'simple') {
      detailsEl.innerHTML = `
        <div class="dash-col-header">STEP 2: SELECT PURPOSE</div>
        <div class="dash-col-content">
          <div class="muted">Estimate your monthly loan payments and total cost.</div>
        </div>
      `;
    } else if (calculatorType === 'financial') {
      detailsEl.innerHTML = `
        <div class="dash-col-header">STEP 2: SELECT PURPOSE</div>
        <div class="dash-col-content">
          <div class="muted">Choose from advanced SMSF financial analysis tools.</div>
        </div>
      `;
    }
  }
}

function updateFlowDetails(loanCategory, calculatorType, loanPurpose) {
  const detailsEl = document.getElementById('details');
  if (!detailsEl) return;

  let title = '';
  let bodyHtml = '';

  if (loanCategory === 'home') {
    if (!loanPurpose) {
      title = 'STEP 3: SELECT YOUR PURPOSE';
      bodyHtml = '<div class="muted">Welcome to the Home Loan section. Please select your purpose for further calculations.</div>';
    } else {

      title = 'STEP 3: ENTER YOUR DETAILS';
      bodyHtml = '<div class="muted">Fill out the inputs on the left and click Calculate to see your results. Adjust inputs and recalculate anytime.</div>';

    }
  } else if (loanCategory === 'commercial' || loanCategory === 'smsf') {
    if (calculatorType === 'simple') {
      title = 'STEP 2: SELECT PURPOSE';
      bodyHtml = '<div class="muted">Estimate your monthly loan payments and total cost.</div>';
    } else if (calculatorType === 'financial') {
      title = 'STEP 2: SELECT A DECISION ANALYSIS CALCULATOR';
      bodyHtml = '<div class="muted">Choose from advanced financial analysis tools for commercial lending or SMSF strategies.</div>';
    }
  }

  if (title) {
    detailsEl.innerHTML = `
      <div class="dash-col-header">${title}</div>
      <div class="dash-col-content">${bodyHtml}</div>
    `;
  } else {
    detailsEl.innerHTML = '';
  }
}

function updateWelcomeSection(loanCategory, calculatorType, loanPurpose) {
  const summaryEl = document.getElementById('summary');
  const welcomeStatic = document.getElementById('welcome-message-static');

  if (loanCategory || loanPurpose) {
    if (welcomeStatic) {
      welcomeStatic.style.display = 'none';
    }
    if (summaryEl && summaryEl.querySelector('.welcome-message-static')) {
      summaryEl.innerHTML = '';
    }
  } else {
    if (welcomeStatic) {
      welcomeStatic.style.display = 'block';
    }
    showStaticWelcomeMessage();
  }
}

function resetLoanPurpose() {
  const loanPurposeSelect = document.getElementById('loanPurpose');
  if (loanPurposeSelect) {
    loanPurposeSelect.innerHTML = '<option value="">Loan Purpose</option>';
  }

  document.getElementById('dynamicFields').innerHTML = '';
  document.getElementById('results').innerHTML = '';
  document.getElementById('details').innerHTML = '';
  document.getElementById('disclaimer').innerText = '';

  if (window.resetAutoRecalcGate) window.resetAutoRecalcGate();

  toggleRepaymentScenariosSection(false);

  if (window.unmountCommercialFinancialMode) window.unmountCommercialFinancialMode();
  if (window.unmountSMSFFinancialMode) window.unmountSMSFFinancialMode();

  const commercialCalculatorType = document.getElementById('commercialCalculatorType');
  const smsfCalculatorType = document.getElementById('smsfCalculatorType');
  if (commercialCalculatorType) commercialCalculatorType.value = '';
  if (smsfCalculatorType) smsfCalculatorType.value = '';

  showStaticWelcomeMessage();

  const loanCategory = document.getElementById('loanCategory').value;
  updateStepTitle(loanCategory, '', '');
  updateFlowDetails(loanCategory, '', '');
  updateWelcomeSection(loanCategory, '', '');
}

function getCTALabel(loanType) {
  switch (loanType) {
    // Home loans retain tailored CTAs
    case "home_borrowing": return "Get Your Accurate Borrowing Power";
    case "home_repayment": return "Get Your Personalised Quote";
    case "home_refinance": return "Lock In My Savings";
    case "home_upgrade": return "Fund My Home Upgrade";
    case "home_equity": return "Access My Equity";
    case "home_consolidate": return "Consolidate My Debts";

    // NEW: Extras Home calculators
    case "home_bridging": return "Discuss My Bridging Strategy";
    case "home_next_home": return "Plan My Next Home Move";
    case "home_investment": return "Get My Investment Options";
    case "home_equity_release": return "Access My Equity";
    case "home_construction": return "Plan My Build & Finance";

    // Commercial and business standardized
    case "commercial_repayment":
    case "commercial_borrowing":
    case "secured_business":
    case "unsecured_business":
    case "overdraft":
    case "equipment_asset":
    case "invoice_finance":
      return "Submit a Call Back Request";

    // SMSF standardized
    case "smsf_residential":
    case "smsf_commercial":
    case "smsf_refinance":
      return "Submit a Call Back Request";

    default:
      return "Submit a Call Back Request";
  }
}

function formatNumberInput(input) {
  if (!input) return;
  input.addEventListener('blur', function () {
    const value = num(this.value);
    if (!isNaN(value) && value >= 0) {
      this.value = fmt(value, 0);
    }
  });
  input.addEventListener('focus', function () {
    this.value = this.value.replace(/,/g, '');
  });
  input.addEventListener('input', function () {
    const rawValue = this.value.replace(/,/g, '');
    const cursorPosition = this.selectionStart;
    if (rawValue === '' || rawValue === '0') return;
    const value = num(rawValue);
    if (!isNaN(value) && value >= 0) {
      const formatted = fmt(value, 0);
      this.value = formatted;
      const newCursorPosition = Math.max(1, cursorPosition + (formatted.length - rawValue.length));
      try { this.setSelectionRange(newCursorPosition, newCursorPosition); } catch (e) { }
    }
  });
}

function toggleRepaymentScenariosSection(show) {
  const repaymentSection = document.getElementById('repaymentScenariosSection');
  if (!repaymentSection) return;
  if (show) {
    repaymentSection.style.display = 'block';
    const calculator = document.getElementById('repaymentScenariosCalculator');
    const button = document.querySelector('.repayment-scenarios-btn');
    if (calculator && calculator.classList.contains('open')) calculator.classList.remove('open');
    if (button && button.classList.contains('open')) button.classList.remove('open');
  } else {
    repaymentSection.style.display = 'none';
  }
}

function showAnimatedWelcomeMessage() {
  const summaryEl = document.getElementById('summary');
  if (!summaryEl) return;
  summaryEl.innerHTML = `
    <div class="welcome-message-initial" id="welcome-message-static">
      <h2 class="col-title">WELCOME</h2>
      <p class="muted" style="white-space:pre-line">to Finco Capital. Please select your loan type and purpose to get started.</p>
    </div>
  `;
}

function showStaticWelcomeMessage() {
  const summaryEl = document.getElementById('summary');
  if (!summaryEl) return;
  summaryEl.innerHTML = `
    <div class="welcome-message-static" id="welcome-message-static">
      <h2 class="col-title">WELCOME</h2>
      <p class="muted" style="white-space:pre-line">to Finco Capital. Please select your loan type and purpose to get started.</p>
    </div>
  `;
}

function setFlowDetails(title, bodyHtml) {
  const el = document.getElementById('details');
  if (!el) return;
  const safeTitle = title ? `<div class="dash-col-header">${title}</div>` : '';
  const safeBody = bodyHtml ? `<div class="dash-col-content">${bodyHtml}</div>` : '';
  el.innerHTML = safeTitle + safeBody;
}

function updateCalculateButton() {
  const calculateBtn = document.querySelector('button[type="submit"]');
  const loanPurpose = document.getElementById('loanPurpose')?.value;
  if (calculateBtn) {
    if (loanPurpose) {
      calculateBtn.innerHTML = '<img src="assests/t-removebg-preview.png" alt="" style="width:16px; height:16px; vertical-align:middle;"> Calculate';
      calculateBtn.style.display = 'flex';
      calculateBtn.style.alignItems = 'center';
      calculateBtn.style.gap = '8px';
    } else {
      calculateBtn.innerHTML = 'Calculator';
    }
  }
}

// ui.js
function setupStatePillClickHandler() {
  // Guard against double-binding (this function is called from 2 files)
  if (setupStatePillClickHandler.__bound) return;
  setupStatePillClickHandler.__bound = true;

  const statePill = document.getElementById('statePill');
  const stateName = document.getElementById('stateName');
  const stateSelectContainer = document.getElementById('stateSelectContainer');
  const stateSelect = document.getElementById('stateSelect');

  if (!statePill || !stateName || !stateSelectContainer || !stateSelect) return;

  // When a state is chosen, swap back to the label/pill view
  stateSelect.addEventListener('change', function () {
    if (stateSelect.value) {
      stateName.textContent = stateSelect.options[stateSelect.selectedIndex].text;
      stateName.style.display = 'block';
      stateSelectContainer.style.display = 'none';
    }
  });

  // Clicking the pill immediately re-opens the native picker (no second click needed)
  stateName.addEventListener('click', function (e) {
    e.stopPropagation();

    // Keep the main container visible when user re-opens the state picker.
    // Previously we hid `#sunny` here which caused the calculator to disappear — do not hide it.

    // Show select again
    stateName.style.display = 'none';
    stateSelectContainer.style.display = 'block';

    // Keep styles simple/consistent
    stateSelectContainer.style.position = '';
    stateSelectContainer.style.marginTop = '0px';
    stateSelect.style.border = 'none';
    stateSelect.style.fontWeight = '700';
    stateSelect.style.color = '#ffffff';
    stateSelect.style.padding = '8px 5px';
    stateSelect.style.cursor = 'pointer';
    stateSelect.style.transition = 'all 0.2s';
    stateSelect.style.textTransform = 'uppercase';
    stateSelect.style.fontSize = '15px';
    stateSelect.style.background = 'rgba(255,255,255,0.1)';

    requestAnimationFrame(() => {
      try {
        stateSelect.focus({ preventScroll: true });
        if (typeof stateSelect.showPicker === 'function') {
          stateSelect.showPicker();
        } else {
          stateSelect.click();
        }
      } catch (err) {
        stateSelect.focus();
      }
    });
    // Do not reset the calculator when the user clicks to change state.
    // Previously this block cleared loanCategory/loanPurpose and hid results which caused the
    // calculator to disappear when users re-opened the state picker to change their selection.
    // Keep existing selections and results intact so users can change state as often as they like.
    // (No-op here intentionally.)
  });

  stateSelect.addEventListener('blur', () => {
    try { stateSelect.size = 0; } catch (e) {}
  });
}

function toggleCommercialCalculatorType(show) {
  const row = document.getElementById('commercialCalculatorTypeRow');
  if (row) row.style.display = show ? 'block' : 'none';
}
function resetCommercialCalculatorType() {
  const sel = document.getElementById('commercialCalculatorType');
  if (sel) sel.value = '';
  toggleCommercialCalculatorType(false);
}
function toggleSMSFCalculatorType(show) {
  const row = document.getElementById('smsfCalculatorTypeRow');
  if (row) row.style.display = show ? 'block' : 'none';
}
function resetSMSFCalculatorType() {
  const sel = document.getElementById('smsfCalculatorType');
  if (sel) sel.value = '';
  toggleSMSFCalculatorType(false);
}

function handleCommercialCalculatorTypeChange() {
  const calculatorType = document.getElementById('commercialCalculatorType').value;
  const loanPurposeSelect = document.getElementById('loanPurpose');

  loanPurposeSelect.innerHTML = '<option value="">Loan Purpose</option>';
  document.getElementById('dynamicFields').innerHTML = '';
  document.getElementById('results').innerHTML = '';
  document.getElementById('details').innerHTML = '';
  document.getElementById('disclaimer').innerText = '';
  if (window.resetAutoRecalcGate) window.resetAutoRecalcGate();

  const loanCategory = document.getElementById('loanCategory').value;

  updateStepTitle(loanCategory, calculatorType, '');
  updateFlowDetails(loanCategory, calculatorType, '');
  updateWelcomeSection(loanCategory, calculatorType, '');

  if (calculatorType === 'simple') {
    const commercialOptions = [
      { value: 'commercial_repayment', text: 'See my commercial property repayments' },
      { value: 'commercial_borrowing', text: 'Find out my business borrowing power' },
      { value: 'equipment_asset', text: 'Finance new equipment or vehicles' },
      { value: 'secured_business', text: 'Get a secured loan for my business' },
      { value: 'unsecured_business', text: 'Explore an unsecured business loan' },
      { value: 'overdraft', text: 'Manage cash flow with an overdraft' },
      { value: 'invoice_finance', text: 'Unlock cash from unpaid invoices' }
    ];
    commercialOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.text;
      loanPurposeSelect.appendChild(opt);
    });

    if (window.unmountCommercialFinancialMode) window.unmountCommercialFinancialMode();

  } else if (calculatorType === 'financial') {
    if (window.mountCommercialFinancialMode) {
      window.mountCommercialFinancialMode();
      setTimeout(() => {
        if (loanPurposeSelect.options.length <= 1) {
          const financialOptions = [
            { value: 'lease_vs_buy', text: 'Lease vs. Buy Analysis' },
            { value: 'cashflow_affordability', text: 'Business Cash Flow & Loan Affordability' },
            { value: 'working_capital', text: 'Working Capital Loan Calculator' },
            { value: 'debt_consolidation_refi', text: 'Debt Consolidation & Refinancing Optimiser' },
            { value: 'equipment_tco', text: 'Equipment Financing & Lifecycle Cost (TCO)' },
            { value: 'commercial_property_analysis', text: 'Commercial Property Investment Analysis' }
          ];
          financialOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            loanPurposeSelect.appendChild(opt);
          });
        }
      }, 100);
    }
    const welcomeStatic = document.getElementById('welcome-message-static');
    if (welcomeStatic) welcomeStatic.style.display = 'none';
    showStaticWelcomeMessage();

  } else {
    if (window.unmountCommercialFinancialMode) window.unmountCommercialFinancialMode();
    const detailsEl = document.getElementById('details');
    detailsEl.innerHTML = `
        <div class="dash-col-header">STEP 2: Select your Calculator</div>
        <div class="dash-col-content">
          <div class="muted">Welcome to the Commercial Loan calculator. Please select a calculator type for further steps.</div>
        </div>
      `;
  }

  updateCalculateButton();
}

function handleSMSFCalculatorTypeChange() {
  const calculatorType = document.getElementById('smsfCalculatorType').value;
  const loanPurposeSelect = document.getElementById('loanPurpose');

  loanPurposeSelect.innerHTML = '<option value="">Loan Purpose</option>';
  document.getElementById('dynamicFields').innerHTML = '';
  document.getElementById('results').innerHTML = '';
  document.getElementById('details').innerHTML = '';
  document.getElementById('disclaimer').innerText = '';
  if (window.resetAutoRecalcGate) window.resetAutoRecalcGate();

  const loanCategory = document.getElementById('loanCategory').value;

  updateStepTitle(loanCategory, calculatorType, '');
  updateFlowDetails(loanCategory, calculatorType, '');
  updateWelcomeSection(loanCategory, calculatorType, '');

  if (calculatorType === 'simple') {
    const smsfOptions = [
      { value: 'smsf_residential', text: 'Invest in a residential property' },
      { value: 'smsf_commercial', text: 'Invest in a commercial property' },
      { value: 'smsf_refinance', text: 'Refinance my SMSF loan to save' }
    ];
    smsfOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.text;
      loanPurposeSelect.appendChild(opt);
    });

    if (window.unmountSMSFFinancialMode) window.unmountSMSFFinancialMode();

  } else if (calculatorType === 'financial') {
    if (window.mountSMSFFinancialMode) {
      window.mountSMSFFinancialMode();
      setTimeout(() => {
        if (loanPurposeSelect.options.length <= 1) {
          const financialOptions = [
            { value: 'smsf_borrowing_power', text: 'SMSF Borrowing Power (LRBA)' },
            { value: 'smsf_property_analysis', text: 'SMSF Property Investment Analysis' },
            { value: 'smsf_vs_personal', text: 'SMSF vs Personal Investment Comparison' },
            { value: 'smsf_repayment_projector', text: 'SMSF Loan Repayment Projector' },
            { value: 'smsf_refi_equity', text: 'SMSF Loan Refinancing & Equity Release' },
            { value: 'smsf_in_specie', text: 'SMSF Commercial Property In-Specie Transfer' }
          ];
          financialOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            loanPurposeSelect.appendChild(opt);
          });
        }
      }, 100);
    }
    const welcomeStatic = document.getElementById('welcome-message-static');
    if (welcomeStatic) welcomeStatic.style.display = 'none';
    showStaticWelcomeMessage();

  } else {
    if (window.unmountSMSFFinancialMode) window.unmountSMSFFinancialMode();
    const detailsEl = document.getElementById('details');
    detailsEl.innerHTML = `
        <div class="dash-col-header">STEP 2: Select your Calculator</div>
        <div class="dash-col-content">
          <div class="muted">Welcome to the SMSF Loan calculator. Please select a calculator type for further steps.</div>
        </div>
      `;
  }

  updateCalculateButton();
}

// Streamlined loan selection - UPDATED WITH EXTRAS HOME CALCULATORS + Access Equity rename
function setupStreamlinedLoanSelection() {
  const loanCategorySelect = document.getElementById('loanCategory');
  const loanPurposeSelect = document.getElementById('loanPurpose');
  const commercialCalculatorTypeSelect = document.getElementById('commercialCalculatorType');
  const smsfCalculatorTypeSelect = document.getElementById('smsfCalculatorType');

  if (!loanCategorySelect || !loanPurposeSelect) return;

  // State-first UX helpers: store original options and provide label-only placeholders
  const stateSelect = document.getElementById('stateSelect');
  try {
    if (!loanCategorySelect.dataset.originalOptions) loanCategorySelect.dataset.originalOptions = loanCategorySelect.innerHTML;
    if (!loanPurposeSelect.dataset.originalOptions) loanPurposeSelect.dataset.originalOptions = loanPurposeSelect.innerHTML;
  } catch (e) { }

  function setSelectLabelOnly(sel, label) {
    if (!sel) return;
    sel.innerHTML = `<option value="">${label}</option>`;
    try { sel.value = ''; } catch (e) { }
  }

  function restoreCategoryOptions() {
    if (!loanCategorySelect) return;
    const orig = loanCategorySelect.dataset.originalOptions;
    if (orig) loanCategorySelect.innerHTML = orig;
  }

  function setMainUIVisible(show) {
    const ids = ['dynamicFields', 'results', 'details', 'disclaimer'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = show ? '' : 'none';
      if (!show) {
        if (id === 'disclaimer') el.innerText = '';
        else el.innerHTML = '';
      }
    });
  }

  // If no state selected at load, make selects functionally inert (label-only)
  if (!stateSelect || !stateSelect.value) {
    setSelectLabelOnly(loanCategorySelect, 'Loan Type');
    setSelectLabelOnly(loanPurposeSelect, 'Loan Purpose');
    setMainUIVisible(false);
    // Show the static welcome message in the summary (right panel center)
    try {
      const summaryEl = document.getElementById('summary');
      if (summaryEl) {
        summaryEl.style.display = '';
        showStaticWelcomeMessage();
      }
    } catch (e) { }
  }

  // When state changes: restore options and reveal UI, or reset back to label-only
  if (stateSelect) {
    stateSelect.addEventListener('change', function () {
      if (this.value) {
        restoreCategoryOptions();
        setMainUIVisible(true);
        // Replace initial heading with concise state-selected instruction
        try {
          const stepTitle = document.querySelector('.step-title');
          if (stepTitle) {
            stepTitle.innerHTML = `<h4 style="font-size:14px; background: transparent; border-radius:6px; padding:6px 0; margin:0;">What kind of loan do you need? Select the type and purpose to calculate your result.</h4>`;
          }
        } catch (e) { }
        // Clear any previous dynamic content so user starts fresh for a new state
        try {
          document.getElementById('dynamicFields').innerHTML = '';
          document.getElementById('results').innerHTML = '';
          document.getElementById('details').innerHTML = '';
          document.getElementById('disclaimer').innerText = '';
        } catch (e) { }
        if (window.resetAutoRecalcGate) window.resetAutoRecalcGate();
      } else {
        setSelectLabelOnly(loanCategorySelect, 'Loan Type');
        setSelectLabelOnly(loanPurposeSelect, 'Loan Purpose');
        setMainUIVisible(false);
        // Reset and show welcome message in the summary
        resetLoanPurpose();
        try {
          const summaryEl = document.getElementById('summary');
          if (summaryEl) {
            summaryEl.style.display = '';
            showStaticWelcomeMessage();
          }
        } catch (e) { }
      }
    });
  }

  const purposeOptions = {
    home: [
      { value: 'home_borrowing', text: 'Find my borrowing power' },
      { value: 'home_repayment', text: 'Estimate my loan repayments' },
      { value: 'home_refinance', text: 'See my refinance savings' },
      { value: 'home_upgrade', text: 'Upgrading my home' },
      { value: 'home_equity', text: 'Access Equity From My Home' },
      { value: 'home_consolidate', text: 'Consolidate Debt into Home Loan' },

      // Extra Home calculators
      { value: 'home_bridging', text: 'Get a bridging loan (buy before you sell)' },
      { value: 'home_next_home', text: 'Buy my next home (sell & buy)' },
      { value: 'home_investment', text: 'Buy an investment property' },
      { value: 'home_equity_release', text: 'Release equity from my home' },
      { value: 'home_construction', text: 'Build or renovate (construction loan)' }
    ],

    commercial_simple: [
      { value: 'commercial_repayment', text: 'See my commercial property repayments' },
      { value: 'commercial_borrowing', text: 'Find out my business borrowing power' },
      { value: 'equipment_asset', text: 'Finance new equipment or vehicles' },
      { value: 'secured_business', text: 'Get a secured loan for my business' },
      { value: 'unsecured_business', text: 'Explore an unsecured business loan' },
      { value: 'overdraft', text: 'Manage cash flow with an overdraft' },
      { value: 'invoice_finance', text: 'Unlock cash from unpaid invoices' }
    ],
    smsf_simple: [
      { value: 'smsf_residential', text: 'Invest in a residential property' },
      { value: 'smsf_commercial', text: 'Invest in a commercial property' },
      { value: 'smsf_refinance', text: 'Refinance my SMSF loan to save' }
    ]
  };

  loanCategorySelect.addEventListener('change', function () {
    // Prevent selecting a loan category before a state has been chosen
    if (!stateSelect || !stateSelect.value) {
      setSelectLabelOnly(loanCategorySelect, 'Loan Type');
      return;
    }

    const category = this.value;

    resetLoanPurpose();

    loanPurposeSelect.innerHTML = '<option value="">Loan Purpose</option>';
    const calculatorType = category === 'commercial' ? document.getElementById('commercialCalculatorType')?.value :
      category === 'smsf' ? document.getElementById('smsfCalculatorType')?.value : '';

    updateContainerForLoanType(category, calculatorType, '');

    updateWelcomeSection(category, calculatorType, '');
    updateStepTitle(category, calculatorType, '');

    if (category === 'commercial') {
      toggleCommercialCalculatorType(true);
      toggleSMSFCalculatorType(false);
      if (window.unmountSMSFFinancialMode) window.unmountSMSFFinancialMode();

    } else if (category === 'smsf') {
      toggleSMSFCalculatorType(true);
      toggleCommercialCalculatorType(false);
      if (window.unmountCommercialFinancialMode) window.unmountCommercialFinancialMode();

    } else {
      toggleCommercialCalculatorType(false);
      toggleSMSFCalculatorType(false);
      resetCommercialCalculatorType();
      resetSMSFCalculatorType();

      if (category && purposeOptions.home) {
        purposeOptions.home.forEach(option => {
          const opt = document.createElement('option');
          opt.value = option.value;
          opt.textContent = option.text;
          loanPurposeSelect.appendChild(opt);
        });
      }
    }

    try { if (window.__recalcTimer) clearTimeout(window.__recalcTimer); } catch (e) { }
    document.getElementById('results').innerHTML = '';
    document.getElementById('dynamicFields').innerHTML = '';
    document.getElementById('disclaimer').innerText = '';
    try {
      const repaymentSection = document.getElementById('repaymentScenariosSection');
      const repaymentCalc = document.getElementById('repaymentScenariosCalculator');
      const repayBtn = document.querySelector('.repayment-scenarios-btn');
      if (repaymentSection) repaymentSection.style.display = 'none';
      if (repaymentCalc && repaymentCalc.classList.contains('open')) repaymentCalc.classList.remove('open');
      if (repayBtn && repayBtn.classList.contains('open')) repayBtn.classList.remove('open');
    } catch (e) { }
    toggleRepaymentScenariosSection(false);
    updateCalculateButton();
  });

  if (commercialCalculatorTypeSelect) {
    commercialCalculatorTypeSelect.addEventListener('change', function () {
      const calculatorType = this.value;
      const loanCategory = document.getElementById('loanCategory').value;

      updateContainerForLoanType(loanCategory, calculatorType, '');

      handleCommercialCalculatorTypeChange();
    });
  }

  if (smsfCalculatorTypeSelect) {
    smsfCalculatorTypeSelect.addEventListener('change', function () {
      const calculatorType = this.value;
      const loanCategory = document.getElementById('loanCategory').value;

      updateContainerForLoanType(loanCategory, calculatorType, '');

      handleSMSFCalculatorTypeChange();
    });
  }

  loanPurposeSelect.addEventListener('change', function () {
    if (window.resetAutoRecalcGate) window.resetAutoRecalcGate();

    const loanCategory = document.getElementById('loanCategory').value;
    const calculatorType = document.getElementById('commercialCalculatorType')?.value || document.getElementById('smsfCalculatorType')?.value;
    const loanPurpose = this.value;
      const summaryEl = document.getElementById('summary');
      const resultsEl = document.getElementById('results');
      const detailsEl = document.getElementById('details');
      const disclaimerEl = document.getElementById('disclaimer');
      if (summaryEl) summaryEl.innerHTML = '';
      if (resultsEl) resultsEl.innerHTML = '';
      if (detailsEl) detailsEl.innerHTML = '';
      if (disclaimerEl) disclaimerEl.innerText = '';
      try {
        const repaymentSection = document.getElementById('repaymentScenariosSection');
        const repaymentCalc = document.getElementById('repaymentScenariosCalculator');
        const repayBtn = document.querySelector('.repayment-scenarios-btn');
        if (repaymentSection) repaymentSection.style.display = 'none';
        if (repaymentCalc && repaymentCalc.classList.contains('open')) repaymentCalc.classList.remove('open');
        if (repayBtn && repayBtn.classList.contains('open')) repayBtn.classList.remove('open');
      } catch (e) { }

    updateContainerForLoanType(loanCategory, calculatorType, loanPurpose);

    updateFlowDetails(loanCategory, calculatorType, loanPurpose);
    updateWelcomeSection(loanCategory, calculatorType, loanPurpose);

    // NEW: Delegate to home_extras if it knows this type
    if (window.homeExtras && window.homeExtras.renderFields(loanPurpose)) {
      const ws = document.getElementById('welcome-message-static');
      if (ws) ws.style.display = 'none';
      updateCalculateButton();
      try { if (window.__recalcTimer) clearTimeout(window.__recalcTimer); } catch (e) { }
      document.getElementById('results').innerHTML = '';
      document.getElementById('disclaimer').innerText = getDisclaimer(loanPurpose);
      toggleRepaymentScenariosSection(false);
      updateSummary();
      return;
    }

    // EARLY EXIT: Financial modes handle rendering themselves
    if (document.getElementById('commercialCalculatorType')?.value === 'financial' ||
      document.getElementById('smsfCalculatorType')?.value === 'financial') {
      updateCalculateButton();
      return;
    }

    updateCalculateButton();

    if (loanPurpose) {
      renderFields(loanPurpose);
      try { if (window.__recalcTimer) clearTimeout(window.__recalcTimer); } catch (e) { }
      document.getElementById('results').innerHTML = '';
      document.getElementById('disclaimer').innerText = getDisclaimer(loanPurpose);

      toggleRepaymentScenariosSection(false);
      updateSummary();
    } else {
      document.getElementById('dynamicFields').innerHTML = '';
      document.getElementById('results').innerHTML = '';
      toggleRepaymentScenariosSection(false);
    }
  });
}

function initializeResultsPanel() {
  var _resultsEl = document.getElementById('results');
  if (_resultsEl) _resultsEl.innerHTML = '';
  var _detailsEl = document.getElementById('details');
  if (_detailsEl) _detailsEl.innerHTML = '';
  try {
    toggleRepaymentScenariosSection(false);
  } catch (e) {}

  try { showAnimatedWelcomeMessage(); } catch (e) {}

  if (window.resetAutoRecalcGate) try { window.resetAutoRecalcGate(); } catch (e) {}
}

function setupLVRCalculator() {
  const propertyValueInput = document.getElementById('propertyValue');
  const loanAmountInput = document.getElementById('loanAmount');
  const lvrInput = document.getElementById('lvrPercentage');
  if (!propertyValueInput || !loanAmountInput || !lvrInput) return;

  formatNumberInput(propertyValueInput);
  formatNumberInput(loanAmountInput);

  loanAmountInput.addEventListener('input', function () {
    const propertyValue = num(propertyValueInput.value);
    let loanAmount = num(this.value);
    if (propertyValue > 0 && loanAmount > 0) {
      // Enforce maximum loan amount = property value (100% LVR)
      if (loanAmount > propertyValue) {
        loanAmount = propertyValue;
        this.value = fmt(loanAmount, 0);
      }
      const lvr = (loanAmount / propertyValue) * 100;
      lvrInput.value = lvr.toFixed(2);
    } else {
      lvrInput.value = '';
    }
  });

  lvrInput.addEventListener('input', function () {
    const propertyValue = num(propertyValueInput.value);
    const lvr = Number(this.value);
    if (propertyValue > 0 && lvr > 0 && lvr <= 100) {
      const loanAmount = propertyValue * (lvr / 100);
      loanAmountInput.value = fmt(loanAmount, 0);
    } else if (lvr > 100) {
      this.value = '100.00';
      const loanAmount = propertyValue;
      loanAmountInput.value = fmt(loanAmount, 0);
    } else {
      loanAmountInput.value = '';
    }
  });

  propertyValueInput.addEventListener('input', function () {
    const propertyValue = num(this.value);
    const loanAmount = num(loanAmountInput.value);
    if (propertyValue > 0 && loanAmount > 0) {
      // If property value falls below the entered loan, clamp the loan to property value
      if (loanAmount > propertyValue) {
        loanAmountInput.value = fmt(propertyValue, 0);
        lvrInput.value = (100).toFixed(2);
      } else {
        const lvr = (loanAmount / propertyValue) * 100;
        lvrInput.value = lvr.toFixed(2);
      }
    } else {
      lvrInput.value = '';
    }
  });
}

// NEW: Home Upgrade specific dynamic LVR/Loan Amount linkage
function setupHomeUpgradeLVRCalculator() {
  const propertyValueInput = document.getElementById('propertyValue');
  const loanAmountInput = document.getElementById('loanAmount');
  const lvrInput = document.getElementById('lvrPercentage');

  if (!propertyValueInput || !loanAmountInput || !lvrInput) return;

  formatNumberInput(propertyValueInput);
  formatNumberInput(loanAmountInput);

  const syncFromLoan = () => {
    const pv = num(propertyValueInput.value);
    let la = num(loanAmountInput.value);
    if (pv > 0 && la > 0) {
      if (la > pv) {
        la = pv;
        loanAmountInput.value = fmt(la, 0);
      }
      const lvr = (la / pv) * 100;
      lvrInput.value = lvr.toFixed(2);
    } else {
      lvrInput.value = '';
    }
  };

  const syncFromLVR = () => {
    const pv = num(propertyValueInput.value);
    const lvr = Number(lvrInput.value);
    if (pv > 0 && lvr > 0) {
      const la = pv * (lvr / 100);
      loanAmountInput.value = fmt(la, 0);
    } else {
      loanAmountInput.value = '';
    }
  };

  loanAmountInput.addEventListener('input', syncFromLoan);
  propertyValueInput.addEventListener('input', syncFromLoan);

  lvrInput.addEventListener('input', function () {
    // clamp and fix to 2dp
    let v = Number(this.value);
    if (isNaN(v) || v <= 0) return syncFromLoan();
    if (v > 100) v = 100;
    this.value = v.toFixed(2);
    syncFromLVR();
  });
}

function setupNumberFormatting() {
  const textInputs = document.querySelectorAll('input[type="text"]');
  textInputs.forEach(input => {
    // Skip formatting for inputs inside the email modal (name/email) or
    // inputs explicitly marked to opt-out via `data-no-format="1"`.
    try {
      if (input.closest && input.closest('#emailModal')) return;
    } catch (e) {}
    try {
      if (input.dataset && input.dataset.noFormat === '1') return;
    } catch (e) {}
    formatNumberInput(input);
  });
}

function setupApplicantsSelectionHandler() {
  const applicantsSelect = document.getElementById('applicants');
  if (applicantsSelect) {
    applicantsSelect.addEventListener('change', function () {
      const applicants = parseInt(this.value, 10);
    });
  }
}

// Helpers for Debt Consolidation dynamic list
function buildDebtRow(idx = 0) {
  return `
    <div class="debt-row" data-index="${idx}" style="display:flex; gap:8px; align-items:flex-end; margin-bottom:8px; flex-wrap:wrap;">
      <label style="flex:1 1 180px;">Debt Type
        <select class="debt-type">
          <option value="">Debt Type</option>
          <option value="personal_loan">Personal Loan</option>
          <option value="credit_card">Credit Card</option>
          <option value="car_loan">Car Loan</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label style="flex:1 1 160px;">Outstanding Balance
        <input type="text" class="debt-balance" placeholder="e.g. 12,000" value="">
      </label>
      <label style="flex:1 1 140px;">Interest Rate (% p.a.)
        <input type="number" class="debt-rate" placeholder="e.g. 14.9" step="0.01" min="0" max="50" value="">
      </label>
      <label style="flex:1 1 160px;">Monthly Repayment
        <input type="text" class="debt-monthly" placeholder="e.g. 380" value="">
      </label>
      <button type="button" class="btn btn-danger remove-debt" title="Remove" style="height:36px;">-</button>
    </div>
  `;
}

function initDebtList() {
  const container = document.getElementById('debtsList');
  if (!container) return;
  container.innerHTML = buildDebtRow(0);

  // attach number formatting
  setupNumberFormatting();

  // delegation for add/remove
  container.addEventListener('click', function (e) {
    if (e.target && e.target.classList.contains('remove-debt')) {
      const rows = container.querySelectorAll('.debt-row');
      if (rows.length <= 1) {
        // clear row instead of removing last
        const row = rows[0];
        row.querySelector('.debt-balance').value = '';
        row.querySelector('.debt-rate').value = '';
        row.querySelector('.debt-monthly').value = '';
        return;
      }
      e.target.closest('.debt-row').remove();
    }
  });

  const addBtn = document.getElementById('addDebtBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const idx = container.querySelectorAll('.debt-row').length;
      const wrapper = document.createElement('div');
      wrapper.innerHTML = buildDebtRow(idx);
      container.appendChild(wrapper.firstElementChild);
      setupNumberFormatting();
    });
  }
}

// Render dynamic fields for built-in calculators
function renderFields(loanType) {
  const fields = [];

  if (loanType === "home_borrowing") {
    fields.push(`
      <div class="step-title">Step 2: BORROWING CAPACITY</div>
      <div class="row cols-2">
        <label>Number of Applicants
          <select id="applicants" required>
            <option value="1">Single</option>
            <option value="2">Joint</option>
          </select>
        </label>
        <label>Number of Dependents
          <select id="dependents" required>
            <option value="0">0</option><option value="1">1</option>
            <option value="2">2</option><option value="3">3</option>
            <option value="4">4+</option>
          </select>
        </label>
      </div>
      <div class="row cols-2">
        <label>Total Annual Gross Income
          <input type="text" id="grossIncome" required placeholder="e.g. 150,000">
        </label>
        <label>Other Regular Income (annual)
          <input type="text" id="otherIncome" placeholder="e.g. 10,000">
        </label>
      </div>
      <div class="row cols-2">
        <label>Employment Type
          <select id="employmentType" required>
            <option value="payg">PAYG</option>
            <option value="self">Self-Employed</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
        <label>Monthly Living Expenses
          <input type="text" id="livingExpenses" placeholder="Auto-set by HEM; you can edit">
        </label>
      </div>
      <div class="row cols-2">
        <label>Current Home Loan Repayments ($/month)
          <input type="text" id="homeLoanReps" value="0">
        </label>
        <label>Other Loan Repayments ($/month)
          <input type="text" id="otherLoanReps" value="0">
        </label>
      </div>
      <div class="row cols-2">
        <label>Total Credit Card Limits
          <input type="text" id="cardLimits" value="0">
        </label>
        <label>Other Financial Commitments ($/month)
          <input type="text" id="otherCommitments" value="0">
        </label>
      </div>
    `);
  } else if (loanType === "home_repayment") {
    fields.push(`
      <div class="step-title">Step 2: LOAN REPAYMENT</div>
      <div class="row">
        <label>Property Value
          <input type="text" id="propertyValue" required placeholder="e.g. 500,000">
        </label>
      </div>
      <div class="row cols-2">
        <label>Loan Amount
          <input type="text" id="loanAmount" required placeholder="e.g. 400,000">
        </label>
        <label>LVR (%)
          <input type="number" id="lvrPercentage" min="0" max="100" step="0.01" placeholder="e.g. 80.00">
        </label>
      </div>
      <div class="row cols-2">
        <label>Property Use
          <select id="propertyUse" required>
            <option value="">Property Use</option>
            <option value="residential">Residential</option>
            <option value="investment">Investment</option>
          </select>
        </label>
        <label>Deposit Amount
          <input type="text" id="depositAmount" required placeholder="e.g. 50,000">
        </label>
      </div>
      <div class="row cols-2">
        <label>First Home Buyer?
          <select id="firstHomeBuyer" required>
            <option value="">First Home Buyer?</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label>Loan Term (years)
          <input type="number" id="loanTerm" required min="1" max="40" step="1" placeholder="e.g. 30">
        </label>
      </div>
      <input type="hidden" id="interestRate" value="5.99">
    `);
  } else if (loanType === "home_refinance") {
    fields.push(`
      <div class="step-title">Step 2: REFINANCE</div>
      <div class="row cols-2">
        <label>Number of Applicants
          <select id="applicants" required>
            <option value="1">Single</option>
            <option value="2">Joint</option>
          </select>
        </label>
        <label>Current Loan Balance
          <input type="text" id="currentBalance" required placeholder="e.g. 350,000">
        </label>
      </div>
      <div class="row cols-2">
        <label>Property Value <span class="italic">(An estimation is ok)</span>
          <input type="text" id="propertyValue" required placeholder="e.g. 400,000">
        </label>
        <label>Your Current Rate (% p.a.)
          <input type="number" id="currentRate" required min="0" max="20" step="0.01" value="6.50" placeholder="e.g. 6.50">
        </label>
      </div>
      <div class="row cols-2">
        <label>Years remaining on your current loan
          <input type="number" id="currentYears" required min="1" max="40" step="1" placeholder="e.g. 25">
        </label>
        <label>Refinance Loan Term (years)
          <input type="number" id="loanTerm" required min="1" max="40" step="1" placeholder="e.g. 30">
        </label>
      </div>
      <input type="hidden" id="interestRate" value="5.99">
    `);
  } else if (loanType === "home_upgrade") {
fields.push(`
  <div class="step-title">Step 2: HOME UPGRADE</div>

  <div class="row cols-2">
    <label>Number of Applicants
      <select id="applicants" required>
        <option value="1">Single</option>
        <option value="2">Joint</option>
      </select>
    </label>

    <label>Current Property Value
      <input type="text" id="propertyValue" required placeholder="e.g. 600,000">
    </label>
  </div>

  <div class="row cols-2">
    <label>Outstanding Mortgage Balance
      <input type="text" id="currentBalance" required placeholder="e.g. 350,000">
    </label>

    <label>Loan Term (years)
      <input type="number" id="loanTerm" required min="1" max="40" step="1" placeholder="e.g. 30" value="30">
    </label>
  </div>


  <div class="row cols-2">
    <label>LVR (%)
      <input type="number" id="lvrPercentage" min="0" max="95" step="0.01" placeholder="Auto-calculated">
    </label>

     <label>Loan Amount Requested
      <input type="text" id="loanAmount" required placeholder="e.g. 450,000">
    </label>
  </div>

  <input type="hidden" id="interestRate" value="5.99">
`);

  
  } else if (loanType === "home_equity") {

    // UPDATED: Reordered inputs, removed LVR input, added Rate Type, adjusted labels
    fields.push(`
      <div class="step-title">Step 2: ACCESS EQUITY FROM MY HOME</div>
      <div class="row cols-2">
        <label>Number of Applicants
          <select id="applicants" required>
            <option value="1">Single</option>
            <option value="2">Joint</option>
          </select>
        </label>
        <label>Current Loan (Balance)
          <input type="text" id="currentBalance" required placeholder="e.g. 350,000">
        </label>
      </div>
      <div class="row cols-2">
        <label>Property Value
          <input type="text" id="propertyValue" required placeholder="e.g. 600,000">
        </label>
        <label>Access Amount Required
          <input type="text" id="equityAmount" required placeholder="e.g. 50,000">
        </label>
      </div>
      <div class="row cols-2">
        <label>Primary Purpose for Equity Access
          <select id="equityPrimaryPurpose">
            <option value="">Primary Purpose for Equity Access</option>
            <option value="home_renovation">Home Renovation</option>
            <option value="investment">Investment</option>
            <option value="debt_consolidation">Debt Consolidation</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>Your Current Interest Rate
          <input type="number" id="currentRate" required min="0" max="20" step="0.01" value="6.50" placeholder="e.g. 6.50">
        </label>
      </div>
      <div class="row">
        <label>Rate Type
          <select id="rateType">
            <option value="">Rate Type</option>
            <option value="fixed">Fixed</option>
            <option value="variable">Variable</option>
          </select>
        </label>
      </div>
      <input type="hidden" id="interestRate" value="5.99">
    `);
  } else if (loanType === "home_consolidate") {
    fields.push(`
      <div class="step-title">Step 2: DEBT CONSOLIDATION</div>
      <div class="row cols-2">
        <label>Number of Applicants
          <select id="applicants" required>
            <option value="1">Single</option>
            <option value="2">Joint</option>
          </select>
        </label>
        <label>Current Home Loan Balance
          <input type="text" id="currentBalance" required placeholder="e.g. 350,000">
        </label>
      </div>
      <div class="row cols-2">
        <label>Property Value
          <input type="text" id="propertyValue" required placeholder="e.g. 600,000">
        </label>
        <label>Your Current Home Loan Rate (% p.a.)
          <input type="number" id="currentRate" required min="0" max="20" step="0.01" value="6.50" placeholder="e.g. 6.50">
        </label>
      </div>
      <div class="row cols-2">
        <label>New Loan Term (years)
          <input type="number" id="loanTerm" required min="1" max="40" step="1" placeholder="e.g. 30">
        </label>
        <input type="hidden" id="interestRate" value="5.99">
      </div>

      <div class="row" style="margin-top: 10px;">
        <label style="font-weight: bold; color: white;">Debts to Consolidate</label>
      </div>
      <div id="debtsList"></div>
      <div class="row">
        <button type="button" id="addDebtBtn" class="btn btn-secondary">+ Add Another Debt</button>
      </div>
    `);
  } else if (loanType === "commercial_repayment") {
    fields.push(`
      <div class="step-title">Step 2: COMMERCIAL PROPERTY - LOAN REPAYMENT</div>
      <div class="row cols-2">
        <label>Property Value
          <input type="text" id="propertyValue" required placeholder="e.g. 500,000">
        </label>
        <label>Loan Amount
          <input type="text" id="loanAmount" required placeholder="e.g. 400,000">
        </label>
      </div>
      <div class="row cols-2">
        <input type="hidden" id="interestRate" value="7.90">
        <label>Loan Term (years)
          <input type="number" id="loanTerm" required min="1" max="30" step="1" placeholder="e.g. 25">
        </label>
      </div>
      <div class="row cols-2">
        <label>Repayment Type
          <select id="repaymentType">
            <option value="pni">Principal & Interest</option>
            <option value="io">Interest Only</option>
          </select>
        </label>
        <label>Gross Annual Rent
          <input type="text" id="annualRent" placeholder="e.g. 30,000">
        </label>
      </div>
      <div class="row cols-2">
        <label>Annual Property Expenses
          <input type="text" id="annualExpenses" value="0">
        </label>
      </div>
    `);
  } else if (loanType === "commercial_borrowing") {
    fields.push(`
      <div class="step-title">Step 2: COMMERCIAL PROPERTY - BORROWING CAPACITY</div>
      <div class="row cols-2">
        <label>Property Value
          <input type="text" id="propertyValue" required placeholder="e.g. 500,000">
        </label>
        <label>Gross Annual Rent
          <input type="text" id="annualRent" required placeholder="e.g. 30,000">
        </label>
      </div>
      <div class="row cols-2">
        <label>Annual Property Expenses
          <input type="text" id="annualExpenses" value="0">
        </label>
      </div>
    `);
  } else if (loanType === "secured_business") {
    fields.push(`
      <div class="step-title">Step 2: SECURED BUSINESS LOAN</div>
      <div class="row cols-2">
        <label>Loan Amount
          <input type="text" id="loanAmount" required placeholder="e.g. 100,000">
        </label>
        <label>Loan Term (years)
          <input type="number" id="loanTerm" required min="1" max="20" step="1" placeholder="e.g. 5">
        </label>
      </div>
      <div class="row cols-2">
        <input type="hidden" id="interestRate" value="8.50">
        <label>Repayment Type
          <select id="repaymentType">
            <option value="pni">Principal & Interest</option>
            <option value="io">Interest Only</option>
          </select>
        </label>
      </div>
      <div class="row cols-2">
        <label>Security Asset Type
          <select id="assetType">
            <option value="">Select Security Type</option>
            <option value="commercial_property">Commercial Property</option>
            <option value="residential_property">Residential Property</option>
            <option value="business_assets">Business Assets</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>Estimated Asset Value
          <input type="text" id="assetValue" placeholder="e.g. 150,000">
        </label>
      </div>
    `);
  } else if (loanType === "unsecured_business") {
    fields.push(`
      <div class="step-title">Step 2: UNSECURED BUSINESS LOAN</div>
      <div class="row cols-2">
        <label>Loan Amount
          <input type="text" id="loanAmount" required placeholder="e.g. 50,000">
        </label>
        <label>Loan Term (years)
          <input type="number" id="loanTerm" required min="1" max="7" step="1" placeholder="e.g. 3">
        </label>
      </div>
      <div class="row cols-2">
        <input type="hidden" id="interestRate" value="11.50">
        <label>Repayment Frequency
          <select id="repaymentFrequency">
            <option value="monthly">Monthly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
      </div>
    `);
  } else if (loanType === "overdraft") {
    fields.push(`
      <div class="step-title">Step 2: BUSINESS OVERDRAFT</div>
      <div class="row cols-2">
        <label>Overdraft Limit
          <input type="text" id="overdraftLimit" required placeholder="e.g. 20,000">
        </label>
        <input type="hidden" id="interestRate" value="12.00">
      </div>
      <div class="row cols-2">
        <label>Amount to Use (for calculation)
          <input type="text" id="amountUsed" required placeholder="e.g. 10,000">
        </label>
        <label>Interest Calculation
          <select id="interestCalc">
            <option value="monthly">Monthly</option>
            <option value="annually">Annually</option>
          </select>
        </label>
      </div>
    `);
  } else if (loanType === "equipment_asset") {
    fields.push(`
      <div class="step-title">Step 2: EQUIPMENT & ASSET FINANCE</div>
      <div class="row cols-2">
        <label>Asset Cost
          <input type="text" id="assetCost" required placeholder="e.g. 50,000">
        </label>
        <label>Finance Term (years)
          <input type="number" id="financeTerm" required min="1" max="7" step="1" placeholder="e.g. 5">
        </label>
      </div>
      <div class="row cols-2">
        <input type="hidden" id="interestRate" value="6.90">
        <label>Balloon Payment (% of asset cost)
          <input type="number" id="balloonPct" min="0" max="80" step="1" value="20" placeholder="e.g. 20">
        </label>
      </div>
    `);
  } else if (loanType === "invoice_finance") {
    fields.push(`
      <div class="step-title">Step 2: INVOICE FINANCE</div>
      <div class="row cols-2">
        <label>Invoice Value
          <input type="text" id="invoiceValue" required placeholder="e.g. 100,000">
        </label>
        <label>Advance Rate (%)
          <input type="number" id="advanceRate" required min="0" max="100" step="1" value="85">
        </label>
      </div>
      <div class="row cols-2">
        <label>Discount/Fee (% of invoice)
          <input type="number" id="discountFee" required min="0" max="10" step="0.01" value="3">
        </label>
      </div>
    `);
  } else if (loanType === "smsf_residential") {
    fields.push(`
      <div class="step-title">Step 2: SMSF RESIDENTIAL - PURCHASE</div>
      <div class="row cols-2">
        <label>Property Value
          <input type="text" id="propertyValue" required placeholder="e.g. 400,000">
        </label>
        <label>Deposit
          <input type="text" id="depositAmount" required placeholder="e.g. 100,000">
        </label>
      </div>
      <div class="row cols-2">
        <input type="hidden" id="interestRate" value="6.75">
        <label>Loan Term (years)
          <input type="number" id="loanTerm" required min="1" max="30" step="1" value="25" placeholder="e.g. 25">
        </label>
      </div>
      <div class="row cols-2">
        <label>Rent Amount
          <input type="text" id="rentAmount" required placeholder="e.g. 500">
        </label>
        <label>Rent Frequency
          <select id="rentFrequency" required>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
      </div>
      <div class="row cols-2">
        <label>Annual SMSF Running Costs
          <input type="text" id="annualSMSFFees" required value="3,500" placeholder="e.g. 3,500">
        </label>
        <label>Combined Annual Member Contributions
          <input type="text" id="memberContribs" value="0">
        </label>
      </div>
      <div class="row cols-2">
        <label>SMSF Cash & Liquid Assets
          <input type="text" id="smsfLiquidAssets" value="0">
        </label>
      </div>
    `);
  } else if (loanType === "smsf_commercial") {
    fields.push(`
      <div class="step-title">Step 2: SMSF COMMERCIAL - PURCHASE</div>
      <div class="row cols-2">
        <label>Property Value
          <input type="text" id="propertyValue" required placeholder="e.g. 400,000">
        </label>
        <label>Deposit
          <input type="text" id="depositAmount" required placeholder="e.g. 100,000">
        </label>
      </div>
      <div class="row cols-2">
        <input type="hidden" id="interestRate" value="6.75">
        <label>Loan Term (years)
          <input type="number" id="loanTerm" required min="1" max="30" step="1" value="25" placeholder="e.g. 25">
        </label>
      </div>
      <div class="row cols-2">
        <label>Rent Amount
          <input type="text" id="rentAmount" required placeholder="e.g. 2,500">
        </label>
        <label>Rent Frequency
          <select id="rentFrequency" required>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
      </div>
      <div class="row cols-2">
        <label>Annual SMSF Running Costs
          <input type="text" id="annualSMSFFees" required value="3,500" placeholder="e.g. 3,500">
        </label>
        <label>Combined Annual Member Contributions
          <input type="text" id="memberContribs" value="0">
        </label>
      </div>
      <div class="row cols-2">
        <label>SMSF Cash & Liquid Assets
          <input type="text" id="smsfLiquidAssets" value="0">
        </label>
      </div>
    `);
  } else if (loanType === "smsf_refinance") {
    fields.push(`
      <div class="step-title">Step 2: SMSF REFINANCE</div>
      <div class="row cols-2">
        <label>Property Value
          <input type="text" id="propertyValue" required placeholder="e.g. 400,000">
        </label>
        <label>Loan Amount
          <input type="text" id="loanAmount" required placeholder="e.g. 300,000">
        </label>
      </div>
      <div class="row cols-2">
        <label>Current Interest Rate (% p.a.)
          <input type="number" id="currentRate" required min="0" max="20" step="0.01" value="7.50" placeholder="e.g. 7.50">
        </label>
        <label>Loan Term (years)
          <input type="number" id="loanTerm" required min="1" max="30" step="1" value="25" placeholder="e.g. 25">
        </label>
      </div>
      <div class="row cols-2">
        <label>Rent Amount
          <input type="text" id="rentAmount" required placeholder="e.g. 2,500">
        </label>
        <label>Rent Frequency
          <select id="rentFrequency" required>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
      </div>
      <div class="row cols-2">
        <label>Annual SMSF Running Costs
          <input type="text" id="annualSMSFFees" required value="3,500" placeholder="e.g. 3,500">
        </label>
        <label>SMSF Cash & Liquid Assets
          <input type="text" id="smsfLiquidAssets" value="0">
        </label>
      </div>
      <input type="hidden" id="interestRate" value="6.75">
    `);
  }

  document.getElementById('dynamicFields').innerHTML = fields.join('');
  if (loanType === "home_upgrade") {
    setTimeout(setupHomeUpgradeLVRCalculator, 100);
  }
  if (loanType === "home_repayment") {
    setTimeout(setupLVRCalculator, 100);
  }
  if (loanType === "home_consolidate") {
    setTimeout(initDebtList, 50);
  }

  // Wire dynamic summary update on purpose change for Access Equity (also apply to Equity Release)
  if (loanType === "home_equity" || loanType === "home_equity_release") {
    const purposeSel = document.getElementById('equityPrimaryPurpose');
    if (purposeSel) {
      purposeSel.addEventListener('change', () => {
        updateSummary();
      });
    }
  }

  setTimeout(() => {
    setupNumberFormatting();
    const amountFields = document.querySelectorAll('input[type="text"]');
    amountFields.forEach(field => {
      if (field.value && !field.value.includes(',')) {
        const value = num(field.value);
        if (!isNaN(value) && value > 0) {
          field.value = fmt(value, 0);
        }
      }

    });

    if (loanType.startsWith('home_')) {
      setupApplicantsSelectionHandler();
    }
  }, 150);

  if (loanType === "home_borrowing") {
    const setHEM = () => {
      const applicants = parseInt(document.getElementById('applicants').value, 10);
      const dependents = parseInt(document.getElementById('dependents').value, 10);
      const household = applicants + dependents;
      const HEM = [0, 1800, 2600, 3200, 3800, 4300];
      const hemVal = HEM[Math.min(5, Math.max(1, household))];
      const le = document.getElementById('livingExpenses');
      if (le && !le.value) le.value = fmt(hemVal, 0);
    };

    const applicantsSelect = document.getElementById('applicants');
    const dependentsSelect = document.getElementById('dependents');
    if (applicantsSelect) applicantsSelect.addEventListener('change', setHEM);
    if (dependentsSelect) dependentsSelect.addEventListener('change', setHEM);
    setHEM();
  }
  const homeLoanTypes = [
    "home_repayment",
    "home_borrowing",
    "home_refinance",
    "home_upgrade",
    "home_equity",
    "home_consolidate",
    'commercial_borrowing',
    'commercial_repayment',
    'equipment_asset',
    'secured_business',
    'unsecured_business',
    'overdraft',
    'invoice_finance',
    'smsf_residential',
    'smsf_commercial',
    'smsf_refinance'
  ];

  if (homeLoanTypes.includes(loanType)) {
    const welcomeStatic = document.getElementById('welcome-message-static');
    if (welcomeStatic) welcomeStatic.style.display = 'none';
  }
}

function updateStatePill() {
  const map = {
    NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland", WA: "Western Australia",
    SA: "South Australia", TAS: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory"
  };
  const state = document.getElementById('stateSelect').value;
  const nameEl = document.getElementById('stateName');
  const selectContainer = document.getElementById('stateSelectContainer');

  if (state && nameEl && selectContainer) {
    selectContainer.style.display = 'none';
    nameEl.style.display = 'block';
    nameEl.textContent = map[state] || state;
    nameEl.style.color = '#ffffff';
  } else if (nameEl && selectContainer) {
    selectContainer.style.display = 'block';
    nameEl.style.display = 'none';
  }
}

// Helper: format percentages to exactly 2 decimal places or '—'
function fmtPct2(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n.toFixed(2) : '—';
}

function updateSummary() {
  const resultsEl = document.getElementById('results');
  const hasResults = !!(resultsEl && resultsEl.innerHTML.trim());
  const summaryEl = document.getElementById('summary');
  
  // Allow dynamic Access Equity summary to render after calculation
  // For consistency with the app, we keep early return for no results.
  if (!hasResults) {
    return;
  }

  const loanPurpose = (window.lastCalc && window.lastCalc.loanPurpose) || document.getElementById('loanPurpose').value;
  const state = document.getElementById('stateSelect').value;

  if (loanPurpose === 'home_repayment' && window.lastCalc && window.lastCalc.baseLVR !== undefined) {
    const baseLVR = window.lastCalc.baseLVR;
    let summaryHTML = '<h2 class="col-title">SUMMARY</h2>';
    if (baseLVR > 80) summaryHTML += lmiSummaryMessages.above80(state, Math.round(baseLVR));
    else summaryHTML += lmiSummaryMessages.below80(state, Math.round(baseLVR));
    summaryEl.innerHTML = summaryHTML;
    return;
  }

  if (loanPurpose === 'home_refinance' && window.lastCalc && window.lastCalc.baseLVR > 80) {
    const lvr = Math.round(window.lastCalc.baseLVR);
    const msg = refinanceSummaryMessage(lvr);
    summaryEl.innerHTML = `<h2 class="col-title">SUMMARY</h2>${msg}`;
    return;
  }

  // NEW: Dynamic summary for Access Equity From My Home (also apply to Equity Release)
  if (loanPurpose === 'home_equity' || loanPurpose === 'home_equity_release') {
    const purposeSel = document.getElementById('equityPrimaryPurpose');
    let purposeText = '';
    switch (purposeSel?.value) {
      case 'home_renovation': purposeText = 'Home Renovation'; break;
      case 'investment': purposeText = 'Investment'; break;
      case 'debt_consolidation': purposeText = 'Debt Consolidation'; break;
      default: purposeText = 'Other Purpose';
    }
    const dynamicMsg = `
You’re planning to access the equity in your property for ${purposeText}. This calculator shows an estimate of how this might affect your LVR and any LMI that could apply.

Please note: The results are estimates only and do not constitute an approval. If you proceed with a full application, the lender will usually order a valuation, and the assessed property value may differ from the amount you have entered here.
    `.trim();
    summaryEl.innerHTML = `<h2 class="col-title">SUMMARY</h2><p class="muted" style="white-space:pre-line">${dynamicMsg}</p>`;
    return;
  }

  let summaryTxt = summaryDescriptions && summaryDescriptions[loanPurpose] ? summaryDescriptions[loanPurpose] : '';
  if (summaryTxt) {
    summaryEl.innerHTML = `<h2 class="col-title">SUMMARY</h2><p class="muted" style="white-space:pre-line">${summaryTxt}</p>`;
  } else {
    // Fallback: if no specific summary exists, show a generic one
    summaryEl.innerHTML = `<h2 class="col-title">SUMMARY</h2><p class="muted" style="white-space:pre-line">Your calculation is complete. Review the results above for details.</p>`;
  }
}

function getDisclaimer(loanType) {
  if (loanType.startsWith("home_") && loanType !== "home_borrowing") {
    return homeLoanDisclaimer;
  }
  if (loanType === "home_borrowing" || loanType === "commercial_borrowing") {
    return "The borrowing capacity estimate provided by this calculator is for illustrative purposes only and is not a guarantee of finance.";
  }
  if (loanType.startsWith("smsf")) {
    return "Disclaimer: SMSF lending is subject to SIS Act rules and LRBA structures. Results are preliminary only. Interest and cash flow are calculated on your actual loan amount. Maximum LVR is typically around 70% and liquidity requirements apply.";
  }
  if (loanType === "commercial_repayment" || loanType === "commercial_borrowing") {
    return "Disclaimer: Commercial results include a conservative DSCR and LVR check. Actual outcomes depend on lease quality, property type, valuation and full lender assessment.";
  }
  if (loanType === "secured_business" || loanType === "unsecured_business" || loanType === "overdraft" || loanType === "equipment_asset" || loanType === "invoice_finance") {
    return "Disclaimer: Commercial and business lending is subject to property/asset valuation, lease documentation, and borrower financials. Final approval and pricing may vary. Always consult a commercial finance specialist.";
  }
  return "The borrowing capacity estimate provided by this calculator is for illustrative purposes only and is not a guarantee of finance.";
}

function renderDetails(loanType, ctx) {
  const el = document.getElementById('details');
  let html = '';
  let title = '';

  if (loanType === 'home_borrowing') {
    title = 'BORROWING CAPACITY DETAILS';
    html = `
      <div>Annual Gross Income: $${fmt(Math.abs(ctx.grossIncome))}</div>
      <div>Other Income: $${fmt(Math.abs(ctx.otherIncome))}</div>
      <div>Monthly Living Expenses: $${fmt(Math.abs(ctx.livingExpenses))}</div>
      <div>Total Monthly Commitments: $${fmt(Math.abs(ctx.monthlyCommitments))}</div>
      <div>Assessment Rate: ${ctx.assessmentRatePct}%</div>
      <div>Loan Term: ${ctx.termYears} Years</div>
    `;
  } else if (loanType === 'commercial_borrowing') {
    title = 'BORROWING CAPACITY DETAILS';
    html = `
      <div>Property Value: $${fmt(Math.abs(ctx.propertyValue))}</div>
      <div>Annual Rent: $${fmt(Math.abs(ctx.annualRent))}</div>
      <div>Annual Expenses: $${fmt(Math.abs(ctx.annualExpenses))}</div>
      <div>Net Operating Income: $${fmt(Math.abs(ctx.noi))}</div>
      <div>DSCR: ${Math.round(ctx.dscr)}</div>
      <div>Maximum LVR: 65%</div>
    `;
  } else if (loanType === 'home_repayment') {
    title = 'PURCHASE DETAILS';
    html = `
      <div>Property Value: $${fmt(Math.abs(ctx.propertyValue))}</div>
      <div>Base Loan Amount: $${fmt(Math.abs(ctx.baseLoanAmount))}</div>
      <div>Base LVR: ${fmtPct2(ctx.baseLVR)}%</div>
      <div>Deposit Amount: $${fmt(Math.abs(ctx.depositAmount))}</div>
      <div>Loan Term: ${ctx.loanTerm} Years</div>
      <div>Property Use: ${ctx.propertyUse.charAt(0).toUpperCase() + ctx.propertyUse.slice(1)}</div>
      <div>First Home Buyer: ${ctx.firstHomeBuyer ? 'Yes' : 'No'}</div>
      ${ctx.lmiPremium > 0 ? `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--line);">
          <div><strong>Capitalised Loan</strong></div>
          <div>Estimated LMI: ~$${fmt(Math.abs(ctx.lmiPremium))}</div>
          <div>Total Loan Amount: $${fmt(Math.abs(ctx.totalLoanAmount))}</div>
          <div>Effective LVR: ${fmtPct2(ctx.effectiveLVR)}%</div>
        </div>
      ` : ''}
    `;
  } else if (loanType === 'home_refinance') {
    title = 'CURRENT vs NEW LOAN';
    html = `
      <div class="muted">Current Loan Details</div>
      <div>Balance: $${fmt(Math.abs(ctx.currentBalance))}</div>
      <div>Your Current Rate: ${ctx.currentRatePct}%</div>
      <div>Years Remaining: ${ctx.currentYears} Years</div>
      <div>Base LVR: ${fmtPct2(ctx.baseLVR)}%</div>
      <hr class="hr"/>
      <div class="muted">${ctx.lmiPremium > 0 ? 'Capitalised Loan Details' : 'New Loan Details'}</div>
      ${ctx.lmiPremium > 0 ? `
        <div>Lenders Mortgage Insurance (LMI): ~$${fmt(Math.abs(ctx.lmiPremium))} (Estimate)</div>
        <div>Total Loan Amount: $${fmt(Math.abs(ctx.totalLoanAmount))}</div>
        <div>Effective LVR: ${fmtPct2(ctx.effectiveLVR)}%</div>
      ` : ''}
      <div>Refinance Rate: ${ctx.interestRatePct}%</div>
      <div>Refinance Term: ${ctx.loanTerm} Years</div>
    `;
  } else if (loanType === 'home_upgrade' || loanType === 'home_equity') {
    title = 'LOAN STRUCTURE DETAILS';
    html = `
      <div>Property Value: $${fmt(ctx.propertyValue)}</div>
      <div>Current Loan Balance: $${fmt(ctx.currentBalance)}</div>
      <div>Base Loan Amount: $${fmt(ctx.baseLoanAmount)}</div>
      <div>Base LVR: ${fmtPct2(ctx.baseLVR)}%</div>
      ${ctx.lmiPremium > 0 ? `
        <div>Lenders Mortgage Insurance (LMI): ~$${fmt(ctx.lmiPremium)} (Estimate)</div>
        <div>Total Loan Amount: $${fmt(ctx.totalLoanAmount)}</div>
        <div>Effective LVR: ${fmtPct2(ctx.effectiveLVR)}%</div>
      ` : ''}
      <div>Refinance Rate: ${ctx.interestRatePct}%</div>
      <div>Refinance Term: ${ctx.loanTerm} Years</div>
    `;
  } else if (loanType === 'home_consolidate') {
    title = 'DEBT CONSOLIDATION DETAILS';
    html = `
      <div>Property Value: $${fmt(ctx.propertyValue)}</div>
      <div>Current Loan Balance: $${fmt(ctx.currentBalance)}</div>
      <div class="muted" style="margin-top: 10px;">Debts Being Consolidated:</div>
      <div><strong>Number of Debts:</strong> ${ctx.debtsCount}</div>
      <div><strong>Total Existing Debts:</strong> $${fmt(ctx.totalExistingDebts)}</div>
      <hr class="hr"/>
      <div>Base Loan Amount (current + debts): $${fmt(ctx.baseLoanAmount)}</div>
      <div>Base LVR: ${fmtPct2(ctx.baseLVR)}%</div>
      ${ctx.lmiPremium > 0 ? `
        <div>Lenders Mortgage Insurance (LMI): ~$${fmt(ctx.lmiPremium)} (Estimate)</div>
        <div>Total Consolidated Loan Amount: $${fmt(ctx.totalLoanAmount)}</div>
        <div>Effective LVR: ${fmtPct2(ctx.effectiveLVR)}%</div>
      ` : ''}
      <div>Refinance Rate: ${ctx.interestRatePct}%</div>
      <div>Refinance Term: ${ctx.loanTerm} Years</div>
    `;
  } else if (loanType === 'commercial_repayment') {
    const dscr = ctx.annualRent > 0 ? ((ctx.annualRent - ctx.annualExpenses) / (ctx.monthlyRepayment * 12)) : 0;
    title = 'COMMERCIAL LOAN DETAILS';
    html = `
      <div>Loan Amount: $${fmt(ctx.loanAmount)}</div>
      <div>Interest Rate: ${ctx.interestRatePct}%</div>
      <div>Loan Term: ${ctx.loanTerm} Years</div>
      <div>Repayment Type: ${ctx.repaymentType === 'io' ? 'Interest Only' : 'P&I'}</div>
      <div>Property Value: $${fmt(ctx.propertyValue)}</div>
      <div>LVR: ${Math.round(ctx.lvr)}%</div>
      <div>DSCR: ${Math.round(dscr)}</div>
    `;
  } else if (loanType === 'secured_business') {
    title = 'SECURED LOAN DETAILS';
    html = `
      <div>Loan Amount: $${fmt(ctx.loanAmount)}</div>
      <div>Interest Rate: ${ctx.interestRatePct}%</div>
      <div>Loan Term: ${ctx.loanTerm} Years</div>
      <div>Repayment Type: ${ctx.repaymentType === 'io' ? 'Interest Only' : 'P&I'}</div>
      ${ctx.assetType ? `<div>Security Type: ${ctx.assetType}</div>` : ''}
      ${ctx.assetValue ? `<div>Asset Value: $${fmt(ctx.assetValue)}</div>` : ''}
    `;
  } else if (loanType === 'overdraft') {
    title = 'OVERDRAFT DETAILS';
    html = `
      <div>Limit: $${fmt(ctx.limit, 0)}</div>
      <div>Amount Used: $${fmt(ctx.used, 0)}</div>
      <div>Interest Rate: ${ctx.interestRatePct}%</div>
    `;
  } else if (loanType === 'equipment_asset') {
    const balloonAmount = (ctx.assetCost * ctx.balloonPct / 100);
    title = 'EQUIPMENT FINANCE DETAILS';
    html = `
      <div>Asset Cost: $${fmt(ctx.assetCost)}</div>
      <div>Finance Term: ${ctx.financeTerm} Years</div>
      <div>Interest Rate: ${ctx.interestRatePct}%</div>
      <div>Balloon Payment: ${ctx.balloonPct}%</div>
      <div>Balloon Amount: $${fmt(balloonAmount)}</div>
    `;
  } else if (loanType === 'invoice_finance') {
    title = 'INVOICE FINANCE DETAILS';
    html = `
      <div>Invoice Value: $${fmt(ctx.invoiceValue)}</div>
      <div>Advance Rate: ${ctx.advanceRate}%</div>
      <div>Discount/Fee: ${ctx.discountFee}%</div>
    `;
  } else if (loanType.startsWith('smsf_')) {
    title = 'SMSF DETAILS';
    html = `
      <div>Property Value: $${fmt(ctx.propertyValue)}</div>
      ${ctx.loanAmount !== undefined ? `<div>Loan Amount: $${fmt(ctx.loanAmount)}</div>` : ''}
      ${ctx.depositAmount !== undefined ? `<div>Deposit: $${fmt(ctx.depositAmount)}</div>` : ''}
      ${ctx.lvr !== undefined ? `<div>LVR: ${Math.round(ctx.lvr)}%</div>` : ''}
      <div>Interest Rate: ${ctx.interestRatePct}%</div>
      <div>Loan Term: ${ctx.loanTerm} Years</div>
      ${ctx.annualRent !== undefined ? `<div>Annual Rent: $${fmt(ctx.annualRent)}</div>` : ''}
      ${ctx.annualSMSFFees !== undefined ? `<div>Annual SMSF Fees: $${fmt(ctx.annualSMSFFees)}</div>` : ''}
      ${ctx.memberContribs !== undefined ? `<div>Member Contributions: $${fmt(ctx.memberContribs)}</div>` : ''}
      ${ctx.smsfLiquidAssets !== undefined ? `<div>SMSF Liquid Assets: $${fmt(ctx.smsfLiquidAssets)}</div>` : ''}
    `;
  } else {
    title = '';
    html = '';
  }

  if (title) {
    el.innerHTML = `
      <div class="dash-col-header">${title}</div>
      <div class="dash-col-content">${html}</div>
    `;
  } else {
    el.innerHTML = html;
  }
}

function renderStep4(loanType) {
  const resultsEl = document.getElementById('results');
  if (!resultsEl) return;
  const prev = resultsEl.querySelector('.step4-block');
  if (prev) prev.remove();
  const msg = step4Messages[loanType];
  if (!msg) return;
  const div = document.createElement('div');
  div.className = 'step4-block';
  div.innerHTML = `
    <div class="step4-label">Step 3:</div>
    <div class="step4-text">${msg}</div>
  `;
  const cta = resultsEl.querySelector('.cta-btn');
  if (cta) resultsEl.insertBefore(div, cta);
  else resultsEl.appendChild(div);
}

function addBorrowingCapacityDisclaimer() {
  return `
    <div class="borrowing-disclaimer" style="margin-top: 20px; padding: 15px; background: #0b0d12; border-radius: 10px; border-left: 4px solid var(--accent);">
      <h3 style="color: white; margin: 0 0 10px 0; font-size: 14px;">Why Your Final Amount May Be Different</h3>
      <p style="margin: 0 0 10px 0; font-size: 12px; line-height: 1.4;">
        The figure shown is a conservative estimate designed to be a reliable starting point. As a brokerage with access to over 20 lenders, we can often find a solution that gets you a higher amount.
      </p>
      <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Your actual borrowing capacity can vary based on:</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.4;">
        <li><strong>Lender Policy:</strong> Some lenders are more generous with certain types of income.</li>
        <li><strong>Loan Features:</strong> Your choice of offset accounts or package deals can influence the assessment.</li>
        <li><strong>Complex Scenarios:</strong> Many of the specialist lenders on our panel excel at handling complex scenarios and can look beyond standard lending criteria.</li>
      </ul>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', function () {
  setupStreamlinedLoanSelection();
  setupStatePillClickHandler();
  setupNumberFormatting();
  initializeResultsPanel();

  updateStatePill();
  document.getElementById('stateSelect').addEventListener('change', updateStatePill);
});

// expose for other modules (eventListeners)
window.initDebtList = initDebtList;

