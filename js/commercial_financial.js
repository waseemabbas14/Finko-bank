// commercial_financial.js
// REFACTORED: Uses the existing #loanPurpose dropdown for Financial calculators (no extra dropdowns)
// - When Commercial -> Financial is selected, we populate #loanPurpose with the 6 financial tools
// - Inputs render into #dynamicFields
// - Main Calculate button is used (we intercept form submit to run the selected financial calc)
// - No duplicate/third dropdowns; no extra buttons.

// Debt Consolidation & Refinancing Optimiser fixes and enhancements implemented:
// • Correct debt summation across dynamic rows
// • Accurate PMT use (standard formula), no silent fee-capitalisation
// • Transparent "Before" scenario interest modelling via amortisation
// • Dynamic "Add Debt" form with Debt Type-driven defaults
// • Step 2: "Your New Consolidation Loan Details" incl. editable pre-populated amount and fee handling (toggle finance/not)

// Equipment Financing & Lifecycle Cost Analysis (TCO) - IMPLEMENTED CHANGES PER "6.1" REVIEW:
// • Added Financing Amount field (auto-populates from Asset Cost; user-editable)
// • Corrected TCO formulas:
//   - TCO (Cash) = Purchase Price + Total Operating Costs - Residual Value
//   - TCO (Financed) = Deposit + Total Loan Payments + Total Operating Costs - Residual Value
// • Interest now computed on financed amount only
// • Balloon calculated off the financed amount (not the asset cost)
// • NPV includes Deposit as time-zero outflow
// • Summary language updated specifically for TCO tool

