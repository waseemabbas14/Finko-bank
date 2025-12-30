// smsf_financial.js
// REFACTORED: Uses the existing #loanPurpose dropdown for SMSF Financial calculators (no extra dropdowns)
// - When SMSF -> Financial is selected, we populate #loanPurpose with the 6 SMSF tools
// - Inputs render into #dynamicFields
// - Main Calculate button is used (we intercept form submit to run the selected financial calc)
// - NEW (Docs 1-6):
//   * Per-tool summary/disclaimer copy updates
//   * Dynamic reactivity via global auto-recalc already present (ui.js); Calculate button always triggers
//   * Property Analysis inputs reorganised into 5 clear sections incl. LRBA Trustee Fee
//   * In-Specie: Bidirectional LVR <-> Loan sync + >70% LVR warning

(function() {
  const q = (id) => document.getElementById(id);
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts || false);

  const has = {
    num: typeof window.num === 'function',
    fmt: typeof window.fmt === 'function',
    calcMonthlyRepayment: typeof window.calcMonthlyRepayment === 'function',
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
    if (has.calcMonthlyRepayment) return window.calcMonthlyRepayment(P, annualRate, years);
    const r = annualRate / 12, n = years * 12;
    if (annualRate === 0) return n === 0 ? 0 : P / n;
    return P * r / (1 - Math.pow(1 + r, -n));
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

  // Per-tool copy from docs
  const COPY = {
    smsf_borrowing_power: {
      summary: "You are using an SMSF financial calculator to estimate your potential LRBA borrowing capacity. The results are indicative and intended for guidance only. Please consult a qualified SMSF specialist before making any decisions.",
      disclaimer: "You are using an SMSF financial calculator to estimate your potential LRBA borrowing capacity. The results are indicative and intended for guidance only. Please consult a qualified SMSF specialist before making any decisions."
    },
    smsf_property_analysis: {
      summary: "You are using an SMSF financial calculator to assess property investment options through an LRBA. The results provided are estimates intended for general guidance. It is recommended to seek advice from an SMSF specialist before making any decisions.",
      disclaimer: "You are using an SMSF financial calculator to assess property investment options through an LRBA. The results provided are estimates intended for general guidance. It is recommended to seek advice from an SMSF specialist before making any decisions."
    },
    smsf_vs_personal: {
      summary: "You are using an SMSF financial calculator to estimate and compare potential outcomes for SMSF and personal investments. The results provided in this tool are for general guidance purposes only and do not constitute financial advice. You should seek independent specialist SMSF advice before making any investment decisions.",
      disclaimer: "You are using an SMSF financial calculator to estimate and compare potential outcomes for SMSF and personal investments. The results provided in this tool are for general guidance purposes only and do not constitute financial advice. You should seek independent specialist SMSF advice before making any investment decisions."
    },
    smsf_repayment_projector: {
      summary: "You are using an SMSF financial calculator to estimate how long it may take to pay off your loan based on the information you provide. The calculator is designed to give you an approximate indication only and should not be relied upon for financial decisions. It is recommended that you seek professional SMSF advice to assess your personal circumstances before proceeding with any financial plans.",
      disclaimer: "You are using an SMSF financial calculator to estimate how long it may take to pay off your loan based on the information you provide. The calculator is designed to give you an approximate indication only and should not be relied upon for financial decisions. It is recommended that you seek professional SMSF advice to assess your personal circumstances before proceeding with any financial plans."
    },
    smsf_refi_equity: {
      summary: "You are using an SMSF financial calculator to estimate your loan payoff period. The results are for guidance only. You should seek professional SMSF advice before making any financial decisions.",
      disclaimer: "You are using an SMSF financial calculator to estimate your loan payoff period. The results are for guidance only. You should seek professional SMSF advice before making any financial decisions."
    },
    smsf_in_specie: {
      summary: "You are using an SMSF financial calculator to explore the possibility of a commercial property transfer in your SMSF. Transferring a commercial property into an SMSF is a complex strategy with significant legal and tax implications. These results are for informational purposes only and do not constitute financial advice. We strongly recommend you seek specialist SMSF advice before acting on these results.",
      disclaimer: "You are using an SMSF financial calculator to explore the possibility of a commercial property transfer in your SMSF. Transferring a commercial property into an SMSF is a complex strategy with significant legal and tax implications. These results are for informational purposes only and do not constitute financial advice. We strongly recommend you seek specialist SMSF advice before acting on these results."
    }
  };

  const state = { mounted: false, lpChangeHandler: null, formSubmitHandler: null };

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
    lp.innerHTML = '';
    const opts = [
      { v: '', t: 'Select SMSF Decision Analysis' },
      { v: 'smsf_borrowing_power', t: 'SMSF Borrowing Power (LRBA)' },
      { v: 'smsf_property_analysis', t: 'SMSF Property Investment Analysis' },
      { v: 'smsf_vs_personal', t: 'SMSF vs Personal Investment Comparison' },
      { v: 'smsf_repayment_projector', t: 'SMSF Loan Repayment Projector' },
      { v: 'smsf_refi_equity', t: 'SMSF Loan Refinancing & Equity Release' },
      { v: 'smsf_in_specie', t: 'SMSF Commercial Property In-Specie Transfer' }
    ];
    opts.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.v; opt.textContent = o.t;
      lp.appendChild(opt);
    });
  }

  function onLoanPurposeChange(e) {
    const val = e.target.value;
    renderSMSFToolFields(val);
  }

 function onFormSubmitIntercept(e) {
  const cat = q('loanCategory')?.value;
  const mode = q('smsfCalculatorType')?.value;
  if (cat === 'smsf' && mode === 'financial') {
    const tool = q('loanPurpose')?.value || '';
    if (!tool) {
      e.preventDefault(); e.stopImmediatePropagation();
      alert('Please select an SMSF Decision Analysis calculator from the Loan Purpose dropdown.');
      return;
    }
    e.preventDefault(); e.stopImmediatePropagation();
    performSMSFFinancialCalculation(tool); // Yeh line execute honi chahiye
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

    state.lpChangeHandler = onLoanPurposeChange;
    on(lp, 'change', state.lpChangeHandler);

    state.formSubmitHandler = onFormSubmitIntercept;
    on(form, 'submit', state.formSubmitHandler, true);

    state.mounted = true;
  }

  function unmount() {
    if (!state.mounted) return;
    const lp = q('loanPurpose');
    const form = q('loanForm');
    if (lp && state.lpChangeHandler) lp.removeEventListener('change', state.lpChangeHandler);
    if (form && state.formSubmitHandler) form.removeEventListener('submit', state.formSubmitHandler, true);
    q('dynamicFields') && (q('dynamicFields').innerHTML = '');
    state.lpChangeHandler = null;
    state.formSubmitHandler = null;
    state.mounted = false;
  }
  
  window.mountSMSFFinancialMode = mount;
  window.unmountSMSFFinancialMode = unmount;

  // Helpers
  function dispatchInput(el) {
    try { el && el.dispatchEvent(new Event('input', { bubbles: true })); } catch(e) {}
    try { el && el.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
  }

  // Attach auto-recalc listeners for any inputs/selects rendered into #dynamicFields
  function attachSmsfAutoRecalcListeners() {
    const scheduleRecalc = () => {
      if (!window.hasCalculated) return;
      try { if (window.__smsfRecalcTimer) clearTimeout(window.__smsfRecalcTimer); } catch (e) {}
      window.__smsfRecalcTimer = setTimeout(() => {
        try {
          window.isAutoRecalc = true;
          if (typeof handleFormSubmit === 'function') handleFormSubmit();
          window.isAutoRecalc = false;
        } catch (err) { console.error('SMSF auto-recalc error:', err); }
      }, 300);
    };

    const host = q('dynamicFields');
    if (!host) return;
    const els = host.querySelectorAll('input, select');
    els.forEach(el => {
      el.removeEventListener('change', scheduleRecalc);
      el.removeEventListener('input', scheduleRecalc);
      el.addEventListener('change', scheduleRecalc);
      el.addEventListener('input', scheduleRecalc);
    });
  }

  // In-Specie LVR <-> Loan sync with 70% warning
  function attachInSpecieLVRSync() {
    const valEl = q('is_value');
    const lvrEl = q('is_lvrPct');
    const loanEl = q('is_loan');
    const warnEl = q('is_lvrWarning');

    if (!valEl || !lvrEl || !loanEl) return;

    const updateWarning = (lvrPct) => {
      if (!warnEl) return;
      const tooHigh = lvrPct > 70;
      warnEl.style.display = tooHigh ? 'block' : 'none';
      if (tooHigh) {
        warnEl.innerText = 'Warning: The entered loan amount exceeds a 70% Loan-to-Value Ratio (LVR). Lenders typically have stricter conditions for high LVR commercial loans.';
      }
    };

    const fromLoan = () => {
      const pv = n(valEl.value);
      const la = n(loanEl.value);
      const lvr = pv > 0 ? (la / pv) * 100 : 0;
      if (!isNaN(lvr) && lvr >= 0) {
        lvrEl.value = Math.round(lvr);
        updateWarning(lvr);
        dispatchInput(lvrEl);
      }
    };

    const fromLVR = () => {
      const pv = n(valEl.value);
      let lvr = parseFloat(lvrEl.value || '0');
      if (lvr > 100) lvr = 100;
      if (pv > 0 && lvr >= 0) {
        const la = pv * (lvr / 100);
        loanEl.value = f(Math.round(la), 0);
        updateWarning(lvr);
        dispatchInput(loanEl);
      }
    };

    const fromValue = () => {
      // Recompute LVR from current loan
      fromLoan();
    };

    on(loanEl, 'input', fromLoan);
    on(lvrEl, 'input', fromLVR);
    on(valEl, 'input', fromValue);

    // Initial sync
    fromLoan();
  }

  function renderSMSFToolFields(tool) {
    const host = q('dynamicFields');
    if (!host) return;
    let html = '';

    switch (tool) {
      case 'smsf_borrowing_power':
        html = `
          <div class="row cols-2">
            <label>Total SMSF Balance
              <input type="text" id="sb_totalBalance" placeholder="e.g. 600,000">
            </label>
            <label>Liquid Assets (cash/shares)
              <input type="text" id="sb_liquid" placeholder="e.g. 150,000">
            </label>
          </div>
          <div class="row cols-3">
            <label>Concessional Contributions (p.a.)
              <input type="text" id="sb_conc" value="27,500">
            </label>
            <label>Non-Concessional (p.a.)
              <input type="text" id="sb_nonconc" value="0">
            </label>
            <label>Estimated Rental Income (p.a.)
              <input type="text" id="sb_rent" placeholder="e.g. 45,000">
            </label>
          </div>
          <div class="row cols-3">
            <label>Net Operating Surplus (p.a.)
              <input type="text" id="sb_surplus" value="0">
            </label>
            <label>Interest Rate (% p.a.)
              <input type="number" id="sb_ratePct" step="0.01" value="7.20">
            </label>
            <label>Loan Term (years)
              <input type="number" id="sb_termYears" min="1" max="25" step="1" value="20">
            </label>
          </div>
          <div class="row cols-3">
            <label>Target LVR (%)
              <input type="number" id="sb_lvrPct" min="50" max="70" step="1" value="70">
            </label>
            <label>DSCR Requirement
              <input type="number" id="sb_dscr" min="1.1" max="2.0" step="0.05" value="1.30">
            </label>
            <label>Notes
              <input type="text" disabled value="Borrowing power = min(Serviceability, LVR limit)">
            </label>
          </div>
        `;
        break;

      case 'smsf_property_analysis':
        // Reorganised per 2.1 spec: five sections + LRBA Trustee Fee
        html = `
          <div class="step-title">Section 1: Property Purchase & Costs</div>
          <div class="row cols-3">
            <label>Property Purchase Price
              <input type="text" id="pa_price" placeholder="e.g. 800,000">
            </label>
            <label>Stamp Duty & Purchase Costs
              <input type="text" id="pa_costs" value="40,000">
            </label>
            <label>Initial Renovation Cost (if any)
              <input type="text" id="pa_reno" value="0">
            </label>
          </div>

          <div class="step-title">Section 2: Rental Income & Growth</div>
          <div class="row cols-3">
            <label>Annual Gross Rent
              <input type="text" id="pa_rent" placeholder="e.g. 52,000">
            </label>
            <label>Vacancy Rate (%)
              <input type="number" id="pa_vacancy" step="0.1" value="4.0">
            </label>
            <label>Annual Rental Growth (%)
              <input type="number" id="pa_rentGrowth" step="0.1" value="2.5">
            </label>
          </div>

          <div class="step-title">Section 3: SMSF-Specific Operating Expenses</div>
          <div class="row cols-3">
            <label>Council Rates (p.a.)
              <input type="text" id="pa_rates" value="3,500">
            </label>
            <label>Water Charges (p.a.)
              <input type="text" id="pa_water" value="1,200">
            </label>
            <label>Insurance (p.a.)
              <input type="text" id="pa_ins" value="2,800">
            </label>
          </div>
          <div class="row cols-3">
            <label>Property Management Fees (%)
              <input type="number" id="pa_mgmtPct" step="0.1" value="6.5">
            </label>
            <label>Repairs & Maintenance (p.a.)
              <input type="text" id="pa_repairs" value="4,000">
            </label>
            <label>SMSF Admin & Audit Fees (p.a.)
              <input type="text" id="pa_smsfFees" value="3,500">
            </label>
          </div>
          <div class="row cols-2">
            <label>LRBA Trustee Fee (p.a.)
              <input type="text" id="pa_lrbaFee" value="1,000">
            </label>
          </div>

          <div class="step-title">Section 4: SMSF Financing (LRBA)</div>
          <div class="row cols-3">
            <label>SMSF Loan Amount
              <input type="text" id="pa_loan" placeholder="e.g. 480,000">
            </label>
            <label>Interest Rate (% p.a.)
              <input type="number" id="pa_ratePct" step="0.01" value="7.0">
            </label>
            <label>Loan Term (Years)
              <input type="number" id="pa_termYears" min="1" max="30" step="1" value="20">
            </label>
          </div>

          <div class="step-title">Section 5: Assumptions</div>
          <div class="row cols-3">
            <label>Estimated Annual Capital Growth (%)
              <input type="number" id="pa_growth" step="0.1" value="4.0">
            </label>
            <label>SMSF Tax Rate on Earnings (%)
              <input type="number" id="pa_taxRate" step="0.1" value="15.0">
            </label>
            <label>Depreciation (p.a., optional)
              <input type="text" id="pa_depr" value="0">
            </label>
          </div>
          <div class="row cols-2">
            <label>Projection Horizon (years)
              <input type="number" id="pa_horizon" min="1" max="20" step="1" value="10">
            </label>
          </div>
        `;
        break;

      case 'smsf_vs_personal':
        html = `
          <div class="row cols-3">
            <label>Purchase Price
              <input type="text" id="sp_price" value="800,000">
            </label>
            <label>Annual Gross Rent (Yr 1)
              <input type="text" id="sp_rent" value="48,000">
            </label>
            <label>Annual Rent Growth (%)
              <input type="number" id="sp_rentGrowth" step="0.1" value="2.5">
            </label>
          </div>
          <div class="row cols-3">
            <label>Operating Expenses (p.a.)
              <input type="text" id="sp_exp" value="15,000">
            </label>
            <label>Loan Amount
              <input type="text" id="sp_loan" value="500,000">
            </label>
            <label>Interest Rate (% p.a.)
              <input type="number" id="sp_ratePct" step="0.01" value="6.5">
            </label>
          </div>
          <div class="row cols-3">
            <label>Loan Term (years)
              <input type="number" id="sp_termYears" min="1" max="30" step="1" value="25">
            </label>
            <label>Holding Period (years)
              <input type="number" id="sp_holdYears" min="1" max="30" step="1" value="15">
            </label>
            <label>Capital Growth (% p.a.)
              <input type="number" id="sp_growth" step="0.1" value="4.0">
            </label>
          </div>
          <div class="row cols-3">
            <label>Purchase Costs (Stamp Duty etc.)
              <input type="text" id="sp_costs" value="40,000">
            </label>
            <label>Depreciation (p.a.)
              <input type="text" id="sp_depr" value="10,000">
            </label>
            <label>SMSF Fees (p.a.)
              <input type="text" id="sp_smsfFees" value="3,000">
            </label>
          </div>
          <div class="row cols-3">
            <label>SMSF Tax Rate (%)
              <input type="number" id="sp_smsfTax" step="0.1" value="15">
            </label>
            <label>SMSF CGT Rate (% in pension)
              <input type="number" id="sp_smsfCGT" step="0.1" value="10">
            </label>
            <label>Personal MTR (%)
              <input type="number" id="sp_mtr" step="0.1" value="45">
            </label>
          </div>
          <div class="row cols-2">
            <label>Personal Other Deductible Expenses (p.a.)
              <input type="text" id="sp_personalOther" value="0">
            </label>
          </div>
        `;
        break;

      case 'smsf_repayment_projector':
        html = `
          <div class="row cols-3">
            <label>Outstanding Loan Balance
              <input type="text" id="rp_balance" value="450,000">
            </label>
            <label>Interest Rate (% p.a.)
              <input type="number" id="rp_ratePct" step="0.01" value="6.8">
            </label>
            <label>Remaining Term (years)
              <input type="number" id="rp_termYears" min="1" max="30" step="1" value="22">
            </label>
          </div>
          <div class="row cols-3">
            <label>Concessional Contributions (p.a.)
              <input type="text" id="rp_conc" value="27,500">
            </label>
            <label>Non-Concessional (p.a.)
              <input type="text" id="rp_nonconc" value="20,000">
            </label>
            <label>Net Rental Income (after property expenses)
              <input type="text" id="rp_netRent" value="25,000">
            </label>
          </div>
          <div class="row cols-3">
            <label>Other Fund Income (p.a.)
              <input type="text" id="rp_other" value="5,000">
            </label>
            <label>Admin Fees (p.a.)
              <input type="text" id="rp_admin" value="3,000">
            </label>
              <label>Base Repayment
              <select id="rp_base">
                <option value="">Base Repayment</option>
                <option value="pni">P&I for full term</option>
                <option value="io">Interest-Only for X years, then P&I</option>
              </select>
            </label>
          </div>
          <div class="row cols-3">
            <label>IO Period (years, if IO)
              <input type="number" id="rp_ioYears" min="0" max="10" step="1" value="0">
            </label>
            <label>Use Surplus for Extra Repayments?
              <select id="rp_useSurplus">
                <option value="">Use Surplus for Extra Repayments?</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label>Additional Annual Contribution (What-If)
              <input type="text" id="rp_extra" value="0">
            </label>
          </div>
          <div class="row cols-1">
            <div class="muted">Projection uses dynamic annual amortisation adding surplus income to principal each year.</div>
          </div>
        `;
        break;

      case 'smsf_refi_equity':
        html = `
          <div class="row">
            <label>Mode
              <select id="re_mode">
                <option value="refi">Refinance Existing Loan</option>
                <option value="equity">Access Equity for Reinvestment</option>
              </select>
            </label>
          </div>

          <div id="re_refi_fields">
            <div class="row cols-3">
              <label>Current Balance
                <input type="text" id="re_curBal" value="400,000">
              </label>
              <label>Current Rate (% p.a.)
                <input type="number" id="re_curRate" step="0.01" value="7.5">
              </label>
              <label>Remaining Term (years)
                <input type="number" id="re_curTerm" min="1" max="30" step="1" value="20">
              </label>
            </div>
            <div class="row cols-3">
              <label>New Loan Amount
                <input type="text" id="re_newAmt" value="400,000">
              </label>
              <label>New Rate (% p.a.)
                <input type="number" id="re_newRate" step="0.01" value="6.2">
              </label>
              <label>New Term (years)
                <input type="number" id="re_newTerm" min="1" max="30" step="1" value="20">
              </label>
            </div>
            <div class="row cols-2">
              <label>New Loan Fees
                <input type="text" id="re_fees" value="2,000">
              </label>
            </div>
          </div>

          <div id="re_equity_fields" style="display:none;">
            <div class="row cols-3">
              <label>Property Market Value
                <input type="text" id="re_propVal" value="900,000">
              </label>
              <label>Current Loan Balance
                <input type="text" id="re_curBal2" value="400,000">
              </label>
              <label>Max LVR (%)
                <input type="number" id="re_maxLvr" step="1" value="70">
              </label>
            </div>
            <div class="row cols-3">
              <label>New Rate (% p.a.)
                <input type="number" id="re_newRate2" step="0.01" value="6.2">
              </label>
              <label>New Term (years)
                <input type="number" id="re_newTerm2" min="1" max="30" step="1" value="20">
              </label>
              <label>Purpose
                <select id="re_purpose">
                  <option>Purchase New Asset</option>
                  <option>Fund Improvements</option>
                  <option>Consolidate Debt</option>
                </select>
              </label>
            </div>
          </div>
        `;
        break;

      case 'smsf_in_specie':
        html = `
          <div class="row cols-3">
            <label>Property Market Value
              <input type="text" id="is_value" value="1,000,000">
            </label>
            <label>Original Cost Base
              <input type="text" id="is_costBase" value="600,000">
            </label>
            <label>Outstanding Personal Loan (if any)
              <input type="text" id="is_oldLoan" value="300,000">
            </label>
          </div>
          <div class="row cols-3">
            <label>SMSF Total Balance
              <input type="text" id="is_fundBal" value="400,000">
            </label>
            <label>Available NCC Cap
              <input type="text" id="is_nccCap" value="330,000">
            </label>
            <label>Assumed LRBA LVR (%)
              <input type="number" id="is_lvrPct" step="1" value="50">
            </label>
          </div>
          <div class="row cols-3">
            <label>LRBA Loan Amount (suggested)
              <input type="text" id="is_loan" value="500,000">
            </label>
            <label>SMSF Cash to Use
              <input type="text" id="is_smsfCash" value="170,000">
            </label>
            <label>In-Specie Contribution
              <input type="text" id="is_inSpecie" value="330,000">
            </label>
          </div>
          <div class="row">
            <div id="is_lvrWarning" class="alert" style="display:none;"></div>
          </div>
          <div class="row cols-3">
            <label>Stamp Duty Rate (%)
              <input type="number" id="is_dutyRate" step="0.1" value="5.0">
            </label>
            <label>Member Marginal Tax Rate (%)
              <input type="number" id="is_mtr" step="0.1" value="47.0">
            </label>
            <label>Legal & Setup Fees
              <input type="text" id="is_legal" value="10,000">
            </label>
          </div>
          <div class="row cols-1">
            <div class="muted">Funding check: Price = LRBA Loan + In-Specie Contribution + SMSF Cash.</div>
          </div>
        `;
        break;

      default:
        html = '';
    }

    host.innerHTML = html;

    // Attach SMSF auto-recalc listeners to new fields
    attachSmsfAutoRecalcListeners();

    // Mode toggles and extra wiring
    if (tool === 'smsf_refi_equity') {
      const modeSel = q('re_mode');
      const refi = q('re_refi_fields');
      const eq = q('re_equity_fields');
      on(modeSel, 'change', function() {
        const isRefi = this.value === 'refi';
        if (refi) refi.style.display = isRefi ? 'block' : 'none';
        if (eq) eq.style.display = isRefi ? 'none' : 'block';
        dispatchInput(modeSel);
      });
      // Ensure Purpose change triggers recalculation and shows in results
      const purposeSel = q('re_purpose');
      if (purposeSel) on(purposeSel, 'change', () => dispatchInput(purposeSel));
    }

    if (tool === 'smsf_in_specie') {
      attachInSpecieLVRSync();
    }

    setTimeout(() => { if (has.setupNumberFormatting) window.setupNumberFormatting(); }, 50);
  }

  function writeResults(header, html, detailsTitle, detailsHtml, disclaimerText, summaryText) {
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
      discEl.innerText = disclaimerText || "Disclaimer: Results are indicative only and based on the information provided. SMSF strategies require independent legal, tax and financial advice.";
    }

    const summaryEl = q('summary');
    if (summaryEl) {
      const copy = summaryText || "You are using an SMSF Financial calculator. Results are estimates for guidance. Seek specialist SMSF advice before acting.";
      summaryEl.innerHTML = `<h2 class="col-title">SUMMARY</h2><p class="muted" style="white-space:pre-line">${copy}</p>`;
    }

    // Flip to front to show results
    try { 
      if (window.dashboardFlip && typeof window.dashboardFlip.showFront === 'function') {
        window.dashboardFlip.showFront();
      }
    } catch(e) {}
  }

  // Calculators
  function pvFromAnnualPayment(annualRate, years, annualPayment) {
    const r = annualRate / 12, n = years * 12, pmt = annualPayment / 12;
    if (r === 0) return pmt * n;
    return pmt * (1 - Math.pow(1 + r, -n)) / r;
  }

  function calcSMSFBorrowingPower() {
    const totalBal = n(q('sb_totalBalance').value);
    const liquid = n(q('sb_liquid').value);
    const conc = n(q('sb_conc').value);
    const nonconc = n(q('sb_nonconc').value);
    const rent = n(q('sb_rent').value);
    const surplus = n(q('sb_surplus').value);
    const ratePct = parseFloat(q('sb_ratePct').value || '0');
    const termYears = n(q('sb_termYears').value);
    const lvrPct = parseFloat(q('sb_lvrPct').value || '0');
    const dscr = parseFloat(q('sb_dscr').value || '1.3');

    const maxAnnualDebtService = (rent + surplus) / (dscr > 0 ? dscr : 1.3);
    const loanByServiceability = pvFromAnnualPayment(ratePct/100, termYears, maxAnnualDebtService);
    const loanByLVR = (1 - (lvrPct/100)) === 0 ? 0 : (liquid / (1 - (lvrPct/100))) * (lvrPct/100);
    const borrowingPower = Math.max(0, Math.min(loanByServiceability, loanByLVR));
    const impliedMaxProperty = (lvrPct > 0) ? (borrowingPower / (lvrPct/100)) : 0;

    const resultsHTML = `
      <h3>Estimated Borrowing Power</h3>
      <div class="big">$${f(Math.round(borrowingPower))}</div>
      <div>Implied Max Property (at ${lvrPct.toFixed(0)}% LVR): $${f(Math.round(impliedMaxProperty))}</div>
      <hr class="hr"/>
      <div>By Serviceability (DSCR ${dscr.toFixed(2)}): $${f(Math.round(loanByServiceability))}</div>
      <div>By LVR (Liquid assets constraint): $${f(Math.round(loanByLVR))}</div>
    `;
    const detailsHTML = `
      <div>Total SMSF Balance: $${f(totalBal)} | Liquid Assets: $${f(liquid)}</div>
      <div>Contributions p.a.: $${f(conc)} + $${f(nonconc)} | Rent: $${f(rent)} | Surplus: $${f(surplus)}</div>
      <div>Rate: ${ratePct.toFixed(2)}% | Term: ${termYears} yrs | Target LVR: ${lvrPct.toFixed(0)}%</div>
    `;
    writeResults(
      'SMSF BORROWING POWER (LRBA) - RESULTS',
      resultsHTML,
      'INPUT SUMMARY',
      detailsHTML,
      COPY.smsf_borrowing_power.disclaimer,
      COPY.smsf_borrowing_power.summary
    );
  }

  function calcSMSFPropertyAnalysis() {
    const price = n(q('pa_price').value);
    const costs = n(q('pa_costs').value);
    const reno = n(q('pa_reno').value);
    const rent = n(q('pa_rent').value);
    const vacancyPct = parseFloat(q('pa_vacancy').value || '0')/100;
    const rentGrowth = parseFloat(q('pa_rentGrowth').value || '0')/100;

    const rates = n(q('pa_rates').value);
    const water = n(q('pa_water').value);
    const ins = n(q('pa_ins').value);
    const mgmtPct = parseFloat(q('pa_mgmtPct').value || '0')/100;
    const repairs = n(q('pa_repairs').value);
    const smsfFees = n(q('pa_smsfFees').value);
    const lrbaFee = n(q('pa_lrbaFee').value);

    const loan = n(q('pa_loan').value);
    const ratePct = parseFloat(q('pa_ratePct').value || '0');
    const termYears = n(q('pa_termYears').value);
    const growthPct = parseFloat(q('pa_growth').value || '0')/100;
    const taxRate = parseFloat(q('pa_taxRate').value || '15')/100;
    const depr = n(q('pa_depr').value);
    const horizon = n(q('pa_horizon').value);

    const vacancy = rent * vacancyPct;
    const mgmt = rent * mgmtPct;
    const opEx = rates + water + ins + repairs + mgmt + vacancy; // property-level expenses
    const noi = Math.max(0, rent - opEx);

    const grossYield = price > 0 ? (rent / price * 100) : 0;
    const netYield = price > 0 ? (noi / price * 100) : 0;

    const annualInterestY1 = amortYearInterestTotal(loan, ratePct, termYears)[0] || (loan * (ratePct/100));
    const annualPmt = pmtMonthly(loan, ratePct/100, termYears) * 12;

    const smsfFeesTotal = smsfFees + lrbaFee; // treat LRBA trustee fee as ongoing SMSF-level cost
    const taxableIncome = noi - annualInterestY1 - depr - smsfFeesTotal;
    const taxPaid = taxableIncome > 0 ? taxableIncome * taxRate : 0;
    const taxSaving = taxableIncome < 0 ? (-taxableIncome) * taxRate : 0;
    const netCashFlowY1 = noi - annualPmt - smsfFeesTotal - taxPaid + taxSaving;

    let propertyValue = price + costs + reno;
    let bal = loan;
    const r = ratePct/100;
    const monthly = pmtMonthly(loan, r, termYears);
    for (let y=1; y<=horizon; y++) {
      propertyValue *= (1 + growthPct);
      for (let m=1; m<=12; m++) {
        const interest = bal * (r/12);
        const principal = Math.max(0, monthly - interest);
        bal = Math.max(0, bal - principal);
        if (bal <= 0) break;
      }
      if (bal <= 0) break;
    }
    const equity = propertyValue - bal;

    const resultsHTML = `
      <h3>Key Metrics (Year 1)</h3>
      <div>Gross Yield: ${grossYield.toFixed(2)}%</div>
      <div>Net Yield (NOI/Price): <span class="big">${netYield.toFixed(2)}%</span></div>
      <div>First-Year Net Cash Flow: <span class="${netCashFlowY1 >= 0 ? 'green' : 'red'}">$${f(Math.round(netCashFlowY1))}</span></div>
      <hr class="hr"/>
      <h3>Projection Highlights</h3>
      <div>Estimated Equity after ${horizon} years: $${f(Math.round(equity))}</div>
    `;
    const detailsHTML = `
      <div>Price: $${f(price)} | Costs: $${f(costs)} | Reno: $${f(reno)}</div>
      <div>Rent: $${f(rent)} | Vacancy: ${(vacancyPct*100).toFixed(1)}% | Mgmt: ${(mgmtPct*100).toFixed(1)}%</div>
      <div>Operating Expenses (Yr1): $${f(Math.round(opEx))} | NOI: $${f(Math.round(noi))}</div>
      <div>Loan: $${f(loan)} | Rate: ${ratePct.toFixed(2)}% | Term: ${termYears} yrs | Annual P&I: $${f(Math.round(annualPmt))}</div>
      <div>SMSF Admin: $${f(smsfFees)} | LRBA Trustee Fee: $${f(lrbaFee)} | Depreciation: $${f(depr)} | Tax Rate: ${(taxRate*100).toFixed(1)}%</div>
      <div>Capital Growth: ${(growthPct*100).toFixed(1)}% p.a. | Horizon: ${horizon} yrs</div>
    `;
    writeResults(
      'SMSF PROPERTY INVESTMENT - RESULTS',
      resultsHTML,
      'INPUT SUMMARY',
      detailsHTML,
      COPY.smsf_property_analysis.disclaimer,
      COPY.smsf_property_analysis.summary
    );
  }

  function calcSMSFVsPersonal() {
    const price = n(q('sp_price').value);
    const rent0 = n(q('sp_rent').value);
    const rentGrowth = parseFloat(q('sp_rentGrowth').value || '0')/100;
    const exp = n(q('sp_exp').value);
    const loan = n(q('sp_loan').value);
    const ratePct = parseFloat(q('sp_ratePct').value || '0');
    const termYears = n(q('sp_termYears').value);
    const holding = n(q('sp_holdYears').value);
    const growthPct = parseFloat(q('sp_growth').value || '0')/100;
    const costs = n(q('sp_costs').value);
    const depr = n(q('sp_depr').value);
    const smsfFees = n(q('sp_smsfFees').value);
    const smsfTax = parseFloat(q('sp_smsfTax').value || '15')/100;
    const smsfCGT = parseFloat(q('sp_smsfCGT').value || '10')/100;
    const mtr = parseFloat(q('sp_mtr').value || '45')/100;
    const personalOther = n(q('sp_personalOther').value);

    const r = ratePct/100;
    const annualPmt = pmtMonthly(loan, r, termYears) * 12;
    const annualInterest = amortYearInterestTotal(loan, ratePct, termYears);

    let rent = rent0;
    let smsfCFsum = 0, personalCFsum = 0;

    for (let y=1; y<=holding; y++) {
      const noi = Math.max(0, rent - exp);
      const interestY = annualInterest[y-1] || (loan * r);

      const taxableSMSF = noi - interestY - depr - smsfFees;
      const smsfTaxPaid = taxableSMSF > 0 ? taxableSMSF * smsfTax : 0;
      const smsfTaxSaving = taxableSMSF < 0 ? (-taxableSMSF) * smsfTax : 0;
      const smsfCF = noi - annualPmt - smsfFees - smsfTaxPaid + smsfTaxSaving;

      const taxablePersonal = noi - interestY - depr - personalOther;
      const personalTaxPaid = taxablePersonal > 0 ? taxablePersonal * mtr : 0;
      const personalRefund = taxablePersonal < 0 ? (-taxablePersonal) * mtr : 0;
      const personalCF = noi - annualPmt - personalTaxPaid + personalRefund;

      smsfCFsum += smsfCF;
      personalCFsum += personalCF;

      rent *= (1 + rentGrowth);
    }

    const salePrice = price * Math.pow(1 + growthPct, holding);
    const remaining = (function() {
      const monthly = pmtMonthly(loan, r, termYears);
      let bal = loan;
      let months = holding * 12;
      for (let i=0;i<months;i++){
        const interest = bal * (r/12);
        const principal = Math.max(0, monthly - interest);
        bal = Math.max(0, bal - principal);
        if (bal <= 0) return 0;
      }
      return bal;
    })();

    const capitalGain = Math.max(0, salePrice - price - costs);
    const smsfCGTbill = capitalGain * smsfCGT;
    const personalCGTbill = (capitalGain * 0.5) * mtr;

    const smsfNetProceeds = salePrice - remaining - smsfCGTbill;
    const personalNetProceeds = salePrice - remaining - personalCGTbill;

    const smsfTotalWealth = smsfCFsum + smsfNetProceeds;
    const personalTotalWealth = personalCFsum + personalNetProceeds;
    const advantage = smsfTotalWealth - personalTotalWealth;

    const resultsHTML = `
      <h3>Long-Term Wealth After ${holding} Years & Sale</h3>
      <div>SMSF Net Proceeds: $${f(Math.round(smsfNetProceeds))}</div>
      <div>Personal Net Proceeds: $${f(Math.round(personalNetProceeds))}</div>
      <div class="big" style="margin-top:8px;">SMSF Wealth Advantage: $${f(Math.round(advantage))}</div>
      <hr class="hr"/>
      <div>SMSF Total Net Wealth: $${f(Math.round(smsfTotalWealth))}</div>
      <div>Personal Total Net Wealth: $${f(Math.round(personalTotalWealth))}</div>
    `;
    const detailsHTML = `
      <div>Price: $${f(price)} | Costs: $${f(costs)} | Loan: $${f(loan)} | Rate: ${ratePct.toFixed(2)}% | Term: ${termYears} yrs</div>
      <div>Rent Yr1: $${f(n(rent0))} | Rent Growth: ${(rentGrowth*100).toFixed(1)}% | Expenses: $${f(exp)} | Depreciation: $${f(depr)}</div>
      <div>SMSF Fees: $${f(smsfFees)} | SMSF Tax: ${(smsfTax*100).toFixed(1)}% | SMSF CGT: ${(smsfCGT*100).toFixed(1)}%</div>
      <div>Personal MTR: ${(mtr*100).toFixed(1)}% | Other Deductible: $${f(personalOther)}</div>
      <div>Holding: ${holding} yrs | Sale Price: $${f(Math.round(salePrice))} | Remaining Loan at Sale: $${f(Math.round(remaining))}</div>
      <div>SMSF CGT: $${f(Math.round(smsfCGTbill))} | Personal CGT: $${f(Math.round(personalCGTbill))}</div>
    `;
    writeResults(
      'SMSF VS PERSONAL - RESULTS',
      resultsHTML,
      'INPUT SUMMARY',
      detailsHTML,
      COPY.smsf_vs_personal.disclaimer,
      COPY.smsf_vs_personal.summary
    );
  }

  function calcSMSFRepaymentProjector() {
    const bal0 = n(q('rp_balance').value);
    const ratePct = parseFloat(q('rp_ratePct').value || '0');
    const termYears = n(q('rp_termYears').value);
    const conc = n(q('rp_conc').value);
    const nonc = n(q('rp_nonconc').value);
    const netRent = n(q('rp_netRent').value);
    const other = n(q('rp_other').value);
    const admin = n(q('rp_admin').value);
    const base = q('rp_base').value;
    const ioYears = n(q('rp_ioYears').value);
    const useSurplus = q('rp_useSurplus').value === 'yes';
    const extra = n(q('rp_extra').value);

    const r = ratePct/100;

    // Baseline standard interest (benchmark; Use Surplus = No)
    let baseBal = bal0, baseTotalInterest = 0, baseRemainingYears = termYears;
    for (let y=1; y<=termYears; y++) {
      if (base === 'io' && y <= ioYears) {
        baseTotalInterest += baseBal * r;
      } else {
        const pm = pmtMonthly(baseBal, r, baseRemainingYears);
        for (let m=1; m<=12; m++) {
          const interest = baseBal * (r/12);
          const principal = Math.max(0, pm - interest);
          baseBal = Math.max(0, baseBal - principal);
          baseTotalInterest += interest;
          if (baseBal <= 0) break;
        }
        baseRemainingYears = Math.max(0, baseRemainingYears - 1);
      }
      if (baseBal <= 0) break;
    }

    // Strategy with optional surplus
    let bal = bal0;
    let totalInterest = 0;
    let years = 0;

    while (bal > 0 && years < 50) {
      years++;
      if (base === 'io' && years <= ioYears) {
        const interestY = bal * r;
        const annualPmt = interestY;
        const surplus = useSurplus ? Math.max(0, (conc + nonc + netRent + other + extra) - admin - annualPmt) : 0;
        totalInterest += interestY;
        bal = Math.max(0, bal - surplus);
      } else {
        const pm = pmtMonthly(bal, r, Math.max(1, termYears - Math.max(0, years - ioYears)));
        const annualPmt = pm * 12;
        const surplus = useSurplus ? Math.max(0, (conc + nonc + netRent + other + extra) - admin - annualPmt) : 0;

        for (let m=1; m<=12; m++) {
          const interest = bal * (r/12);
          const principal = Math.max(0, pm - interest);
          bal = Math.max(0, bal - principal);
          totalInterest += interest;
          if (m === 12 && surplus > 0) bal = Math.max(0, bal - surplus);
          if (bal <= 0) break;
        }
      }
      if (bal <= 0) break;
    }

    const interestSaved = Math.max(0, baseTotalInterest - totalInterest);

    const resultsHTML = `
      <h3>Repayment Projection</h3>
      <div>Estimated Payoff Time: <span class="big">${years} years</span></div>
      <div>Total Interest (with strategy): $${f(Math.round(totalInterest))}</div>
      <div>Estimated Interest Saved vs Standard: <span class="green">$${f(Math.round(interestSaved))}</span></div>
    `;
    const detailsHTML = `
      <div>Starting Balance: $${f(bal0)} | Rate: ${ratePct.toFixed(2)}% | Term: ${termYears} yrs</div>
      <div>Contributions: $${f(conc)} + $${f(nonc)} | Net Rent: $${f(netRent)} | Other: $${f(other)} | Admin: $${f(admin)}</div>
      <div>Base: ${base === 'io' ? 'Interest-Only then P&I' : 'P&I'} | IO Years: ${ioYears} | Additional Annual: $${f(extra)}</div>
    `;
    writeResults(
      'SMSF LOAN REPAYMENT PROJECTOR - RESULTS',
      resultsHTML,
      'INPUT SUMMARY',
      detailsHTML,
      COPY.smsf_repayment_projector.disclaimer,
      COPY.smsf_repayment_projector.summary
    );
  }

  function calcSMSFRefiEquity() {
    const mode = q('re_mode').value;

    if (mode === 'refi') {
      const curBal = n(q('re_curBal').value);
      const curRate = parseFloat(q('re_curRate').value || '0')/100;
      const curTerm = n(q('re_curTerm').value);
      const newAmt = n(q('re_newAmt').value);
      const newRate = parseFloat(q('re_newRate').value || '0')/100;
      const newTerm = n(q('re_newTerm').value);
      const fees = n(q('re_fees').value);

      const curPMT = pmtMonthly(curBal, curRate, curTerm);
      const newPMT = pmtMonthly(newAmt, newRate, newTerm);

      const curTotalInterest = curPMT * 12 * curTerm - curBal;
      const newTotalInterest = newPMT * 12 * newTerm - newAmt + fees;

      const monthlySavings = curPMT - newPMT;
      const breakEvenMonths = monthlySavings > 0 ? Math.ceil(fees / monthlySavings) : null;
      const interestSavings = curTotalInterest - newTotalInterest;

      const resultsHTML = `
        <h3>Refinance Savings</h3>
        <div>Current Monthly: $${f(Math.round(curPMT))} → New Monthly: <span class="big">$${f(Math.round(newPMT))}</span></div>
        <div>Monthly Savings: <span class="${monthlySavings>0?'green':'red'}">$${f(Math.round(monthlySavings))}</span></div>
        <div>Total Interest (Current): $${f(Math.round(curTotalInterest))}</div>
        <div>Total Interest (New incl. fees): $${f(Math.round(newTotalInterest))}</div>
        <div>Estimated Interest Saved: <span class="${interestSavings>0?'green':'red'}">$${f(Math.round(interestSavings))}</span></div>
        <div>Break-Even on Fees: ${breakEvenMonths !== null && breakEvenMonths !== Infinity ? breakEvenMonths + ' months' : 'N/A'}</div>
      `;
      const detailsHTML = `
        <div>Current: $${f(curBal)} @ ${(curRate*100).toFixed(2)}% for ${curTerm} yrs</div>
        <div>New: $${f(newAmt)} @ ${(newRate*100).toFixed(2)}% for ${newTerm} yrs | Fees: $${f(fees)}</div>
      `;
      writeResults(
        'SMSF REFINANCE - RESULTS',
        resultsHTML,
        'INPUT SUMMARY',
        detailsHTML,
        COPY.smsf_refi_equity.disclaimer,
        COPY.smsf_refi_equity.summary
      );
    } else {
      const propVal = n(q('re_propVal').value);
      const curBal2 = n(q('re_curBal2').value);
      const maxLvr = parseFloat(q('re_maxLvr').value || '0')/100;
      const newRate2 = parseFloat(q('re_newRate2').value || '0')/100;
      const newTerm2 = n(q('re_newTerm2').value);
      const purpose = q('re_purpose')?.value || '—';

      const maxLoan = propVal * maxLvr;
      const equityAvailable = Math.max(0, maxLoan - curBal2);
      const newPMT2 = pmtMonthly(maxLoan, newRate2, newTerm2);

      const resultsHTML = `
        <h3>Equity Access</h3>
        <div>Maximum Allowable Loan (@ ${Math.round(maxLvr*100)}% LVR): $${f(Math.round(maxLoan))}</div>
        <div>Equity You Can Access: <span class="big">$${f(Math.round(equityAvailable))}</span></div>
        <div>Estimated New Monthly Repayment (on total new loan): $${f(Math.round(newPMT2))}</div>
        <div class="muted">Note: Entire facility is typically refinanced; ensure use of funds is compliant.</div>
      `;
      const detailsHTML = `
        <div>Property Value: $${f(propVal)} | Current Loan: $${f(curBal2)} | Max LVR: ${Math.round(maxLvr*100)}%</div>
        <div>Rate: ${(newRate2*100).toFixed(2)}% | Term: ${newTerm2} yrs</div>
        <div>Purpose: ${purpose}</div>
      `;
      writeResults(
        'SMSF EQUITY RELEASE - RESULTS',
        resultsHTML,
        'INPUT SUMMARY',
        detailsHTML,
        COPY.smsf_refi_equity.disclaimer,
        COPY.smsf_refi_equity.summary
      );
    }
  }

  function calcSMSFInSpecie() {
    const value = n(q('is_value').value);
    const costBase = n(q('is_costBase').value);
    const oldLoan = n(q('is_oldLoan').value);
    const fundBal = n(q('is_fundBal').value);
    const nccCap = n(q('is_nccCap').value);
    const lvrPctInput = parseFloat(q('is_lvrPct').value || '50');
    let loan = n(q('is_loan').value);
    if (!loan || loan <= 0) loan = Math.round(value * (lvrPctInput/100));

    let smsfCash = n(q('is_smsfCash').value);
    let inSpecie = n(q('is_inSpecie').value);
    if (!inSpecie || inSpecie <= 0) inSpecie = Math.min(nccCap, Math.max(0, value - loan));

    const dutyRate = parseFloat(q('is_dutyRate').value || '5')/100;
    const mtr = parseFloat(q('is_mtr').value || '47')/100;
    const legal = n(q('is_legal').value);

    const totalFunding = loan + inSpecie + smsfCash;
    const fundingGap = value - totalFunding;

    const gain = Math.max(0, value - costBase);
    const taxableGain = gain * 0.5;
    const cgtLiability = taxableGain * mtr;

    const stampDuty = value * dutyRate;

    const upfrontCost = stampDuty + legal + cgtLiability;

    // LVR warning in results too (in addition to inline alert)
    const lvrComputed = value > 0 ? (loan / value) * 100 : lvrPctInput;
    const lvrWarnHTML = lvrComputed > 70
      ? `<div class="alert" style="margin-bottom:10px;">Warning: The entered loan amount exceeds a 70% Loan-to-Value Ratio (LVR). Lenders typically have stricter conditions for high LVR commercial loans.</div>`
      : '';

    const resultsHTML = `
      ${lvrWarnHTML}
      <h3>Transaction Summary</h3>
      <div>Funding Structure:</div>
      <div>LRBA Loan: <strong>$${f(loan)}</strong> | In-Specie Contribution: <strong>$${f(inSpecie)}</strong> | SMSF Cash: <strong>$${f(smsfCash)}</strong></div>
      <div>Funding Check: ${fundingGap === 0 ? '<span class="green">Balanced</span>' : (fundingGap < 0 ? '<span class="green">Surplus $'+f(Math.abs(fundingGap))+'</span>' : '<span class="red">Shortfall $'+f(fundingGap)+'</span>')}</div>
      <div>Assumed LVR: ${isFinite(lvrComputed) ? Math.round(lvrComputed) : Math.round(lvrPctInput)}%</div>
      <hr class="hr"/>
      <div>Stamp Duty (est.): $${f(Math.round(stampDuty))}</div>
      <div>Personal CGT (est.): <span class="red">$${f(Math.round(cgtLiability))}</span></div>
      <div>Legal & Setup Fees: $${f(legal)}</div>
      <div class="big" style="margin-top:8px;">Total One-Off Costs: $${f(Math.round(upfrontCost))}</div>
    `;
    const detailsHTML = `
      <div>Property Value: $${f(value)} | Original Cost Base: $${f(costBase)} | Personal Loan to Clear: $${f(oldLoan)}</div>
      <div>SMSF Balance: $${f(fundBal)} | Available NCC Cap: $${f(nccCap)}</div>
      <div>Assumptions: Duty ${Math.round(dutyRate*100)}% | MTR ${(mtr*100).toFixed(1)}% | Legal $${f(legal)}</div>
      <div class="muted">Compliance reminders: Single acquirable asset, market value transaction, arm's length LRBA terms, and sufficient liquidity.</div>
    `;
    writeResults(
      'SMSF IN-SPECIE TRANSFER - RESULTS',
      resultsHTML,
      'INPUT SUMMARY',
      detailsHTML,
      COPY.smsf_in_specie.disclaimer,
      COPY.smsf_in_specie.summary
    );
  }

  function performSMSFFinancialCalculation(tool) {
    switch (tool) {
      case 'smsf_borrowing_power': return calcSMSFBorrowingPower();
      case 'smsf_property_analysis': return calcSMSFPropertyAnalysis();
      case 'smsf_vs_personal': return calcSMSFVsPersonal();
      case 'smsf_repayment_projector': return calcSMSFRepaymentProjector();
      case 'smsf_refi_equity': return calcSMSFRefiEquity();
      case 'smsf_in_specie': return calcSMSFInSpecie();
    }
  }
})();