(function() {
  const q = (id) => document.getElementById(id);
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts || false);

  // Use globals from existing stack if present; provide fallbacks
  const has = {
    num: typeof window.num === 'function',
    fmt: typeof window.fmt === 'function',
    calcMonthlyRepayment: typeof window.calcMonthlyRepayment === 'function',
    calcBalloonRepayment: typeof window.calcBalloonRepayment === 'function',
    setupNumberFormatting: typeof window.setupNumberFormatting === 'function',
    showStaticWelcomeMessage: typeof window.showStaticWelcomeMessage === 'function',
    setFlowDetails: typeof window.setFlowDetails === 'function'
  };
  function n(val) {
    if (has.num) return window.num(val);
    const v = parseFloat(String(val || '').replace(/,/g, ''));
    return isNaN(v) ? 0 : v;
  }
  function f(v, d) {
    if (has.fmt) return window.fmt(v, d === undefined ? 0 : d);
    return Number(v).toLocaleString(undefined, { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function pmtMonthly(P, annualRate, years) {
    // annualRate expected as decimal (e.g., 0.105 for 10.5%)
    if (has.calcMonthlyRepayment) return window.calcMonthlyRepayment(P, annualRate, years);
    const r = annualRate / 12, n = years * 12;
    if (annualRate === 0) return n === 0 ? 0 : P / n;
    return P * r / (1 - Math.pow(1 + r, -n));
  }
  function pmtBalloon(P, annualRate, years, balloonPct) {
    if (has.calcBalloonRepayment) return window.calcBalloonRepayment(P, annualRate, years, balloonPct);
    const n = years * 12, r = annualRate / 12, B = P * (balloonPct / 100);
    if (annualRate === 0) return (P - B) / n;
    return ((P - (B / Math.pow(1 + r, n))) * r) / (1 - Math.pow(1 + r, -n));
  }
  function npv(rateAnnualPct, cashflows, freqPerYear) {
    const r = (rateAnnualPct / 100) / (freqPerYear || 1);
    let total = 0;
    for (let t = 0; t < cashflows.length; t++) total += cashflows[t] / Math.pow(1 + r, t + 1);
    return total;
  }
  function amortYearInterestTotal(principal, ratePct, years) {
    const r = ratePct / 100;
    const monthly = pmtMonthly(principal, r, years);
    let bal = principal;
    const out = [];
    for (let m = 1; m <= years * 12; m++) {
      const interest = bal * (r / 12);
      const principalPaid = Math.max(0, monthly - interest);
      bal = Math.max(0, bal - principalPaid);
      const y = Math.ceil(m / 12) - 1;
      out[y] = (out[y] || 0) + interest;
      if (bal <= 0) break;
    }
    return out;
  }

  const state = {
    mounted: false,
    lpChangeHandler: null,
    formSubmitHandler: null,
    lvb: {
      buyTermDirty: false,
      horizonDirty: false,
      buyPriceDirty: false
    },
    wc: {
      milestoneCounter: 0
    },
    dc: {
      debtCounter: 0,
      newAmountDirty: false
    },
    cpi: {
      costsDirty: false,
      loanDirty: false,
      lvrDirty: false
    },
    // NEW: Equipment TCO field state
    tco: {
      financeDirty: false
    }
  };

  function resetPanels() {
    if (has.showStaticWelcomeMessage) {
      try { window.showStaticWelcomeMessage(); } catch(e){}
    } else {
      const summaryEl = q('welcome-message-static');
      if (summaryEl) summaryEl.innerHTML = `
        <div class="welcome-message-static">
          <h2 class="col-title">WELCOME</h2>
          <p class="muted" style="white-space:pre-line">to Finco Capital. Please select your loan type and purpose to get started.</p>
        </div>
      `;
    }
    q('results') && (q('results').innerHTML = '');
    q('details') && (q('details').innerHTML = '');
    q('disclaimer') && (q('disclaimer').innerText = '');
  }

  function populateLoanPurposeWithFinancialOptions() {
    const lp = q('loanPurpose');
    if (!lp) return;

    // Replace existing options with financial tools
    lp.innerHTML = '';
    const opts = [
      { v: '', t: 'Select Decision Analysis' },
      { v: 'lease_vs_buy', t: 'Lease vs. Buy Analysis' },
      { v: 'cashflow_affordability', t: 'Business Cash Flow & Loan Affordability' },
      { v: 'working_capital', t: 'Working Capital Loan Calculator' },
      { v: 'debt_consolidation_refi', t: 'Debt Consolidation & Refinancing Optimiser' },
      { v: 'equipment_tco', t: 'Equipment Financing & Lifecycle Cost (TCO)' },
      { v: 'commercial_property_analysis', t: 'Commercial Property Investment Analysis' }
    ];
    opts.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.v; opt.textContent = o.t;
      lp.appendChild(opt);
    });
  }

  function onLoanPurposeChange(e) {
    const val = e.target.value;
    renderFinancialToolFields(val);
  }

function onFormSubmitIntercept(e) {
  const cat = q('loanCategory')?.value;
  const mode = q('commercialCalculatorType')?.value;
  if (cat === 'commercial' && mode === 'financial') {
    const tool = q('loanPurpose')?.value || '';
    if (!tool) {
      e.preventDefault(); e.stopImmediatePropagation();
      alert('Please select a Financial calculator from the Loan Purpose dropdown.');
      return;
    }
    e.preventDefault(); e.stopImmediatePropagation();
    performFinancialCalculation(tool); // Yeh line execute honi chahiye
  }
}

  function mount() {
    if (state.mounted) return;
    const lp = q('loanPurpose');
    const form = q('loanForm');
    if (!lp || !form) return;

    populateLoanPurposeWithFinancialOptions();
    q('dynamicFields').innerHTML = '';
    resetPanels();

    // Attach change handler on loanPurpose for Financial mode
    state.lpChangeHandler = onLoanPurposeChange;
    on(lp, 'change', state.lpChangeHandler);

    // Intercept form submit to run selected financial tool
    state.formSubmitHandler = onFormSubmitIntercept;
    on(form, 'submit', state.formSubmitHandler, true);

    state.mounted = true;
  }

  function unmount() {
    if (!state.mounted) return;
    const lp = q('loanPurpose');
    const form = q('loanForm');

    if (lp && state.lpChangeHandler) {
      lp.removeEventListener('change', state.lpChangeHandler);
    }
    if (form && state.formSubmitHandler) {
      form.removeEventListener('submit', state.formSubmitHandler, true);
    }
    q('dynamicFields') && (q('dynamicFields').innerHTML = '');
    state.lpChangeHandler = null;
    state.formSubmitHandler = null;
    state.mounted = false;
  }

  // Add cleanup function for when loan type changes
  window.cleanupCommercialFinancialMode = function() {
    unmount();
    if (typeof window.resetLoanPurpose === 'function') {
      window.resetLoanPurpose();
    }
  };

  // Expose for ui.js to call
  window.mountCommercialFinancialMode = mount;
  window.unmountCommercialFinancialMode = unmount;

  // ---------- Working Capital helpers ----------
  function addMilestoneRow(amount = '', when = '', unit = '') {
    const host = q('wc_milestones');
    if (!host) return;
    const idx = ++state.wc.milestoneCounter;
    const row = document.createElement('div');
    row.className = 'row cols-3';
    row.setAttribute('data-msid', String(idx));
    row.innerHTML = `
      <label>Payment Amount (Expected Revenue)
        <input type="text" id="wc_ms_amount_${idx}" placeholder="e.g. 80,000" value="${amount}">
      </label>
      <label>Timing Value
        <input type="number" id="wc_ms_time_${idx}" min="0" step="1" placeholder="e.g. 2" value="${when}">
      </label>
      <label>Unit
        <select id="wc_ms_unit_${idx}">
          <option value="">Unit</option>
          <option value="months"${unit==='months'?' selected':''}>Months</option>
          <option value="days"${unit==='days'?' selected':''}>Days</option>
        </select>
      </label>
      <div class="row" style="grid-column: 1 / -1; margin: -6px 0 6px 0;">
        <button type="button" class="btn btn-outline" data-remove-ms="${idx}" style="background:#0b0d12; border:1px solid #333; padding:8px 12px; border-radius:8px; font-size:12px;">Remove</button>
      </div>
    `;
    host.appendChild(row);

    // Wire removal
    const removeBtn = row.querySelector(`[data-remove-ms="${idx}"]`);
    on(removeBtn, 'click', () => {
      row.remove();
      // Recompute total debt if needed in other tools (no-op here)
    });

    // Apply numeric formatting to amount field
    setTimeout(() => { if (has.setupNumberFormatting) window.setupNumberFormatting(); }, 30);
  }

  function getMilestones() {
    const host = q('wc_milestones');
    if (!host) return [];
    const rows = host.querySelectorAll('[data-msid]');
    const list = [];
    rows.forEach(r => {
      const id = r.getAttribute('data-msid');
      const amt = n(q(`wc_ms_amount_${id}`)?.value || 0);
      const tVal = Number(q(`wc_ms_time_${id}`)?.value || 0);
      const unit = q(`wc_ms_unit_${id}`)?.value || 'months';
      if (amt > 0 && tVal >= 0) {
        const months = unit === 'days' ? Math.max(0, Math.ceil(tVal / 30)) : Math.max(0, Math.round(tVal));
        list.push({ amount: amt, month: months });
      }
    });
    return list.sort((a,b) => a.month - b.month);
  }
  // --------------------------------------------

  // ---------- Debt Consolidation helpers ----------
  function dc_addDebtRow(prefill = {}) {
    const host = q('dc_debts_container');
    if (!host) return;
    const idx = ++state.dc.debtCounter;

    const type = prefill.type || '';
    const bal = prefill.balance || '';
    const rate = prefill.ratePct || (type === 'credit_card' ? '19.99' : '14.50');
    const term = prefill.termYrs || (type === 'credit_card' ? '5' : '5');

    const row = document.createElement('div');
    row.className = 'row cols-4 dc-debt-row';
    row.setAttribute('data-dcid', String(idx));
    row.innerHTML = `
        <label>Debt Type
        <select id="dc_type_${idx}">
          <option value="">Debt Type</option>
          <option value="personal"${type==='personal'?' selected':''}>Personal Loan</option>
          <option value="car"${type==='car'?' selected':''}>Car Loan</option>
          <option value="credit_card"${type==='credit_card'?' selected':''}>Credit Card</option>
          <option value="other"${type==='other'?' selected':''}>Other</option>
        </select>
      </label>
      <label>Balance
        <input type="text" id="dc_bal_${idx}" placeholder="e.g. 20,000" value="${bal}">
      </label>
      <label>Rate (% p.a.)
        <input type="number" id="dc_rate_${idx}" min="0" max="60" step="0.01" value="${rate}">
      </label>
      <label>Term (years)
        <input type="number" id="dc_term_${idx}" min="1" max="15" step="1" value="${term}">
      </label>
      <div class="row" style="grid-column: 1 / -1; margin-top: -4px;">
        <button type="button" class="btn btn-outline" data-remove-dc="${idx}" style="background:#0b0d12; border:1px solid #333; padding:8px 12px; border-radius:8px; font-size:12px;">Remove</button>
      </div>
    `;
    host.appendChild(row);

    // Wire remove
    const removeBtn = row.querySelector(`[data-remove-dc="${idx}"]`);
    on(removeBtn, 'click', () => {
      row.remove();
      dc_updateTotalAndNewAmount();
    });

    // Type change -> set sensible defaults if untouched
    const typeSel = q(`dc_type_${idx}`);
    on(typeSel, 'change', () => {
      const t = typeSel.value;
      const rateEl = q(`dc_rate_${idx}`);
      const termEl = q(`dc_term_${idx}`);
      if (t === 'credit_card') {
        if (Number(rateEl.value) === 0 || rateEl.value === '' || Number(rateEl.value) === 14.5) rateEl.value = '19.99';
        if (Number(termEl.value) === 0 || termEl.value === '' || Number(termEl.value) === 5) termEl.value = '5';
      } else if (t === 'car') {
        if (Number(rateEl.value) === 0 || rateEl.value === '' || Number(rateEl.value) === 19.99) rateEl.value = '9.99';
        if (Number(termEl.value) === 0 || termEl.value === '' || Number(termEl.value) === 5) termEl.value = '5';
      } else {
        if (Number(rateEl.value) === 0 || rateEl.value === '' || Number(rateEl.value) === 19.99) rateEl.value = '14.50';
        if (Number(termEl.value) === 0 || termEl.value === '' || Number(termEl.value) === 5) termEl.value = '5';
      }
    });

    // Recompute totals when any input changes
    const balEl = q(`dc_bal_${idx}`);
    const rateEl = q(`dc_rate_${idx}`);
    const termEl = q(`dc_term_${idx}`);
    [balEl, rateEl, termEl, typeSel].forEach(el => on(el, 'input', dc_updateTotalAndNewAmount));

    setTimeout(() => { if (has.setupNumberFormatting) window.setupNumberFormatting(); }, 30);
    dc_updateTotalAndNewAmount();
  }

  function dc_collectDebts() {
    const rows = document.querySelectorAll('.dc-debt-row');
    const debts = [];
    rows.forEach(r => {
      const id = r.getAttribute('data-dcid');
      const type = q(`dc_type_${id}`)?.value || 'personal';
      const bal = n(q(`dc_bal_${id}`)?.value || 0);
      const ratePct = parseFloat(q(`dc_rate_${id}`)?.value || '0');
      const termYrs = n(q(`dc_term_${id}`)?.value || 0);
      if (bal > 0 && termYrs > 0) {
        debts.push({ type, bal, ratePct, termYrs });
      }
    });
    return debts;
  }

  function dc_sumBalances() {
    return dc_collectDebts().reduce((s, d) => s + d.bal, 0);
  }

  function dc_updateTotalAndNewAmount() {
    const total = dc_sumBalances();
    const sumEl = q('dc_total_sum');
    if (sumEl) sumEl.innerText = '$' + f(Math.round(total));
    const newAmtEl = q('dc_new_amount');
    if (newAmtEl && !state.dc.newAmountDirty) {
      newAmtEl.value = f(Math.round(total));
    }
  }

  // --------------------------------------------

  // CPI SUMMARY MESSAGE (static)
  function setCPISummaryMessage() {
    const summaryEl = q('summary');
    if (!summaryEl) return;
    summaryEl.innerHTML = `
      <h2 class="col-title">SUMMARY</h2>
      <div class="muted" style="white-space:pre-line">
You are using a Commercial Financial calculator to analyse a commercial property investment. Most commercial lenders typically offer loans up to a maximum of 70% Loan-to-Value Ratio (LVR). An LVR above this level may be difficult to secure and could attract higher interest rates or additional lender charges. The calculations provided are for illustrative purposes and are subject to final lender approval. 
Figures are preliminary and for guidance. For a detailed assessment, please request a call-back.
      </div>
    `;
    const discEl = q('disclaimer');
    if (discEl) {
      discEl.innerText = `You are using a Commercial Financial calculator to analyse a commercial property investment. Most commercial lenders typically offer loans up to a maximum of 70% Loan-to-Value Ratio (LVR). An LVR above this level may be difficult to secure and could attract higher interest rates or additional lender charges. The calculations provided are for illustrative purposes and are subject to final lender approval. 
Figures are preliminary and for guidance. For a detailed assessment, please request a call-back.`;
    }
  }

  function renderFinancialToolFields(tool) {
    const host = q('dynamicFields');
    if (!host) return;
    let html = '';

    switch (tool) {
      case 'lease_vs_buy':
        // (unchanged) ...
        html = `
          <div class="step-title">Section 1: Leasing Scenario</div>
          <div class="row cols-2">
            <label>Asset Value / Price
              <input type="text" id="lvb_assetValue" placeholder="e.g. 80,000">
            </label>
            <label>Monthly Lease Payment
              <input type="text" id="lvb_leaseMonthly" placeholder="e.g. 1,600">
            </label>
          </div>
          <div class="row cols-2">
            <label>Lease Term (years)
              <input type="number" id="lvb_leaseTerm" min="1" max="15" step="1" value="5">
            </label>
            <label>Residual Value
              <input type="text" id="lvb_leaseResidual" placeholder="e.g. 10,000">
            </label>
          </div>
          <div class="row">
            <label>Annual Maintenance Cost (Lease)
              <input type="text" id="lvb_maintAnnualLease" value="0">
            </label>
          </div>

          <div class="step-title" style="margin-top:12px;">Section 2: Buying Scenario</div>
          <div class="row cols-2">
            <label>Asset Purchase Price
              <input type="text" id="lvb_buyPrice" placeholder="e.g. 80,000">
            </label>
            <label>Loan Interest Rate (% p.a.)
              <input type="number" id="lvb_buyRate" min="0" max="30" step="0.01" value="8.50">
            </label>
          </div>
          <div class="row cols-2">
            <label>Loan Term (years)
              <input type="number" id="lvb_buyTerm" min="1" max="7" step="1" value="5">
            </label>
            <label>Deposit Amount / Down Payment
              <input type="text" id="lvb_downPayment" placeholder="e.g. 0">
            </label>
          </div>
          <div class="row cols-2">
            <label>Expected Resale Value (After Term)
              <input type="text" id="lvb_resaleValue" value="0">
            </label>
            <label>Annual Maintenance Cost (Buy)
              <input type="text" id="lvb_maintAnnualBuy" value="0">
            </label>
          </div>
          <div class="row">
            <label>Balloon Payment (% of financed amount)
              <input type="number" id="lvb_buyBalloonPct" min="0" max="80" step="1" value="20">
            </label>
          </div>

          <div class="step-title" style="margin-top:12px;">Section 3: Financial Assumptions</div>
          <div class="row cols-3">
            <label>Company Tax Rate (%)
              <input type="number" id="lvb_taxRate" min="0" max="100" step="0.01" value="25">
            </label>
            <label>Annual Depreciation Rate (%)
              <input type="number" id="lvb_depRate" min="0" max="100" step="0.01" value="20">
            </label>
            <label>Discount Rate (NPV) (%)
              <input type="number" id="lvb_discountRate" min="0" max="30" step="0.01" value="7.00">
            </label>
          </div>
          <div class="row">
            <label>Projected Years (Analysis)
              <input type="number" id="lvb_horizon" min="1" max="15" step="1" value="5">
            </label>
          </div>
        `;
        break;

      case 'cashflow_affordability':
        html = `
          <div class="row cols-2">
            <label>Starting Cash Balance
              <input type="text" id="cfa_startCash" placeholder="e.g. 50,000">
            </label>
            <label>Monthly Revenue (starting)
              <input type="text" id="cfa_revStart" placeholder="e.g. 80,000">
            </label>
          </div>
          <div class="row cols-2">
            <label>Monthly Revenue Growth (%)
              <input type="number" id="cfa_revGrowthPct" min="-50" max="200" step="0.1" value="2.0">
            </label>
            <label>Gross Margin (% of revenue)
              <input type="number" id="cfa_marginPct" min="0" max="100" step="0.1" value="35.0">
            </label>
          </div>
          <div class="row cols-2">
            <label>Fixed Operating Costs (per month)
              <input type="text" id="cfa_fixedCosts" placeholder="e.g. 30,000">
            </label>
            <label>Months to Project
              <input type="number" id="cfa_months" min="1" max="36" step="1" value="24">
            </label>
          </div>
          <div class="row cols-2">
            <label>Loan Amount
              <input type="text" id="cfa_loanAmount" placeholder="e.g. 500,000">
            </label>
            <label>Interest Rate (% p.a.)
              <input type="number" id="cfa_ratePct" min="0" max="30" step="0.01" value="9.50">
            </label>
          </div>
          <div class="row cols-2">
            <label>Loan Term (years)
              <input type="number" id="cfa_termYears" min="1" max="30" step="1" value="10">
            </label>
            <label>Interest-Only Period (months)
              <input type="number" id="cfa_ioMonths" min="0" max="60" step="1" value="12">
            </label>
          </div>
          <div class="row cols-2">
            <label>Minimum Cash Buffer
              <input type="text" id="cfa_minBuffer" value="25,000">
            </label>
            <label>Affordability Focus
              <select id="cfa_focus">
                <option value="buffer">Maintain buffer</option>
                <option value="no_negative">Avoid negative balance</option>
              </select>
            </label>
          </div>
        `;
        break;

      case 'working_capital':
        html = `
          <div class="row cols-2">
            <label>Upfront Project Costs
              <input type="text" id="wc_upfront" placeholder="e.g. 120,000">
            </label>
            <label>Monthly Operating Cost
              <input type="text" id="wc_burn" placeholder="e.g. 40,000">
            </label>
          </div>

          <div class="row cols-3">
            <label>Project Duration (months)
              <input type="number" id="wc_duration" min="1" max="36" step="1" value="6">
            </label>
            <label>Upfront Costs Payable Immediately (%)
              <input type="number" id="wc_upfront_pct" min="0" max="100" step="1" value="100">
            </label>
            <label>Starting Cash
              <input type="text" id="wc_startCash" value="0">
            </label>
          </div>

          <div class="row">
            <div class="muted" style="padding:10px; border-radius:8px;">
              Add one or more Expected Revenue milestones below. Each milestone represents cash received from your customer at the specified time.
            </div>
          </div>

          <div id="wc_milestones"></div>
          <div class="row" style="margin-top:6px;">
            <button type="button" id="wc_addMilestone" class="btn btn-outline" style="background:#0b0d12; border:1px solid #333; padding:10px 14px; border-radius:10px; font-size:12px;">
              + Add Payment Milestone
            </button>
          </div>
        `;
        break;

      case 'debt_consolidation_refi':
        html = `
          <div class="step-title">Step 1: Add Your Existing Debts</div>
          <div class="row">
            <div class="muted" style="padding:10px; border-radius:8px;">
              Add each personal loan, car loan, credit card or other debt you want to consolidate. Enter balance, interest rate and remaining term.
            </div>
          </div>
          <div id="dc_debts_container"></div>
          <div class="row" style="margin-top:6px;">
            <button type="button" id="dc_addDebt" class="btn btn-outline" style="background:#0b0d12; border:1px solid #333; padding:10px 14px; border-radius:10px; font-size:12px;">
              + Add Debt
            </button>
          </div>
          <div class="row" style="margin-top:6px;">
            <div class="muted">Total Debt Entered: <strong id="dc_total_sum">$0</strong></div>
          </div>

          <div class="step-title" style="margin-top:12px;">Step 2: Your New Consolidation Loan Details</div>
          <div class="row cols-2">
            <label>Consolidation Loan Amount
              <input type="text" id="dc_new_amount" placeholder="Pre-populated from total" >
            </label>
            <label>New Interest Rate (% p.a.)
              <input type="number" id="dc_new_rate" min="0" max="40" step="0.01" value="10.50">
            </label>
          </div>
          <div class="row cols-2">
            <label>New Loan Term (Years)
              <input type="number" id="dc_new_term" min="1" max="20" step="1" value="7">
            </label>
            <label>Estimated Upfront Fees
              <input type="text" id="dc_new_fees" value="0">
            </label>
          </div>
          <div class="row">
            <label>
              <input type="checkbox" id="dc_finance_fees" style="width:auto; display:inline-block; margin-right:8px;"> Finance the fees into the new loan?
            </label>
          </div>
        `;
        break;

      case 'equipment_tco':
        html = `
          <div class="row cols-2">
            <label>Asset Cost
              <input type="text" id="tco_assetCost" placeholder="e.g. 150,000">
            </label>
            <label>Financing Amount
              <input type="text" id="tco_financeAmount" placeholder="Auto = Asset Cost (editable)">
            </label>
          </div>
          <div class="row cols-2">
            <label>Finance Rate (% p.a.)
              <input type="number" id="tco_ratePct" min="0" max="30" step="0.01" value="7.9">
            </label>
            <label>Finance Term (years)
              <input type="number" id="tco_termYears" min="1" max="7" step="1" value="5">
            </label>
          </div>
          <div class="row cols-2">
            <label>Balloon (% of financed amount)
              <input type="number" id="tco_balloonPct" min="0" max="80" step="1" value="0">
            </label>
            <label>Annual Operating Costs
              <input type="text" id="tco_operAnnual" value="0">
            </label>
          </div>
          <div class="row cols-2">
            <label>Useful Life (years)
              <input type="number" id="tco_usefulLife" min="1" max="15" step="1" value="7">
            </label>
            <label>Residual Value (end of life)
              <input type="text" id="tco_residualValue" value="0">
            </label>
          </div>
          <div class="row cols-2">
            <label>Hours per Year
              <input type="number" id="tco_hoursPerYear" min="1" max="4000" step="1" value="1200">
            </label>
            <label>Discount Rate for TCO (%)
              <input type="number" id="tco_discountPct" min="0" max="30" step="0.01" value="7.0">
            </label>
          </div>
          <div class="row cols-2">
            <label>Compare vs Cash Purchase?
              <select id="tco_compareCash">
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
          </div>
        `;
        break;

      case 'commercial_property_analysis':
        // NEW per "5.1- Commercial Property Investment Analysis Calculator Review"
        html = `
          <div class="step-title">Section 1: Property & Purchase Details</div>
          <div class="row cols-3">
            <label>Purchase Price
              <input type="text" id="cpi_price" placeholder="e.g. 1,200,000">
            </label>
            <label>Stamp Duty & Purchase Costs
              <input type="text" id="cpi_costs" placeholder="Auto 6% of price (editable)">
            </label>
            <label>Initial Renovation Costs (CapEx)
              <input type="text" id="cpi_reno" value="0">
            </label>
          </div>

          <div class="step-title" style="margin-top:12px;">Section 2: Rental Income & Growth</div>
          <div class="row cols-3">
            <label>Annual Gross Rent
              <input type="text" id="cpi_rent" placeholder="e.g. 90,000">
            </label>
            <label>Vacancy Rate (%)
              <div style="display:flex;align-items:center;gap:10px;">
                <input type="range" id="cpi_vacancySlider" min="0" max="15" step="0.5" value="8" style="flex:1;">
                <input type="number" id="cpi_vacancyPct" min="0" max="15" step="0.1" value="8" style="width:80px;">
              </div>
            </label>
            <label>Annual Rental Growth (%)
              <input type="number" id="cpi_rentGrowth" min="0" max="20" step="0.1" value="2.0">
            </label>
          </div>
          <div class="row cols-3">
            <label>Property Growth (%)
              <input type="number" id="cpi_valueGrowth" min="0" max="20" step="0.1" value="2.5">
            </label>
          </div>

          <div class="step-title" style="margin-top:12px;">Section 3: Operating Expenses</div>
          <div class="row cols-3">
            <label>Council Rates (p.a.)
              <input type="text" id="cpi_exp_rates" value="0">
            </label>
            <label>Water Charges (p.a.)
              <input type="text" id="cpi_exp_water" value="0">
            </label>
            <label>Insurance (p.a.)
              <input type="text" id="cpi_exp_ins" value="0">
            </label>
          </div>
          <div class="row cols-3">
            <label>Management Fees (% of rent)
              <input type="number" id="cpi_mgmtPct" min="0" max="20" step="0.1" value="6.0">
            </label>
            <label>Repairs & Maintenance (p.a.)
              <input type="text" id="cpi_exp_repairs" value="0">
            </label>
            <label>Other Annual Costs
              <input type="text" id="cpi_exp_other" value="0">
            </label>
          </div>
          <div class="row cols-3">
            <label>Annual Expenses Growth (%)
              <input type="number" id="cpi_expGrowth" min="0" max="15" step="0.1" value="2.0">
            </label>
          </div>

          <div class="step-title" style="margin-top:12px;">Section 4: Financing Details</div>
          <div class="row cols-3">
            <label>Loan Amount
              <input type="text" id="cpi_loan" placeholder="Auto 70% of price (editable)">
            </label>
            <label>LVR (%)
              <input type="number" id="cpi_lvr" min="0" max="100" step="0.1" placeholder="Auto-calc">
            </label>
            <label>Interest Rate (% p.a.)
              <input type="number" id="cpi_ratePct" min="0" max="30" step="0.01" value="7.25">
            </label>
          </div>
          <div class="row cols-3">
            <label>Loan Term (Years)
              <input type="number" id="cpi_termYears" min="1" max="30" step="1" value="25">
            </label>
          </div>
        `;
        break;

      default:
        html = '';
    }

    host.innerHTML = html;

    // Lease vs Buy pre-populate/sync
    if (tool === 'lease_vs_buy') {
      const assetValEl = q('lvb_assetValue');
      const buyPriceEl = q('lvb_buyPrice');
      const leaseTermEl = q('lvb_leaseTerm');
      const buyTermEl = q('lvb_buyTerm');
      const horizonEl = q('lvb_horizon');

      if (assetValEl && buyPriceEl) {
        const syncBuyPrice = () => {
          if (!state.lvb.buyPriceDirty) buyPriceEl.value = assetValEl.value;
        };
        syncBuyPrice();
        on(assetValEl, 'input', syncBuyPrice);
        on(buyPriceEl, 'input', () => { state.lvb.buyPriceDirty = true; });
        on(buyPriceEl, 'focus', () => { state.lvb.buyPriceDirty = true; });
      }

      if (leaseTermEl && buyTermEl && horizonEl) {
        const syncTerms = () => {
          if (!state.lvb.buyTermDirty) buyTermEl.value = leaseTermEl.value;
          if (!state.lvb.horizonDirty) horizonEl.value = leaseTermEl.value;
        };
        syncTerms();
        on(leaseTermEl, 'input', syncTerms);
        on(buyTermEl, 'input', () => { state.lvb.buyTermDirty = true; });
        on(buyTermEl, 'focus', () => { state.lvb.buyTermDirty = true; });
        on(horizonEl, 'input', () => { state.lvb.horizonDirty = true; });
        on(horizonEl, 'focus', () => { state.lvb.horizonDirty = true; });
      }
    }

    // Working Capital: wire milestones button and add an initial example row
    if (tool === 'working_capital') {
      const addBtn = q('wc_addMilestone');
      on(addBtn, 'click', () => addMilestoneRow());
      addMilestoneRow();
    }

    // Debt Consolidation: dynamic rows and new amount dirty tracking
    if (tool === 'debt_consolidation_refi') {
      state.dc.debtCounter = 0;
      state.dc.newAmountDirty = false;
      const addBtn = q('dc_addDebt');
      on(addBtn, 'click', () => dc_addDebtRow());
      // Start with one example row
      dc_addDebtRow({ type: 'personal', balance: '', ratePct: '14.50', termYrs: '5' });

      const newAmtEl = q('dc_new_amount');
      on(newAmtEl, 'input', () => { state.dc.newAmountDirty = true; });
      on(newAmtEl, 'focus', () => { state.dc.newAmountDirty = true; });

      setTimeout(() => { if (has.setupNumberFormatting) window.setupNumberFormatting(); }, 30);
    }

    // Equipment TCO: auto-populate Finance Amount from Asset Cost until user edits Finance Amount
    if (tool === 'equipment_tco') {
      state.tco.financeDirty = false;
      const assetEl = q('tco_assetCost');
      const finEl = q('tco_financeAmount');

      const syncFinance = () => {
        if (!state.tco.financeDirty && finEl) finEl.value = assetEl.value;
      };

      if (assetEl && finEl) {
        // initial sync
        syncFinance();
        on(assetEl, 'input', syncFinance);
        on(finEl, 'input', () => { state.tco.financeDirty = true; });
        on(finEl, 'focus', () => { state.tco.financeDirty = true; });
      }

      setTimeout(() => { if (has.setupNumberFormatting) window.setupNumberFormatting(); }, 50);
    }

    // COMMERCIAL PROPERTY ANALYSIS: wire auto-calcs & summary
    if (tool === 'commercial_property_analysis') {
      state.cpi.costsDirty = false;
      state.cpi.loanDirty = false;
      state.cpi.lvrDirty = false;

      // Auto-calc costs (6%) and loan (70%) on price change; editable fields remain
      const priceEl = q('cpi_price');
      const costsEl = q('cpi_costs');
      const loanEl = q('cpi_loan');
      const lvrEl = q('cpi_lvr');
      const vacSlider = q('cpi_vacancySlider');
      const vacInput = q('cpi_vacancyPct');

      const autoSyncFromPrice = () => {
        const price = n(priceEl.value);
        if (!state.cpi.costsDirty) costsEl.value = f(Math.round(price * 0.06));
        if (!state.cpi.loanDirty) loanEl.value = f(Math.round(price * 0.70));
        // Update LVR when loan present
        const loan = n(loanEl.value);
        if (price > 0) {
          const lvr = (loan / price) * 100;
          if (!state.cpi.lvrDirty) lvrEl.value = Math.round(lvr * 10) / 10;
        } else {
          if (!state.cpi.lvrDirty) lvrEl.value = '';
        }
      };

      const syncLVRFromLoan = () => {
        const price = n(priceEl.value);
        const loan = n(loanEl.value);
        if (price > 0) {
          const lvr = (loan / price) * 100;
          lvrEl.value = Math.round(lvr * 10) / 10;
        } else {
          lvrEl.value = '';
        }
      };

      const syncLoanFromLVR = () => {
        const price = n(priceEl.value);
        const lvr = parseFloat(lvrEl.value || '0');
        if (price > 0 && lvr >= 0 && lvr <= 100) {
          const loan = price * (lvr / 100);
          loanEl.value = f(Math.round(loan));
        }
      };

      // Vacancy slider/input sync
      const syncVacancy = (from = 'slider') => {
        if (from === 'slider') {
          vacInput.value = vacSlider.value;
        } else {
          let v = parseFloat(vacInput.value || '0');
          if (isNaN(v)) v = 0;
          v = Math.min(15, Math.max(0, v));
          vacInput.value = v;
          vacSlider.value = v;
        }
      };

      // Wire events
      if (priceEl) {
        on(priceEl, 'input', autoSyncFromPrice);
      }
      if (costsEl) {
        on(costsEl, 'input', () => { state.cpi.costsDirty = true; });
        on(costsEl, 'focus', () => { state.cpi.costsDirty = true; });
      }
      if (loanEl) {
        on(loanEl, 'input', () => { state.cpi.loanDirty = true; syncLVRFromLoan(); });
        on(loanEl, 'focus', () => { state.cpi.loanDirty = true; });
      }
      if (lvrEl) {
        on(lvrEl, 'input', () => { state.cpi.lvrDirty = true; syncLoanFromLVR(); });
        on(lvrEl, 'focus', () => { state.cpi.lvrDirty = true; });
      }
      if (vacSlider && vacInput) {
        on(vacSlider, 'input', () => syncVacancy('slider'));
        on(vacInput, 'input', () => syncVacancy('input'));
      }

      // Initial autopopulate (on first render)
      setTimeout(() => {
        autoSyncFromPrice();
        if (has.setupNumberFormatting) window.setupNumberFormatting();
      }, 30);

      // Show required static SUMMARY immediately
      setCPISummaryMessage();
    }

    setTimeout(() => { if (has.setupNumberFormatting) window.setupNumberFormatting(); }, 50);
  }

  function writeResults(header, html, detailsTitle, detailsHtml, disclaimerText) {
    const resEl = q('results');
    const detEl = q('details');
    const discEl = q('disclaimer');

    if (resEl) {
      resEl.innerHTML = `
        <div class="dash-col-header">${header}</div>
        <div class="dash-col-content">${html}</div>
        <button type="button" class="cta-btn" onclick="alert('Lead form coming soon! (We can pre-fill with calculation data here.)')">
          <img src="./t-removebg-preview.png" alt="" style="width:10px; height:16px; vertical-align:middle;"> Submit a Call Back Request
        </button>
      `;
    }
    if (detEl) {
      detEl.innerHTML = detailsTitle
        ? `<div class="dash-col-header">${detailsTitle}</div><div class="dash-col-content">${detailsHtml}</div>`
        : '';
    }
    if (discEl) {
      discEl.innerText = disclaimerText || "Disclaimer: Results are indicative only and based on the information provided. Commercial lending outcomes depend on lease quality, property type, valuation and full lender assessment.";
    }

    const summaryEl = q('summary');
    if (summaryEl) {
      // Default summary (specific tools can override right after calling writeResults)
      summaryEl.innerHTML = `<h2 class="col-title">SUMMARY</h2><p class="muted" style="white-space:pre-line">You are using a Commercial Financial calculator to explore debt consolidation and refinance options. Figures are preliminary and for guidance. For a detailed assessment, please request a call-back.</p>`;
    }

    try { window.hasCalculated = true; } catch(e) {}
    
    // Flip to front to show results
    try { 
      if (window.dashboardFlip && typeof window.dashboardFlip.showFront === 'function') {
        window.dashboardFlip.showFront();
      }
    } catch(e) {}
  }

  // Calculators (existing functions remain the same)
  function calcLeaseVsBuy() {
    const assetVal = n(q('lvb_assetValue')?.value || 0);
    const leaseMonthly = n(q('lvb_leaseMonthly')?.value || 0);
    const leaseTerm = n(q('lvb_leaseTerm')?.value || 5);
    const leaseResidual = n(q('lvb_leaseResidual')?.value || 0);
    const leaseMaint = n(q('lvb_maintAnnualLease')?.value || 0);
    const buyPrice = n(q('lvb_buyPrice')?.value || 0);
    const buyRate = n(q('lvb_buyRate')?.value || 8.5) / 100;
    const buyTerm = n(q('lvb_buyTerm')?.value || 5);
    const downPay = n(q('lvb_downPayment')?.value || 0);
    const resale = n(q('lvb_resaleValue')?.value || 0);
    const buyMaint = n(q('lvb_maintAnnualBuy')?.value || 0);
    const balloonPct = n(q('lvb_buyBalloonPct')?.value || 20);
    const taxRate = n(q('lvb_taxRate')?.value || 25) / 100;
    const depRate = n(q('lvb_depRate')?.value || 20) / 100;
    const discountRate = n(q('lvb_discountRate')?.value || 7) / 100;
    const horizon = n(q('lvb_horizon')?.value || 5);

    if (!assetVal || !leaseMonthly || !buyPrice) {
      alert('Please fill in Asset Value, Lease Monthly, and Buy Price.');
      return;
    }

    const leaseTotalMonthly = leaseMonthly + (leaseMaint / 12);
    const leaseTotal = leaseTotalMonthly * 12 * leaseTerm - (leaseResidual || 0);

    const financeAmount = buyPrice - downPay;
    const monthlyBuy = pmtBalloon(financeAmount, buyRate, buyTerm, balloonPct);
    const buyTotalMonthly = monthlyBuy + (buyMaint / 12);

    const leaseAfterTax = leaseTotalMonthly * (1 - taxRate);
    const leaseNPV = [];
    for (let y = 0; y < horizon; y++) {
      leaseNPV.push(-(leaseAfterTax * 12) / Math.pow(1 + discountRate, y + 1));
    }
    const leaseNPVTotal = leaseNPV.reduce((a,b) => a + b, 0);

    const buyNPVCash = [];
    const depAnnual = (buyPrice * depRate) / buyTerm;
    for (let y = 0; y < horizon; y++) {
      let cf = -(buyTotalMonthly * 12);
      const depTaxBenefit = depAnnual * taxRate;
      cf += depTaxBenefit;
      buyNPVCash.push(cf / Math.pow(1 + discountRate, y + 1));
    }
    buyNPVCash[0] -= downPay;
    if (horizon === buyTerm) buyNPVCash[buyTerm - 1] += resale;
    const buyNPVTotal = buyNPVCash.reduce((a,b) => a + b, 0);

    const recommendation = buyNPVTotal > leaseNPVTotal ? 'LEASE' : 'BUY';
    const html = `
      <h3>Lease Scenario (${leaseTerm} years)</h3>
      <div>Total Monthly: $${f(leaseTotalMonthly)}</div>
      <div>Total Cost: $${f(leaseTotal)}</div>
      <div>NPV: $${f(leaseNPVTotal)}</div>
      <hr class="hr"/>
      <h3>Buy Scenario (${buyTerm} years)</h3>
      <div>Monthly Payment: $${f(monthlyBuy)}</div>
      <div>Total Monthly (with maintenance): $${f(buyTotalMonthly)}</div>
      <div>NPV: $${f(buyNPVTotal)}</div>
      <hr class="hr"/>
      <h3>Recommendation</h3>
      <div class="big ${recommendation === 'BUY' ? 'green' : ''}">${recommendation}</div>
      <div class="muted" style="margin-top:10px;">NPV Difference: $${f(Math.abs(buyNPVTotal - leaseNPVTotal))}</div>
    `;
    const detailsHtml = `
      <div><b>Asset Value:</b> $${f(assetVal)}</div>
      <div><b>Analysis Period:</b> ${horizon} years</div>
      <div><b>Lease Term:</b> ${leaseTerm} years</div>
      <div><b>Buy Term:</b> ${buyTerm} years</div>
      <div><b>Discount Rate:</b> ${(discountRate * 100).toFixed(2)}%</div>
      <div><b>Tax Rate:</b> ${(taxRate * 100).toFixed(2)}%</div>
      <div><b>Depreciation Rate:</b> ${(depRate * 100).toFixed(2)}%</div>
    `;
    writeResults('LEASE VS BUY ANALYSIS', html, 'INPUT SUMMARY', detailsHtml, 'Recommendation based on NPV comparison over ' + horizon + ' years.');
  }

  function calcCashflowAffordability() {
    const startCash = n(q('cfa_startCash')?.value || 0);
    const revStart = n(q('cfa_revStart')?.value || 0);
    const revGrowth = n(q('cfa_revGrowthPct')?.value || 2) / 100;
    const margin = n(q('cfa_marginPct')?.value || 35) / 100;
    const fixedCosts = n(q('cfa_fixedCosts')?.value || 0);
    const months = n(q('cfa_months')?.value || 24);
    const loanAmount = n(q('cfa_loanAmount')?.value || 0);
    const ratePct = n(q('cfa_ratePct')?.value || 9.5) / 100;
    const termYears = n(q('cfa_termYears')?.value || 10);
    const ioMonths = n(q('cfa_ioMonths')?.value || 12);
    const minBuffer = n(q('cfa_minBuffer')?.value || 25000);
    const focus = q('cfa_focus')?.value || 'buffer';

    if (!revStart || !loanAmount || !termYears) {
      alert('Please fill in Monthly Revenue, Loan Amount, and Loan Term.');
      return;
    }

    const loanPayment = ioMonths > 0 && ioMonths < months
      ? (ioMonths / 12) * (loanAmount * ratePct / 12) + ((months - ioMonths) / 12) * pmtMonthly(loanAmount, ratePct, termYears)
      : pmtMonthly(loanAmount, ratePct, termYears);

    let balance = startCash + loanAmount;
    let minBalance = balance;
    let criticalMonth = 0;
    let inDefaultRisk = false;

    for (let m = 1; m <= months; m++) {
      const rev = revStart * Math.pow(1 + revGrowth, m / 12);
      const gm = rev * margin;
      const netCF = gm - fixedCosts - loanPayment;
      balance += netCF;

      if (focus === 'buffer' && balance < minBuffer) {
        minBalance = balance;
        criticalMonth = m;
        inDefaultRisk = true;
        break;
      } else if (focus === 'no_negative' && balance < 0) {
        minBalance = balance;
        criticalMonth = m;
        inDefaultRisk = true;
        break;
      }
      if (balance < minBalance) minBalance = balance;
    }

    const finalBalance = balance;
    const html = `
      <h3>Cash Flow Projection</h3>
      <div>Starting Cash: $${f(startCash)}</div>
      <div>Loan Amount: $${f(loanAmount)}</div>
      <div>Monthly Loan Payment: $${f(loanPayment)}</div>
      <div>Projection Period: ${months} months</div>
      <hr class="hr"/>
      <h3>Key Metrics</h3>
      <div>Ending Cash Balance: $${f(finalBalance)}</div>
      <div>Minimum Balance: $${f(minBalance)}</div>
      <div class="${inDefaultRisk ? 'red' : 'green'}">Affordability Status: ${inDefaultRisk ? 'AT RISK' : 'VIABLE'}</div>
      ${inDefaultRisk ? `<div class="muted">Critical Month: ${criticalMonth}</div>` : ''}
    `;
    const detailsHtml = `
      <div><b>Monthly Revenue:</b> $${f(revStart)}</div>
      <div><b>Revenue Growth:</b> ${(revGrowth * 100).toFixed(1)}%</div>
      <div><b>Gross Margin:</b> ${(margin * 100).toFixed(1)}%</div>
      <div><b>Fixed Costs:</b> $${f(fixedCosts)}</div>
      <div><b>Loan Term:</b> ${termYears} years</div>
      <div><b>Interest Rate:</b> ${(ratePct * 100).toFixed(2)}%</div>
      <div><b>Min Buffer:</b> $${f(minBuffer)}</div>
    `;
    writeResults('CASH FLOW & LOAN AFFORDABILITY', html, 'INPUT SUMMARY', detailsHtml, 'Results assume consistent revenue growth and fixed operating costs.');
  }

  function calcWorkingCapital() {
    const upfront = n(q('wc_upfront')?.value || 0);
    const burn = n(q('wc_burn')?.value || 0);
    const duration = n(q('wc_duration')?.value || 6);
    const upfrontPct = n(q('wc_upfront_pct')?.value || 100) / 100;
    const startCash = n(q('wc_startCash')?.value || 0);
    const milestones = getMilestones();

    if (!upfront || !burn) {
      alert('Please fill in Upfront Costs and Monthly Burn Rate.');
      return;
    }

    const upfrontImmediate = upfront * upfrontPct;
    const upfrontDeferred = upfront * (1 - upfrontPct);

    let balance = startCash + upfrontDeferred - upfrontImmediate;
    let minBalance = balance;
    let shortfallMonth = 0;

    for (let m = 1; m <= duration; m++) {
      balance -= burn;

      const msForMonth = milestones.find(ms => ms.month === m);
      if (msForMonth) balance += msForMonth.amount;

      if (balance < 0 && shortfallMonth === 0) shortfallMonth = m;
      if (balance < minBalance) minBalance = balance;
    }

    const needsWorkingCapital = balance < 0;
    const requiredLoan = needsWorkingCapital ? Math.abs(minBalance) + 50000 : 0;

    const html = `
      <h3>Working Capital Analysis</h3>
      <div>Project Duration: ${duration} months</div>
      <div>Total Costs: $${f(upfront + (burn * duration))}</div>
      <div>Revenue Milestones: ${milestones.length}</div>
      <hr class="hr"/>
      <h3>Cash Position</h3>
      <div>Ending Balance: $${f(balance)}</div>
      <div>Minimum Balance: $${f(minBalance)}</div>
      <div class="${needsWorkingCapital ? 'red' : 'green'}">Status: ${needsWorkingCapital ? 'WORKING CAPITAL REQUIRED' : 'SELF-FUNDED'}</div>
      ${needsWorkingCapital ? `<div>Recommended Loan: $${f(requiredLoan)}</div>` : ''}
      ${shortfallMonth > 0 ? `<div class="muted">Critical Month: ${shortfallMonth}</div>` : ''}
    `;
    const detailsHtml = `
      <div><b>Upfront Costs:</b> $${f(upfront)}</div>
      <div><b>Monthly Burn:</b> $${f(burn)}</div>
      <div><b>Duration:</b> ${duration} months</div>
      <div><b>Upfront Payable:</b> ${(upfrontPct * 100).toFixed(1)}%</div>
      <div><b>Starting Cash:</b> $${f(startCash)}</div>
      <div><b>Milestones:</b> ${milestones.length}</div>
    `;
    writeResults('WORKING CAPITAL ANALYSIS', html, 'INPUT SUMMARY', detailsHtml, 'Loan requirement based on cash flow gaps during project delivery.');
  }

  function calcDebtConsolidationRefi() {
    const debts = dc_collectDebts();
    if (debts.length === 0) {
      alert('Please add at least one debt to consolidate.');
      return;
    }

    const totalBal = dc_sumBalances();
    const newAmount = n(q('dc_new_amount')?.value || totalBal);
    const newRate = n(q('dc_new_rate')?.value || 10.5) / 100;
    const newTerm = n(q('dc_new_term')?.value || 7);
    const fees = n(q('dc_new_fees')?.value || 0);
    const financeFees = q('dc_finance_fees')?.checked || false;

    const loanAmountWithFees = financeFees ? newAmount + fees : newAmount;
    const newMonthly = pmtMonthly(loanAmountWithFees, newRate, newTerm);

    let beforeMonthly = 0;
    let beforeTotalInterest = 0;
    debts.forEach(d => {
      const monthly = pmtMonthly(d.bal, d.ratePct / 100, d.termYrs);
      beforeMonthly += monthly;
      const totalPaid = monthly * 12 * d.termYrs;
      beforeTotalInterest += totalPaid - d.bal;
    });

    const newTotalInterest = (newMonthly * 12 * newTerm) - loanAmountWithFees;
    const interestSaved = beforeTotalInterest - newTotalInterest;
    const monthlySaved = beforeMonthly - newMonthly;

    const html = `
      <h3>Current Debt Position</h3>
      <div>Total Debt: $${f(totalBal)}</div>
      <div>Current Monthly Repayment: $${f(beforeMonthly)}</div>
      <div>Total Interest (Current Path): $${f(beforeTotalInterest)}</div>
      <hr class="hr"/>
      <h3>New Consolidation Loan</h3>
      <div>Loan Amount: $${f(loanAmountWithFees)}</div>
      <div>Interest Rate: ${(newRate * 100).toFixed(2)}%</div>
      <div>Term: ${newTerm} years</div>
      <div>Monthly Payment: $${f(newMonthly)}</div>
      <div>Total Interest (New Loan): $${f(newTotalInterest)}</div>
      <hr class="hr"/>
      <h3>Savings</h3>
      <div class="big ${monthlySaved > 0 ? 'green' : 'red'}">Monthly Savings: $${f(monthlySaved)}</div>
      <div class="big ${interestSaved > 0 ? 'green' : 'red'}">Total Interest Saved: $${f(interestSaved)}</div>
    `;
    const detailsHtml = `
      <div><b>Debts to Consolidate:</b> ${debts.length}</div>
      <div><b>Total Current Debt:</b> $${f(totalBal)}</div>
      <div><b>New Loan Amount:</b> $${f(loanAmountWithFees)}</div>
      <div><b>New Interest Rate:</b> ${(newRate * 100).toFixed(2)}%</div>
      <div><b>New Loan Term:</b> ${newTerm} years</div>
      <div><b>Upfront Fees:</b> $${f(fees)}</div>
      <div><b>Finance Fees:</b> ${financeFees ? 'Yes' : 'No'}</div>
    `;
    writeResults('DEBT CONSOLIDATION & REFINANCING', html, 'INPUT SUMMARY', detailsHtml, 'Results show potential savings through debt consolidation. Final approval subject to credit assessment.');
  }

  function calcEquipmentTCO() {
    const assetCost = n(q('tco_assetCost')?.value || 0);
    const finAmount = n(q('tco_financeAmount')?.value || assetCost);
    const ratePct = n(q('tco_ratePct')?.value || 7.9) / 100;
    const termYears = n(q('tco_termYears')?.value || 5);
    const balloonPct = n(q('tco_balloonPct')?.value || 0);
    const operAnnual = n(q('tco_operAnnual')?.value || 0);
    const usefulLife = n(q('tco_usefulLife')?.value || 7);
    const residual = n(q('tco_residualValue')?.value || 0);
    const hoursPerYear = n(q('tco_hoursPerYear')?.value || 1200);
    const discountPct = n(q('tco_discountPct')?.value || 7) / 100;
    const compareCash = q('tco_compareCash')?.value === 'yes';

    if (!assetCost || !finAmount) {
      alert('Please fill in Asset Cost and Financing Amount.');
      return;
    }

    const deposit = assetCost - finAmount;
    const monthlyPayment = pmtBalloon(finAmount, ratePct, termYears, balloonPct);
    const balloonAmount = finAmount * (balloonPct / 100);

    const totalFinancePayments = monthlyPayment * 12 * termYears;
    const tcoFinanced = deposit + totalFinancePayments + (operAnnual * usefulLife) - residual;

    const tcoCash = assetCost + (operAnnual * usefulLife) - residual;

    const html = `
      <h3>Equipment Financing - Total Cost of Ownership</h3>
      <div>Asset Cost: $${f(assetCost)}</div>
      <div>Financing Amount: $${f(finAmount)}</div>
      <div>Monthly Payment: $${f(monthlyPayment)}</div>
      <div>Loan Term: ${termYears} years</div>
      ${balloonPct > 0 ? `<div>Balloon Payment: $${f(balloonAmount)}</div>` : ''}
      <hr class="hr"/>
      <h3>Total Cost of Ownership (Financed)</h3>
      <div>Deposit: $${f(deposit)}</div>
      <div>Total Loan Payments: $${f(totalFinancePayments)}</div>
      <div>Operating Costs (${usefulLife} years): $${f(operAnnual * usefulLife)}</div>
      <div>Residual Value: $${f(residual)}</div>
      <div class="big">Total TCO (Financed): $${f(tcoFinanced)}</div>
      ${compareCash ? `
        <hr class="hr"/>
        <h3>Total Cost of Ownership (Cash Purchase)</h3>
        <div>Purchase Price: $${f(assetCost)}</div>
        <div>Operating Costs: $${f(operAnnual * usefulLife)}</div>
        <div>Residual Value: $${f(residual)}</div>
        <div class="big">Total TCO (Cash): $${f(tcoCash)}</div>
        <hr class="hr"/>
        <div class="muted">Financing Advantage: $${f(Math.abs(tcoFinanced - tcoCash))}</div>
      ` : ''}
    `;
    const detailsHtml = `
      <div><b>Asset Cost:</b> $${f(assetCost)}</div>
      <div><b>Financing Amount:</b> $${f(finAmount)}</div>
      <div><b>Interest Rate:</b> ${(ratePct * 100).toFixed(2)}%</div>
      <div><b>Loan Term:</b> ${termYears} years</div>
      <div><b>Balloon:</b> ${balloonPct}%</div>
      <div>Operating Costs: $${f(operAnnual)}/year</div>
      <div><b>Useful Life:</b> ${usefulLife} years</div>
      <div><b>Residual Value:</b> $${f(residual)}</div>
    `;
    writeResults('EQUIPMENT FINANCING & TCO ANALYSIS', html, 'INPUT SUMMARY', detailsHtml, 'TCO comparison to support equipment financing decisions. Residual value is estimated.');
  }

  function calcCommercialPropertyAnalysis() {
    const price = n(q('cpi_price')?.value || 0);
    const costs = n(q('cpi_costs')?.value || 0);
    const reno = n(q('cpi_reno')?.value || 0);
    const rent = n(q('cpi_rent')?.value || 0);
    const vacancy = n(q('cpi_vacancyPct')?.value || 8) / 100;
    const rentGrowth = n(q('cpi_rentGrowth')?.value || 2) / 100;
    const valueGrowth = n(q('cpi_valueGrowth')?.value || 2.5) / 100;

    const rates = n(q('cpi_exp_rates')?.value || 0);
    const water = n(q('cpi_exp_water')?.value || 0);
    const ins = n(q('cpi_exp_ins')?.value || 0);
    const mgmtPct = n(q('cpi_mgmtPct')?.value || 6) / 100;
    const repairs = n(q('cpi_exp_repairs')?.value || 0);
    const other = n(q('cpi_exp_other')?.value || 0);
    const expGrowth = n(q('cpi_expGrowth')?.value || 2) / 100;

    const loan = n(q('cpi_loan')?.value || 0);
    const lvrInput = n(q('cpi_lvr')?.value || 0);
    const ratePct = n(q('cpi_ratePct')?.value || 7.25) / 100;
    const termYears = n(q('cpi_termYears')?.value || 25);

    if (!price || !rent) {
      alert('Please fill in Purchase Price and Annual Gross Rent.');
      return;
    }

    const totalInvestment = price + costs + reno;
    const lvr = loan > 0 ? (loan / price) * 100 : 0;
    const equity = totalInvestment - loan;

    const loanPayment = loan > 0 ? pmtMonthly(loan, ratePct, termYears) : 0;
    const grossRent = rent * 12 * (1 - vacancy);
    const mgmt = grossRent * mgmtPct;
    const totalExp = (rates + water + ins + repairs + other) * 12 + mgmt;
    const noi = grossRent - totalExp;
    const cashFlow = (noi / 12) - loanPayment;
    const dscr = loanPayment > 0 ? (noi / 12) / loanPayment : 0;

    const cap = noi / price;

    const html = `
      <h3>Investment Summary</h3>
      <div>Purchase Price: $${f(price)}</div>
      <div>Purchase Costs: $${f(costs)}</div>
      <div>Renovation: $${f(reno)}</div>
      <div>Total Investment: $${f(totalInvestment)}</div>
      <hr class="hr"/>
      <h3>Financing</h3>
      <div>Loan Amount: $${f(loan)}</div>
      <div>LVR: ${Math.round(lvr * 10) / 10}%</div>
      <div>Interest Rate: ${(ratePct * 100).toFixed(2)}%</div>
      <div>Monthly Loan Payment: $${f(loanPayment)}</div>
      <hr class="hr"/>
      <h3>Annual Income & Expenses</h3>
      <div>Gross Annual Rent: $${f(rent * 12)}</div>
      <div>Vacancy Rate: ${(vacancy * 100).toFixed(1)}%</div>
      <div>Net Rental Income: $${f(grossRent)}</div>
      <div>Operating Expenses: $${f(totalExp)}</div>
      <div>Net Operating Income (NOI): $${f(Math.abs(noi))}</div>
      <hr class="hr"/>
      <h3>Key Metrics</h3>
      <div>Monthly Cash Flow: $${f(Math.abs(cashFlow))}</div>
      <div>Annual Cash Flow: $${f(Math.abs(cashFlow * 12))}</div>
      <div>Cap Rate: ${(cap * 100).toFixed(2)}%</div>
      <div>DSCR: ${(dscr * 100).toFixed(1)}%</div>
      <div class="${dscr >= 1.2 ? 'green' : dscr >= 1.0 ? '' : 'red'}">Lender Acceptability: ${dscr >= 1.2 ? 'STRONG' : dscr >= 1.0 ? 'MARGINAL' : 'WEAK'}</div>
    `;
    const detailsHtml = `
      <div><b>Purchase Price:<b/> $${f(price)}</div>
      <div><b>Annual Gross Rent:</b> $${f(rent * 12)}</div>
      <div><b>Vacancy Rate:</b> ${(vacancy * 100).toFixed(1)}%</div>
      <div><b>Operating Expenses:</b> $${f(totalExp)}</div>
      <div><b>Loan Amount:</b> $${f(loan)}</div>
      <div><b>LVR:</b> ${Math.round(lvr * 10) / 10}%</div>
      <div><b>Interest Rate:</b> ${(ratePct * 100).toFixed(2)}%</div>
      <div><b>Loan Term:</b> ${termYears} years</div>
      <div><b>Purchase Costs:</b> $${f(costs)}</div>
      <div><b>Renovation:</b> $${f(reno)}</div>
    `;
    writeResults('COMMERCIAL PROPERTY INVESTMENT ANALYSIS', html, 'INPUT SUMMARY', detailsHtml, 'Analysis is preliminary. Final lending decision based on property valuation, lease documentation, and full lender assessment.');
  }

  function performFinancialCalculation(tool) {
    switch (tool) {
      case 'lease_vs_buy': return calcLeaseVsBuy();
      case 'cashflow_affordability': return calcCashflowAffordability();
      case 'working_capital': return calcWorkingCapital();
      case 'debt_consolidation_refi': return calcDebtConsolidationRefi();
      case 'equipment_tco': return calcEquipmentTCO();
      case 'commercial_property_analysis': return calcCommercialPropertyAnalysis();
    }
  }

  // Make available to global auto-recalc engine
  window.performFinancialCalculation = performFinancialCalculation;
  window.performCommercialFinancialRecalc = function() {
    const tool = document.getElementById('loanPurpose')?.value;
    if (tool) performFinancialCalculation(tool);
  };
  window.getActiveFinancialTool = function() {
    return document.getElementById('loanPurpose')?.value || '';
  };
})();