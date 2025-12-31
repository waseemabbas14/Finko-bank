// home_extras.js
/**
 * home_extras.js - Enhanced Home modules:
 * - Bridging Loan (Peak Debt, End Debt incl. repayment, cost breakdown reuse, colored affordability)
 * - Next Home – Upgrade (3 input sections + expandable Monthly Expenses, full results, colored affordability)
 * - Investment Loans (retained; encoding fixed in text)
 * - Construction Loans (per-type input sets, reset on type change, clamp negative loan outputs)
 *
 * Integrated with:
 * - ui.js (renderFields hook + dropdown options + summary)
 * - eventListeners.js (handleSubmit hook)
 *
 * Assumptions (AU context, illustrative only):
 * - Rates: Bridging 8.5% p.a., Investment 7.2% p.a., Owner-Occ 6.5% p.a., Construction 6.8% p.a.
 * - Fees for bridging facility estimate (misc costs placeholder): $5,000
 * - Construction average drawn balance during build: 55%
 */

(function () {
  const RATES = {
    ownerOcc: 0.065,         // 6.5%
    bridging: 0.085,         // 8.5%
    investment: 0.072,       // 7.2%
    construction: 0.068      // 6.8%
  };

  const DEFAULT_TERM_YEARS = 30;
  const BRIDGING_MISC_FEES = 5000;
  const CONSTRUCTION_AVG_DRAW_FACTOR = 0.55; // average drawn during construction

  // Helpers
  function $el(id) { return document.getElementById(id); }

  function pctInt(val) { return `${Math.round(val)}%`; }

  function affordabilityBadge(ratio) {
    // ratio = commitments / netIncome
    // Thresholds: <=0.60 Green (Likely Affordable), <=0.85 Amber (Exercise Caution), >0.85 Red (Seek Advice)
    let color = '#1fbf75', bg = 'rgba(31,191,117,0.15)', label = 'Likely Affordable';
    if (ratio > 0.85) { color = '#ff4d4f'; bg = 'rgba(255,77,79,0.12)'; label = 'Seek Advice'; }
    else if (ratio > 0.60) { color = '#f5a623'; bg = 'rgba(245,166,35,0.15)'; label = 'Exercise Caution'; }
    return `<span style="display:inline-block; padding:4px 10px; border-radius:999px; font-weight:700; color:${color}; background:${bg}; font-size:12px;">${label}</span>`;
  }

  function buildCTA(loanType) {
    const btn = document.createElement('button');
    btn.className = 'cta-btn';
    btn.type = 'button';
    // Standardize icon path to match other CTAs
    btn.innerHTML = `<img src="t-removebg-preview.png" alt="" style="width:10px; height:16px; vertical-align:middle;"> ${getCTALabel(loanType)}`;
    btn.onclick = () => alert('Lead form coming soon! (We can pre-fill with calculation data here.)');
    return btn;
  }

  function writeResults(html, loanPurpose) {
    const resultsEl = $el('results');
    if (!resultsEl) return;
    resultsEl.innerHTML = html;
    // Optional Step 3 message
    if (typeof renderStep4 === 'function') renderStep4(loanPurpose);
    // CTA
    resultsEl.appendChild(buildCTA(loanPurpose));
  }

  function writeDetails(title, bodyHTML) {
    const detailsEl = $el('details');
    if (!detailsEl) return;
    detailsEl.innerHTML = `
      <div class="dash-col-header">${title}</div>
      <div class="dash-col-content">${bodyHTML}</div>
    `;
  }

  // Small helper to reuse the "Property Purchase" cost breakdown for a given price (state-aware)
  function renderPropertyCostBreakdown(state, price) {
    const costs = calcPropertyPurchaseTotalCost(state, price, false, 'established', 'residential');
    const purchaseCosts = Math.max(0, num(costs.totalPropertyCost) - price);
    return {
      html: `
        <div class="cost-breakdown" style="margin-top: 15px; padding: 12px; background: #0b0d12; border-radius: 8px; font-size: 12px;">
          <div style="color: var(--muted); margin-bottom: 8px;">Cost Breakdown Estimates:</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Property Value (New Purchase):</span>
            <span>$${fmt(price)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Stamp Duty:</span>
            <span>$${fmt(costs.stampDuty)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Government Charges:</span>
            <span>$${fmt(costs.govtCharges)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Conveyancer Fees:</span>
            <span>$${fmt(costs.conveyancerFees)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--line);">
            <span><strong>Total Cost:</strong></span>
            <span><strong>$${fmt(costs.totalPropertyCost)}</strong></span>
          </div>
        </div>
      `,
      totalCost: num(costs.totalPropertyCost),
      purchaseCosts
    };
  }

  function includeBridgingSummaryInResults() {
    const msg = (typeof summaryDescriptions !== 'undefined' && summaryDescriptions.home_bridging) ? summaryDescriptions.home_bridging : '';
    return msg
      ? `<div style="margin-top: 14px; padding: 12px; background:#0b0d12; border-radius: 8px; border-left: 3px solid var(--accent);"><p class="muted" style="white-space:pre-line; margin:0;">${msg}</p></div>`
      : '';
  }

  // ============= RENDER FIELDS =============
  function renderFieldsBridging() {
    const h = [];
    h.push(`
      <div class="step-title">Step 2: BRIDGING LOAN</div>

      <div class="row">
        <label>Primary Bridging Scenario
          <select id="bridgingScenario">
            <option value="">Primary Bridging Scenario</option>
            <option value="buy_before_sell">Purchase a new home before selling my current one</option>
            <option value="auction">Buying a property at auction</option>
            <option value="building">Building a new home before selling</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <div class="row cols-2">
        <label>Current Home Estimated Value
          <input type="text" id="currentHomeValue" placeholder="e.g. 800,000" required>
        </label>
        <label>Outstanding Mortgage Balance
          <input type="text" id="currentHomeMortgage" placeholder="e.g. 300,000" required>
        </label>
      </div>

      <div class="row">
        <label>New Home Purchase Price
          <input type="text" id="newPurchasePrice" placeholder="e.g. 1,200,000" required>
        </label>
      </div>

      <div class="row cols-2">
        <label id="saleMonthsLabel">Estimated Sale Timeframe / Bridging Term (Months)
          <select id="saleMonths" required>
            <option value="">Select Option</option>
            <option value="3">3</option>
            <option value="6">6</option>
            <option value="9">9</option>
            <option value="12">12</option>
          </select>
        </label>
        <label>Estimated Monthly Holding Costs
          <input type="text" id="holdingCosts" placeholder="e.g. 5,000" value="0" required>
        </label>
      </div>

      <div class="row cols-2">
        <label>Gross Annual Income
          <input type="text" id="grossAnnualIncome" placeholder="e.g. 180,000" required>
        </label>
        <label>Monthly Living Expenses
          <input type="text" id="monthlyLiving" placeholder="e.g. 4,500" required>
        </label>
      </div>

      <div class="row cols-2">
        <label>Other Monthly Debt Repayments
          <input type="text" id="otherMonthlyDebt" placeholder="e.g. 700" value="0" required>
        </label>
        <label id="interestCapitalisationLabel">Interest Capitalisation
          <select id="interestCapitalisation">
            <option value="">Interest Capitalisation</option>
            <option value="capitalised">Capitalised Interest</option>
            <option value="non_capitalised">Non-Capitalised Interest</option>
          </select>
        </label>
      </div>
      <div class="row cols-2">
        <label id="bridgeLoanTypeLabel">Loan Type During Bridge
          <select id="bridgeRepaymentType">
            <option value="">Loan Type During Bridge</option>
            <option value="io">Interest Only</option>
            <option value="pni">Principal & Interest</option>
          </select>
        </label>
      </div>
      <input type="hidden" id="bridgeRate" value="8.5">
    `);

    $el('dynamicFields').innerHTML = h.join('');

    // Update field labels based on bridging scenario
    function updateBridgingLabels() {
      const scenario = $el('bridgingScenario').value;
      const saleLabel = $el('saleMonthsLabel');
      const intCapLabel = $el('interestCapitalisationLabel');
      const loanTypeLabel = $el('bridgeLoanTypeLabel');

      if (saleLabel) {
        const saleHeading = (scenario === 'buy_before_sell' || scenario === 'other' ? 'Estimated Sale Timeframe' : 'Bridging Term') + ' (Months)';
        saleLabel.innerHTML = saleHeading + '<br><select id="saleMonths" required><option value="">' + saleHeading + '</option><option value="3">3</option><option value="6">6</option><option value="9">9</option><option value="12">12</option></select>';
      }
      if (intCapLabel) {
        const intCapHeading = (scenario === 'auction' ? 'Interest Treatment' : 'Interest Capitalisation');
        intCapLabel.innerHTML = intCapHeading + '<br><select id="interestCapitalisation"><option value="">' + intCapHeading + '</option><option value="capitalised">Capitalised Interest</option><option value="non_capitalised">Non-Capitalised Interest</option></select>';
      }
      if (loanTypeLabel) {
        const loanTypeHeading = (scenario === 'building' ? 'Construction Loan Type' : 'Loan Type During Bridge');
        loanTypeLabel.innerHTML = loanTypeHeading + '<br><select id="bridgeRepaymentType"><option value="">' + loanTypeHeading + '</option><option value="io">Interest Only</option><option value="pni">Principal & Interest</option></select>';
      }

      // Clear previous results when scenario changes
      try {
        $el('results').innerHTML = '';
        $el('details').innerHTML = '';
        $el('disclaimer').innerText = '';
      } catch (e) { }

      // Reset auto-recalc gate
      if (window.resetAutoRecalcGate) window.resetAutoRecalcGate();
      
      // Auto-recalculate after rendering new selects
      setTimeout(() => {
        if (window.hasCalculated && typeof handleFormSubmit === 'function') {
          window.isAutoRecalc = true;
          handleFormSubmit();
          window.isAutoRecalc = false;
        }
      }, 50);
    }

    // Attach scenario change listener
    const scenarioSel = $el('bridgingScenario');
    if (scenarioSel) {
      scenarioSel.addEventListener('change', updateBridgingLabels);
    }
    
    // Attach auto-recalc to all bridging input/select changes
    attachBridgingAutoRecalcListeners();

    setTimeout(() => { if (typeof setupNumberFormatting === 'function') setupNumberFormatting(); }, 50);
    setFlowDetails('STEP 3: ENTER YOUR DETAILS', '<div class="muted">Fill out your bridging scenario details and click Calculate.</div>');
    $el('disclaimer').innerText = getDisclaimer('home_bridging');
    return true;
  }

  function renderFieldsNextHome() {
    const h = [];
    h.push(`
      <div class="step-title">Step 2: NEXT HOME – UPGRADE</div>

      <!-- Section 1: Current Mortgage -->
      <div class="row">
        <div class="muted" style="margin: 6px 0 4px; font-weight:700;">Section 1: Current Mortgage</div>
      </div>
      <div class="row cols-3">
        <label>Loan Amount
          <input type="text" id="nhCurrentLoanAmount" placeholder="e.g. 450,000" required>
        </label>
        <label>Monthly Repayment Amount
          <input type="text" id="nhCurrentMonthlyRepay" placeholder="e.g. 2,200" required>
        </label>
        <label>Rate Type
          <select id="nhCurrentRateType">
            <option value="">Rate Type</option>
            <option value="fixed">Fixed</option>
            <option value="variable">Variable</option>
          </select>
        </label>
      </div>

      <!-- Section 2: Next Home -->
      <div class="row">
        <div class="muted" style="margin: 10px 0 4px; font-weight:700;">Section 2: Next Home</div>
      </div>
      <div class="row cols-3">
        <label>Purchase Price
          <input type="text" id="nhNextPurchasePrice" placeholder="e.g. 1,400,000" required>
        </label>
        <label>Loan Amount
          <input type="text" id="nhNextLoanAmount" placeholder="e.g. 950,000" required>
        </label>
        <label>Repayment Type
          <select id="nhRepaymentType">
            <option value="">Repayment Type</option>
            <option value="io">Interest Only (IO)</option>
            <option value="pni">Principal & Interest (P&I)</option>
          </select>
        </label>
      </div>
      <div class="row cols-3">
        <label>New Loan Term (years)
          <input type="number" id="nhNextTerm" min="1" max="40" step="1" value="30" required>
        </label>
        <label>Assumed Rate (% p.a.)
          <input type="number" id="nhNextRatePct" step="0.01" min="0" max="20" value="6.50" required>
        </label>
        <label>Gross Annual Household Income
          <input type="text" id="nhGrossAnnualIncome" placeholder="e.g. 220,000" required>
        </label>
      </div>

      <!-- Section 3: Monthly Expenses (Expandable) -->
      <div class="row">
        <div class="muted" style="margin: 10px 0 6px; font-weight:700;">Section 3: Monthly Expenses</div>
      </div>
      <div id="nhExpensesList"></div>
      <div class="row">
        <button type="button" id="nhAddExpenseBtn" class="btn btn-secondary">+ Add Another Expense</button>
      </div>
    `);

    $el('dynamicFields').innerHTML = h.join('');
    initNHExpensesList();
    attachNextHomeAutoRecalcListeners();
    setTimeout(() => { if (typeof setupNumberFormatting === 'function') setupNumberFormatting(); }, 50);
    setFlowDetails('STEP 3: ENTER YOUR DETAILS', '<div class="muted">Enter your current mortgage, next home loan details and other liabilities.</div>');
    $el('disclaimer').innerText = getDisclaimer('home_next_home');
    return true;
  }

  function renderFieldsInvestment() {
    const h = [];
    h.push(`
      <div class="step-title">Step 2: INVESTMENT PROPERTY</div>

      <div class="row cols-2">
        <label>Purchase Price
          <input type="text" id="ipPrice" placeholder="e.g. 800,000" required>
        </label>
        <label>Estimated Weekly Rent
          <input type="text" id="ipWeeklyRent" placeholder="e.g. 600" required>
        </label>
      </div>

      <div class="row cols-2">
        <label>Intrest Type
          <select id="ipLoanType">
            <option value="">Intrest Type</option>
            <option value="io">Interest Only</option>
            <option value="pni">Principal & Interest</option>
          </select>
        </label>
        <label>Interest-Only Period (years)
          <select id="ipIOYears">
            <option value="">Interest-Only Period (years)</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </label>
      </div>

      <div class="row cols-2">
        <label>Loan-to-Value Ratio (LVR %)
          <input type="number" id="ipLVR" min="1" max="95" step="1" value="80" required>
        </label>
        <label>Intrest Rate (% p.a.)
          <input type="number" id="ipRatePct" step="0.01" min="0" max="20" value="7.2" required>
        </label>
      </div>

      <div class="row cols-2">
        <label>Council Rates (annual)
          <input type="text" id="ipCouncil" value="2400">
        </label>
        <label>Water/Sewer (annual)
          <input type="text" id="ipWater" value="1200">
        </label>
      </div>

      <div class="row cols-2">
        <label>Insurance (annual)
          <input type="text" id="ipInsurance" value="1200">
        </label>
        <label>Maintenance (annual)
          <input type="text" id="ipMaintenance" value="1500">
        </label>
      </div>

      <div class="row cols-2">
        <label>Property Management Fees (% of rent)
          <input type="number" id="ipMgmtPct" step="0.1" min="0" max="20" value="7.7">
        </label>
        <label>Marginal Tax Rate
          <select id="ipTaxRate">
            <option value="">Marginal Tax Rate</option>
            <option value="0.19">19%</option>
            <option value="0.325">32.5%</option>
            <option value="0.37">37%</option>
            <option value="0.45">45%</option>
          </select>
        </label>
      </div>

      <div class="row">
        <label>Gross Annual Income
          <input type="text" id="ipGrossIncome" value="150,000" required>
        </label>
      </div>

      <div class="row cols-2">
        <label>Loan Term (years)
          <input type="number" id="ipTerm" min="1" max="40" step="1" value="30" required>
        </label>
      </div>
    `);

    $el('dynamicFields').innerHTML = h.join('');
    attachInvestmentAutoRecalcListeners();
    setTimeout(() => { if (typeof setupNumberFormatting === 'function') setupNumberFormatting(); }, 50);
    setFlowDetails('STEP 3: ENTER YOUR DETAILS', '<div class="muted">Provide property, loan and cost details to analyse cash flow and tax effects.</div>');
    $el('disclaimer').innerText = getDisclaimer('home_investment');
    return true;
  }

  // Removed from menu via DOM tweak below; keep for backward safety (but we won’t render it from picker)
  function renderFieldsEquityRelease() {
    // Make the Equity Release fields identical to the Access Equity form so both behave the same
    const h = [];
    h.push(`
      <div class="step-title">Step 2: ACCESS/EQUITY RELEASE – ACCESS EQUITY FROM MY HOME</div>
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

    $el('dynamicFields').innerHTML = h.join('');
    setTimeout(() => { if (typeof setupNumberFormatting === 'function') setupNumberFormatting(); }, 50);
    setFlowDetails('STEP 3: ENTER YOUR DETAILS', '<div class="muted">Estimate accessible equity and repayment impact.</div>');
    $el('disclaimer').innerText = getDisclaimer('home_equity_release');
    return true;
  }

  function renderFieldsConstruction() {
    const h = [];
    h.push(`
      <div class="step-title">Step 2: CONSTRUCTION LOAN</div>

      <div class="row">
        <label>What type of construction are you planning?
          <select id="buildScenario">
            <option value="">What type of construction are you planning?</option>
            <option value="own_land">Build on land I own</option>
            <option value="buy_land_build">Purchase land and build</option>
            <option value="reno_kdr">Knock-down rebuild</option>
          </select>
        </label>
      </div>

      <div id="constructionScenarioFields"></div>
      <input type="hidden" id="consRatePct" value="6.8">
    `);

    $el('dynamicFields').innerHTML = h.join('');

    // Render fields for current selection and reset data on change
    const sel = $el('buildScenario');
    const mount = () => renderConstructionFieldsForType(sel.value);
    sel.addEventListener('change', () => {
      // Clear results when scenario changes
      const resultsEl = $el('results');
      const detailsEl = $el('details');
      const disclaimerEl = $el('disclaimer');
      if (resultsEl) resultsEl.innerHTML = '';
      if (detailsEl) detailsEl.innerHTML = '';
      if (disclaimerEl) disclaimerEl.innerText = getDisclaimer('home_construction');
      
      // Field reset on type change per spec
      if (window.resetAutoRecalcGate) window.resetAutoRecalcGate();
      renderConstructionFieldsForType(sel.value);
      if (typeof setupNumberFormatting === 'function') setupNumberFormatting();
      
      // Auto-recalculate after a short delay to allow fields to render
      setTimeout(() => {
        if (window.hasCalculated && typeof handleFormSubmit === 'function') {
          window.isAutoRecalc = true;
          handleFormSubmit();
          window.isAutoRecalc = false;
        }
      }, 50);
    });
    mount();

    setTimeout(() => {
      if (typeof setupNumberFormatting === 'function') setupNumberFormatting();
    }, 50);
    setFlowDetails('STEP 3: ENTER YOUR DETAILS', '<div class="muted">Understand project cost, drawdowns and repayments.</div>');
    $el('disclaimer').innerText = getDisclaimer('home_construction');
    return true;
  }

  function renderConstructionFieldsForType(type) {
    const root = $el('constructionScenarioFields');
    if (!root) return;
    if (type === 'own_land') {
      root.innerHTML = `
        <div class="row cols-2">
          <label>Current Land Value
            <input type="text" id="landValue" placeholder="e.g. 350,000" required>
          </label>
          <label>Is there a mortgage on the land?
            <select id="landMortgaged">
              <option value="">Is there a mortgage on the land?</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
        </div>

        <div class="row" id="landMortgageRow" style="display:none;">
          <label>Outstanding Balance on Land Mortgage
            <input type="text" id="landMortgageBalance" value="0">
          </label>
        </div>

        <div class="row cols-2">
          <label>Total Build Cost (Fixed Price Contract)
            <input type="text" id="buildCost" placeholder="e.g. 600,000" required>
          </label>
          <label>Estimated Construction Period (Months)
            <input type="number" id="buildMonths" min="6" max="24" step="1" value="12" required>
          </label>
        </div>

        <div class="row">
          <label>Additional Costs (permits, surveys, contingency)
            <input type="text" id="additionalCosts" value="0">
          </label>
        </div>

        <div class="row cols-2">
          <label>Gross Annual Income
            <input type="text" id="consGrossIncome" placeholder="e.g. 200,000" required>
          </label>
          <label>Monthly Living Expenses
            <input type="text" id="consLiving" placeholder="e.g. 5,500" required>
          </label>
        </div>

        <div class="row">
          <label>Current Mortgage Repayment
            <input type="text" id="consCurrentRepay" placeholder="e.g. 2,200" value="0" required>
          </label>
        </div>
      `;
      const landMortSel = $el('landMortgaged');
      const landMortRow = $el('landMortgageRow');
      if (landMortSel && landMortRow) {
        landMortSel.addEventListener('change', () => {
          landMortRow.style.display = landMortSel.value === 'yes' ? 'block' : 'none';
          // Auto-recalc when visibility changes
          attachConstructionAutoRecalcListeners();
        });
      }
    } else if (type === 'buy_land_build') {
      root.innerHTML = `
        <div class="row cols-2">
          <label>Land Purchase Price
            <input type="text" id="landPurchasePrice" placeholder="e.g. 350,000" required>
          </label>
          <label>Total Build Cost (Fixed Price Contract)
            <input type="text" id="buildCost" placeholder="e.g. 600,000" required>
          </label>
        </div>
        <div class="row cols-2">
          <label>Estimated Construction Period (Months)
            <input type="number" id="buildMonths" min="6" max="24" step="1" value="12" required>
          </label>
          <label>Additional Costs (permits, surveys, contingency)
            <input type="text" id="additionalCosts" value="0">
          </label>
        </div>
        <div class="row cols-2">
          <label>Gross Annual Income
            <input type="text" id="consGrossIncome" placeholder="e.g. 200,000" required>
          </label>
          <label>Monthly Living Expenses
            <input type="text" id="consLiving" placeholder="e.g. 5,500" required>
          </label>
        </div>
      `;
    } else {
      // reno_kdr
      root.innerHTML = `
        <div class="row cols-2">
          <label>Cost of Knock-down
            <input type="text" id="knockdownCost" placeholder="e.g. 30,000" required>
          </label>
          <label>Total Build Cost (Fixed Price Contract)
            <input type="text" id="buildCost" placeholder="e.g. 600,000" required>
          </label>
        </div>
        <div class="row cols-2">
          <label>Estimated Construction Period (Months)
            <input type="number" id="buildMonths" min="6" max="24" step="1" value="12" required>
          </label>
          <label>Additional Costs (permits, surveys, contingency)
            <input type="text" id="additionalCosts" value="0">
          </label>
        </div>
        <div class="row cols-3">
          <label>Current Mortgage Repayment
            <input type="text" id="consCurrentRepay" placeholder="e.g. 2,200" value="0" required>
          </label>
          <label>Monthly Living Expenses
            <input type="text" id="consLiving" placeholder="e.g. 5,500" required>
          </label>
          <label>Gross Annual Income
            <input type="text" id="consGrossIncome" placeholder="e.g. 200,000" required>
          </label>
        </div>
      `;
    }
    
    // Attach auto-recalc listeners to all construction fields
    attachConstructionAutoRecalcListeners();
  }

  function attachConstructionAutoRecalcListeners() {
    // Debounced auto-recalc on construction field changes
    const scheduleRecalc = () => {
      if (!window.hasCalculated) return;
      try { 
        if (window.__consRecalcTimer) clearTimeout(window.__consRecalcTimer); 
      } catch (e) {}
      
      window.__consRecalcTimer = setTimeout(() => {
        try {
          window.isAutoRecalc = true;
          if (typeof handleFormSubmit === 'function') handleFormSubmit();
          window.isAutoRecalc = false;
        } catch (e) {
          console.error('Construction auto-recalc error:', e);
        }
      }, 300);
    };

    // Find all inputs and selects in constructionScenarioFields and attach listeners
    const root = $el('constructionScenarioFields');
    if (!root) return;
    
    const inputs = root.querySelectorAll('input, select');
    inputs.forEach(el => {
      el.removeEventListener('change', scheduleRecalc);
      el.removeEventListener('input', scheduleRecalc);
      el.addEventListener('change', scheduleRecalc);
      el.addEventListener('input', scheduleRecalc);
    });
  }

  function attachBridgingAutoRecalcListeners() {
    // Debounced auto-recalc on bridging field changes
    const scheduleRecalc = () => {
      if (!window.hasCalculated) return;
      try { 
        if (window.__bridgeRecalcTimer) clearTimeout(window.__bridgeRecalcTimer); 
      } catch (e) {}
      
      window.__bridgeRecalcTimer = setTimeout(() => {
        try {
          window.isAutoRecalc = true;
          if (typeof handleFormSubmit === 'function') handleFormSubmit();
          window.isAutoRecalc = false;
        } catch (e) {
          console.error('Bridging auto-recalc error:', e);
        }
      }, 300);
    };

    // Find all inputs and selects in bridging form and attach listeners
    const bridgeInputs = document.querySelectorAll(
      '#bridgingScenario, #currentHomeValue, #currentHomeMortgage, #newPurchasePrice, ' +
      '#saleMonths, #holdingCosts, #grossAnnualIncome, #monthlyLiving, ' +
      '#otherMonthlyDebt, #interestCapitalisation, #bridgeRepaymentType'
    );
    
    bridgeInputs.forEach(el => {
      if (el) {
        el.removeEventListener('change', scheduleRecalc);
        el.removeEventListener('input', scheduleRecalc);
        el.addEventListener('change', scheduleRecalc);
        el.addEventListener('input', scheduleRecalc);
      }
    });
  }

  function attachNextHomeAutoRecalcListeners() {
    // Debounced auto-recalc on next home field changes
    const scheduleRecalc = () => {
      if (!window.hasCalculated) return;
      try { 
        if (window.__nhRecalcTimer) clearTimeout(window.__nhRecalcTimer); 
      } catch (e) {}
      
      window.__nhRecalcTimer = setTimeout(() => {
        try {
          window.isAutoRecalc = true;
          if (typeof handleFormSubmit === 'function') handleFormSubmit();
          window.isAutoRecalc = false;
        } catch (e) {
          console.error('Next Home auto-recalc error:', e);
        }
      }, 300);
    };

    // Find all inputs and selects in next home form
    const nhInputs = document.querySelectorAll(
      '#nhCurrentLoanAmount, #nhCurrentMonthlyRepay, #nhCurrentRateType, ' +
      '#nhNextPurchasePrice, #nhNextLoanAmount, #nhRepaymentType, ' +
      '#nhNextTerm, #nhNextRatePct, #nhGrossAnnualIncome, ' +
      '.nh-exp-type, .nh-exp-amount'
    );
    
    nhInputs.forEach(el => {
      if (el) {
        el.removeEventListener('change', scheduleRecalc);
        el.removeEventListener('input', scheduleRecalc);
        el.addEventListener('change', scheduleRecalc);
        el.addEventListener('input', scheduleRecalc);
      }
    });
  }

  function attachInvestmentAutoRecalcListeners() {
    // Debounced auto-recalc on investment field changes
    const scheduleRecalc = () => {
      if (!window.hasCalculated) return;
      try { 
        if (window.__invRecalcTimer) clearTimeout(window.__invRecalcTimer); 
      } catch (e) {}
      
      window.__invRecalcTimer = setTimeout(() => {
        try {
          window.isAutoRecalc = true;
          if (typeof handleFormSubmit === 'function') handleFormSubmit();
          window.isAutoRecalc = false;
        } catch (e) {
          console.error('Investment auto-recalc error:', e);
        }
      }, 300);
    };

    // Find all inputs and selects in investment form
    const invInputs = document.querySelectorAll(
      '#ipPrice, #ipWeeklyRent, #ipLoanType, #ipIOYears, ' +
      '#ipLVR, #ipRatePct, #ipCouncil, #ipWater, #ipInsurance, ' +
      '#ipMaintenance, #ipMgmtPct, #ipTaxRate, #ipGrossIncome, #ipTerm'
    );
    
    invInputs.forEach(el => {
      if (el) {
        el.removeEventListener('change', scheduleRecalc);
        el.removeEventListener('input', scheduleRecalc);
        el.addEventListener('change', scheduleRecalc);
        el.addEventListener('input', scheduleRecalc);
      }
    });
  }

  // ============= NEXT HOME: Expandable Expenses List =============
  function buildNHExpenseRow(idx) {
    return `
      <div class="nh-exp-row" data-index="${idx}" style="display:flex; gap:8px; align-items:flex-end; margin-bottom:8px; flex-wrap:wrap;">
        <label style="flex:1 1 180px;">Expense Type
          <select class="nh-exp-type">
            <option value="">Expense Type</option>
            <option value="personal_loan">Personal Loan</option>
            <option value="credit_card">Credit Card</option>
            <option value="car_loan">Car Loan</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label style="flex:1 1 160px;">Outstanding Balance
          <input type="text" class="nh-exp-balance" placeholder="e.g. 12,000" value="">
        </label>
        <label style="flex:1 1 160px;">Monthly Repayment
          <input type="text" class="nh-exp-monthly" placeholder="e.g. 380" value="">
        </label>
        <button type="button" class="btn btn-danger nh-exp-remove" title="Remove" style="height:36px;">-</button>
      </div>
    `;
  }
  function initNHExpensesList() {
    const container = $el('nhExpensesList');
    if (!container) return;
    container.innerHTML = buildNHExpenseRow(0);

    if (typeof setupNumberFormatting === 'function') setupNumberFormatting();

    container.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('nh-exp-remove')) {
        const rows = container.querySelectorAll('.nh-exp-row');
        if (rows.length <= 1) {
          const row = rows[0];
          row.querySelector('.nh-exp-balance').value = '';
          row.querySelector('.nh-exp-monthly').value = '';
          return;
        }
        e.target.closest('.nh-exp-row').remove();
      }
    });
    const addBtn = $el('nhAddExpenseBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const idx = container.querySelectorAll('.nh-exp-row').length;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = buildNHExpenseRow(idx);
        container.appendChild(wrapper.firstElementChild);
        if (typeof setupNumberFormatting === 'function') setupNumberFormatting();
        // Re-attach auto-recalc listeners for new expense row
        attachNextHomeAutoRecalcListeners();
      });
    }
  }

  // ============= SUBMIT HANDLERS =============
  function handleSubmitBridging(state) {
    // Clear any previous validation errors and restore parent positioning
    const errorEls = document.querySelectorAll('.bridging-field-error');
    errorEls.forEach(el => {
      const parent = el.parentNode;
      el.remove();
      try { if (parent && parent.getAttribute && parent.removeAttribute) parent.removeAttribute('data-has-bridging-error'); parent.style.position = ''; } catch (e) {}
    });

    // Validate required text inputs
    const requiredInputs = [
      { id: 'currentHomeValue', label: 'Current Home Estimated Value' },
      { id: 'currentHomeMortgage', label: 'Outstanding Mortgage Balance' },
      { id: 'newPurchasePrice', label: 'New Home Purchase Price' },
      { id: 'grossAnnualIncome', label: 'Gross Annual Income' },
      { id: 'monthlyLiving', label: 'Monthly Living Expenses' }
    ];

    const requiredSelects = [
      { id: 'saleMonths', label: 'Estimated Sale Timeframe / Bridging Term' },
      { id: 'interestCapitalisation', label: 'Interest Capitalisation' },
      { id: 'bridgeRepaymentType', label: 'Loan Type During Bridge' }
    ];

    let isValid = true;
    const errorFields = [];

    // Check text inputs
    requiredInputs.forEach(field => {
      const el = $el(field.id);
      const val = num(el.value);
      if (val <= 0) {
        isValid = false;
        errorFields.push(field.id);
      }
    });

    // Check select dropdowns
    requiredSelects.forEach(field => {
      const el = $el(field.id);
      if (!el.value) {
        isValid = false;
        errorFields.push(field.id);
      }
    });

    // Show error messages as absolute-positioned boxes so they do not shift surrounding inputs
    if (!isValid) {
      errorFields.forEach(fieldId => {
        const el = $el(fieldId);
        const label = el.parentNode;
        // mark parent so we can reset later
        try { label.style.position = 'relative'; label.setAttribute('data-has-bridging-error', '1'); } catch (e) {}

        const errorMsg = document.createElement('div');
        errorMsg.className = 'bridging-field-error';
        errorMsg.textContent = 'Please select/fill this field';
        // Style as an absolute-positioned red info box so it doesn't shift layout
        errorMsg.style.cssText = `
          position: absolute;
          left: 0;
          right: 0;
          bottom: -44px;
         
       
          color: #ef4444;
          font-size: 12px;
          padding: 8px 10px;
          border-radius: 6px;
          box-sizing: border-box;
          z-index: 10;
        `;
        label.appendChild(errorMsg);
      });
      return false;
    }

    const currentValue = num($el('currentHomeValue').value);
    const currentMortgage = num($el('currentHomeMortgage').value);
    const purchasePrice = num($el('newPurchasePrice').value);
    const months = parseInt($el('saleMonths').value, 10);
    const holdMonthly = num($el('holdingCosts').value);
    const grossIncome = num($el('grossAnnualIncome').value);
    const living = num($el('monthlyLiving').value);
    const otherDebt = num($el('otherMonthlyDebt').value);
    const repayType = $el('bridgeRepaymentType').value;
    const intCapMode = $el('interestCapitalisation').value;

    const bridgingRate = RATES.bridging;
    const ownerOccRate = RATES.ownerOcc;

    // Reuse Property Purchase cost breakdown (hide any FHG since not applicable)
    const costBlock = renderPropertyCostBreakdown(state, purchasePrice);
    const purchaseCostsOnly = Math.max(0, costBlock.totalCost - purchasePrice);

    // Peak Debt: Existing loan + new purchase + purchase costs + (optional holding allowance)
    const peakDebtBase = currentMortgage + purchasePrice + purchaseCostsOnly;
    const peakDebt = peakDebtBase + (holdMonthly * months);

    // Net sale proceeds (simple): current value - current mortgage (no agent costs assumed)
    const netProceeds = Math.max(0, currentValue - currentMortgage);

    // End Debt = Peak Debt - net sale proceeds
    const endDebt = Math.max(0, peakDebt - netProceeds);

    // Repayment estimates
    const monthlyDuringBridge = (repayType === 'io')
      ? calcInterestOnly(peakDebt, bridgingRate)
      : calcMonthlyRepayment(peakDebt, bridgingRate, DEFAULT_TERM_YEARS);

    const endDebtMonthlyRepay = calcMonthlyRepayment(endDebt, ownerOccRate, DEFAULT_TERM_YEARS);

    // Affordability
    const netMonthlyIncome = (grossIncome / 12) * 0.68;

    let totalCommit = 0;
    let affHTML = '';
    if (intCapMode === 'capitalised') {
      // During bridge, repayments are capitalised; affordability is based on End Debt post-sale
      totalCommit = endDebtMonthlyRepay + living + otherDebt;
      const ratio = netMonthlyIncome > 0 ? (totalCommit / netMonthlyIncome) : 99;
      affHTML = `
        <div class="muted" style="margin: 10px 0;">Indicative Affordability (Post Sale)</div>
        <div>End Debt Monthly Repayment (P&I @ ${(ownerOccRate*100).toFixed(1)}%): $${fmt(endDebtMonthlyRepay)}</div>
        <div>Total Monthly Commitments (End Debt + living + debts): $${fmt(totalCommit)}</div>
        <div>Estimated Monthly Net Income: $${fmt(netMonthlyIncome)}</div>
        <div style="margin-top:8px;">${affordabilityBadge(ratio)}</div>
      `;
    } else {
      // Non-capitalised: include bridge repayment now
      totalCommit = monthlyDuringBridge + living + otherDebt;
      const ratio = netMonthlyIncome > 0 ? (totalCommit / netMonthlyIncome) : 99;
      affHTML = `
        <div class="muted" style="margin: 10px 0;">Indicative Affordability (During Bridge)</div>
        <div>Total Monthly Expenses (bridge repay + living + debts): $${fmt(totalCommit)}</div>
        <div>Estimated Monthly Net Income: $${fmt(netMonthlyIncome)}</div>
        <div style="margin-top:8px;">${affordabilityBadge(ratio)}</div>
      `;
    }

    // Results
    let html = `
      <div class="dash-col-header">YOUR BRIDGING FINANCE ESTIMATE</div>
      <div class="dash-col-content">
        <div style="margin-bottom: 10px;"><strong>Peak Debt (Estimated Facility):</strong> $${fmt(peakDebt)}</div>
        <div>Existing Loan: $${fmt(currentMortgage)}</div>
        <div>New Purchase: $${fmt(purchasePrice)}</div>
        <div>Purchase Costs (duty + gov + legals): $${fmt(purchaseCostsOnly)}</div>
        <div>Holding Costs (${months} × $${fmt(holdMonthly)}): $${fmt(holdMonthly * months)}</div>
        <hr class="hr"/>
        ${intCapMode === 'capitalised'
          ? `<div><strong>Estimated Monthly Interest (capitalised, ${repayType === 'io' ? 'IO' : 'P&I'} @ ${(bridgingRate*100).toFixed(1)}%):</strong> $${fmt(monthlyDuringBridge)}</div>`
          : `<div><strong>Estimated Monthly Repayment (${repayType === 'io' ? 'Interest Only' : 'P&I'} @ ${(bridgingRate*100).toFixed(1)}%):</strong> $${fmt(monthlyDuringBridge)}</div>`
        }
        <hr class="hr"/>
        <div class="muted" style="margin-bottom:6px;">End Debt (after sale)</div>
        <div>Estimated Net Sale Proceeds: $${fmt(netProceeds)}</div>
        <div><strong>End Debt Amount:</strong> $${fmt(endDebt)}</div>
        <div><strong>Monthly Repayment on End Debt (P&I @ ${(ownerOccRate*100).toFixed(1)}%):</strong> $${fmt(endDebtMonthlyRepay)}</div>

        ${costBlock.html}
        <hr class="hr"/>
        ${affHTML}
        <div style="margin-top: 14px; padding: 12px; background:#0b0d12; border-radius: 8px; border-left: 3px solid var(--accent);">
          <h3 style="margin:0 0 8px 0;">Why Your Estimated Amount Might Differ</h3>
          <p class="muted" style="white-space:pre-line; margin:0;">The amount shown is a cautious estimate intended as a practical starting point. With access to over 20 lenders, we can often help you secure a higher amount than the initial figure suggests.

Your actual borrowing capacity may vary depending on:

Lender Policies: Different lenders have varying approaches to certain income types.

Loan Features: Options like offset accounts or package deals can affect the calculation.

Special Circumstances: Some lenders on our panel specialize in complex situations and can consider factors beyond standard lending rules.</p>
        </div>
      </div>
    `;

    writeResults(html, 'home_bridging');

    writeDetails('BRIDGING DETAILS', `
      <div>Scenario: ${($el('bridgingScenario').options[$el('bridgingScenario').selectedIndex] || {}).text || '—'}</div>
      <div>Interest Capitalisation: ${intCapMode === 'capitalised' ? 'Capitalised Interest' : 'Non-Capitalised Interest'}</div>
      <div>Loan Type During Bridge: ${repayType === 'io' ? 'Interest Only' : 'P&I'}</div>
      <div>Bridging Period: ${months} months</div>
      <div>Assumed Bridging Rate: ${(bridgingRate*100).toFixed(1)}% p.a.</div>
      <div>Owner-Occupier Rate (End Debt): ${(ownerOccRate*100).toFixed(1)}% p.a.</div>
    `);

    window.updateLastCalc({ loanPurpose: 'home_bridging' });
    $el('disclaimer').innerText = getDisclaimer('home_bridging');
    toggleRepaymentScenariosSection(false);
    updateSummary();
    return true;
  }

  function handleSubmitNextHome(state) {
    const currentLoanAmt = num($el('nhCurrentLoanAmount').value);
    const currentMonthlyRepay = num($el('nhCurrentMonthlyRepay').value);
    const currentRateType = ($el('nhCurrentRateType').value || 'variable');

    const nextPurchasePrice = num($el('nhNextPurchasePrice').value);
    let nextLoanAmount = num($el('nhNextLoanAmount').value);
    if (nextLoanAmount < 0) nextLoanAmount = 0; // no negative loan amounts
    const repayType = $el('nhRepaymentType').value || 'pni';
    const term = Math.max(1, parseInt($el('nhNextTerm').value || '30', 10));
    const ratePct = parseFloat($el('nhNextRatePct').value || '6.5');
    const rate = ratePct / 100;
    const grossIncome = num($el('nhGrossAnnualIncome').value);

    // Monthly repayment for new loan
    const nextMonthlyRepay = repayType === 'io'
      ? calcInterestOnly(nextLoanAmount, rate)
      : calcMonthlyRepayment(nextLoanAmount, rate, term);

    // Sum of other monthly repayments (from expandable list)
    let otherMonthly = 0;
    const rows = document.querySelectorAll('#nhExpensesList .nh-exp-row');
    rows.forEach(row => {
      const monEl = row.querySelector('.nh-exp-monthly');
      otherMonthly += num(monEl ? monEl.value : 0);
    });

    const totalServicing = nextMonthlyRepay + currentMonthlyRepay + otherMonthly;
    const netMonthlyIncome = (grossIncome / 12) * 0.68;
    const ratio = netMonthlyIncome > 0 ? (totalServicing / netMonthlyIncome) : 99;

    const html = `
      <div class="dash-col-header">YOUR UPGRADE ESTIMATE</div>
      <div class="dash-col-content">
        <div><strong>Estimated New Loan:</strong> $${fmt(nextLoanAmount)}</div>
        <div>Next Home Monthly Repayment (${repayType === 'io' ? 'IO' : 'P&I'} @ ${ratePct.toFixed(2)}% over ${term} yrs): ~$${fmt(nextMonthlyRepay)}/mth</div>
        <hr class="hr"/>
        <div><strong>Current Home Loan:</strong> $${fmt(currentLoanAmt)}</div>
        <div>Current Monthly Repayment (${currentRateType === 'fixed' ? 'Fixed' : 'Variable'}): ~$${fmt(currentMonthlyRepay)}/mth</div>
        <hr class="hr"/>
        <div><strong>Total Other Loan Repayments:</strong> ~$${fmt(otherMonthly)}/mth</div>
        <div><strong>Total Servicing Required:</strong> ~$${fmt(totalServicing)}/mth</div>
        <div style="margin-top:10px;">${affordabilityBadge(ratio)}</div>
      </div>
    `;
    writeResults(html, 'home_next_home');

    writeDetails('TRANSACTION & INPUT SUMMARY', `
      <div>Next Home Purchase Price: $${fmt(nextPurchasePrice)}</div>
      <div>Next Home Loan Amount: $${fmt(nextLoanAmount)}</div>
      <div>Term: ${term} years @ ${ratePct.toFixed(2)}%</div>
      <hr class="hr"/>
      <div>Current Loan Amount: $${fmt(currentLoanAmt)}</div>
      <div>Current Monthly Repayment: $${fmt(currentMonthlyRepay)}</div>
      <div>Other Monthly Liabilities: ~$${fmt(otherMonthly)}</div>
      <div>Gross Annual Household Income: $${fmt(grossIncome)}</div>
    `);

    window.updateLastCalc({ loanPurpose: 'home_next_home' });
    $el('disclaimer').innerText = getDisclaimer('home_next_home');
    toggleRepaymentScenariosSection(false);
    updateSummary();
    return true;
  }

  function handleSubmitInvestment(state) {
    const price = num($el('ipPrice').value);
    const weeklyRent = num($el('ipWeeklyRent').value);
    const loanType = $el('ipLoanType').value || 'io';
    const ioYears = parseInt($el('ipIOYears').value || '5', 10);
    const lvrPct = Math.max(1, Math.min(95, parseInt($el('ipLVR').value || '80', 10)));
    const ratePct = parseFloat($el('ipRatePct').value || '7.2');
    const rate = ratePct / 100;
    const council = num($el('ipCouncil').value);
    const water = num($el('ipWater').value);
    const insurance = num($el('ipInsurance').value);
    const maintenance = num($el('ipMaintenance').value);
    const mgmtPct = Math.max(0, parseFloat($el('ipMgmtPct').value || '7.7')) / 100;
    const taxRate = parseFloat($el('ipTaxRate').value || '0.37');
    const grossIncome = num($el('ipGrossIncome').value);
    const term = Math.max(1, parseInt($el('ipTerm').value || '30', 10));

    const loanAmount = price * (lvrPct / 100);
    const monthlyIO = calcInterestOnly(loanAmount, rate);
    const monthlyPNI = calcMonthlyRepayment(loanAmount, rate, term);

    const annualRent = weeklyRent * 52;
    const annualMgmt = annualRent * mgmtPct;
    const annualLoanInterest = loanAmount * rate; // first-year interest
    const totalAnnualExpenses = annualLoanInterest + council + water + insurance + maintenance + annualMgmt;
    const netRental = annualRent - totalAnnualExpenses;
    const taxBenefit = netRental < 0 ? (-netRental) * taxRate : 0;
    const afterTaxCashFlow = netRental + taxBenefit;
    const rentalYield = price > 0 ? (annualRent / price) * 100 : 0;

    const monthlyEstRepay = (loanType === 'io') ? monthlyIO : monthlyPNI;

    // Serviceability signal
    const assessableRentMonthly = (annualRent * 0.80) / 12;
    const assessmentRate = Math.min(rate + 0.03, 0.09);
    const servicingRepayment = calcMonthlyRepayment(loanAmount, assessmentRate, term); // Always P&I
    const servicingShortfall = servicingRepayment - assessableRentMonthly;

    let html = `
      <div class="dash-col-header">YOUR INVESTMENT ANALYSIS</div>
      <div class="dash-col-content">
        <div class="muted" style="margin-bottom: 8px;">Financing Summary</div>
        <div>Estimated Loan Amount : $${fmt(loanAmount)}</div>
        <div>Estimated Monthly Repayment (${loanType === 'io' ? 'IO' : 'P&I'} @ ${ratePct.toFixed(2)}%): $${fmt(monthlyEstRepay)}</div>
        <div>Purchasing Costs: $${fmt(annualLoanInterest)}</div>

        <div style="margin: 10px 0;"></div>
        <div><strong>Assessable Rental Income (for lender servicing):</strong> $${fmt(assessableRentMonthly)} per month (80% of rental income)</div>
        <div><strong>Estimated Repayment Used by Lenders:</strong> $${fmt(servicingRepayment)} per month (P&I @ assessment rate)</div>
        <div class="muted">Assessment rate = user rate + 3%, capped at 9%</div>
        <div><strong>Estimated Monthly Shortfall:</strong> $${fmt(Math.abs(servicingShortfall))} per month that must be covered from your income</div>
        <div class="muted" style="margin-top:8px;">Most lenders assess investment loans conservatively. If this shortfall looks challenging, speak with FINCO CAPITAL — we can structure the loan and income position to improve your chances of approval.</div>

        <hr class="hr"/>
        <div class="muted" style="margin-bottom: 8px;">Cash Flow (First Year)</div>
        <div>Annual Rent: $${fmt(annualRent)}</div>
        <div>Total Expenses: $${fmt(totalAnnualExpenses)}</div>
        <div>Net Rental Result: $${fmt(Math.abs(netRental))}</div>
        <div>Negative Gearing Benefit: $${fmt(taxBenefit)}</div>
        <div><strong>After-Tax Cash Flow:</strong> $${fmt(Math.abs(afterTaxCashFlow))}</div>

        <hr class="hr"/>
        <div class="muted" style="margin-bottom: 8px;">Key Metrics</div>
        <div>LVR: ${Number(lvrPct).toFixed(2)}%</div>
        <div>Rental Yield: ${rentalYield.toFixed(1)}%</div>
      </div>
    `;
    writeResults(html, 'home_investment');

    writeDetails('INPUT SUMMARY', `
      <div>Purchase Price: $${fmt(price)}</div>
      <div>Weekly Rent: $${fmt(weeklyRent, 0)}</div>
      <div>Loan Type: ${loanType === 'io' ? 'Interest Only' : 'Principal & Interest'}</div>
      <div>IO Period: ${ioYears} years</div>
      <div>Term: ${term} years</div>
      <div>Rate: ${ratePct.toFixed(2)}%</div>
      <hr class="hr"/>
      <div>Council: $${fmt(council)}</div>
      <div>Water/Sewer: $${fmt(water)}</div>
      <div>Insurance: $${fmt(insurance)}</div>
      <div>Maintenance: $${fmt(maintenance)}</div>
      <div>Mgmt Fees: ${Math.abs(mgmtPct*100).toFixed(1)}% of rent (~$${fmt(annualMgmt)}/yr)</div>
      <div>Marginal Tax Rate: ${(taxRate*100).toFixed(1)}%</div>
    `);

    window.updateLastCalc({ loanPurpose: 'home_investment' });
    $el('disclaimer').innerText = getDisclaimer('home_investment');
    toggleRepaymentScenariosSection(false);
    updateSummary();
    return true;
  }

  function handleSubmitEquityRelease(state) {
    // Use the same calculation and rendering as the Access Equity flow so behavior matches
    const equityAmount = num($el('equityAmount')?.value || 0);
    const ctx = {
      currentBalance: num($el('currentBalance')?.value || 0),
      equityAmount: equityAmount,
      loanTerm: num($el('loanTerm')?.value || 0),
      interestRatePct: (num($el('interestRate')?.value || 0)).toFixed(2),
      interestRate: num($el('interestRate')?.value || 0) / 100,
      propertyValue: num($el('propertyValue')?.value || 0),
      currentRatePct: (num($el('currentRate')?.value || 0)).toFixed(2),
      currentRate: num($el('currentRate')?.value || 0) / 100
    };

    const res = calcHomeEquityAccess(ctx);

    if (res.error === "MAX_LVR_EXCEEDED") {
      // Reuse the project's standard max-LVR message when the scenario is invalid
      writeResults(maxLVRErrorMessage, 'home_equity_release');
      window.updateLastCalc({ loanPurpose: 'home_equity_release' });
      $el('disclaimer').innerText = getDisclaimer('home_equity_release');
      return true;
    }

    // Build results HTML same as the Access Equity flow
    let html = `
      <div class="dash-col-header">RESULTS</div>
      <div class="dash-col-content">
        <div style="margin-bottom: 20px;">
          <h3>Total Funds Available (Estimate)</h3>
          <div class="big green">$${fmt(res.maxAccessible)}</div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3>Access Amount Requested</h3>
          <div class="big">$${fmt(equityAmount)}</div>
        </div>
    `;

    if (res.lmiPremium > 0) {
      html += `
        <div style="margin-bottom: 20px;">
          <h3>Estimated Lenders Mortgage Insurance (LMI)</h3>
          <div class="big">~$${fmt(res.lmiPremium)}</div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3>Capitalised Loan Amount</h3>
          <div class="big">$${fmt(res.totalLoanAmount)}</div>
        </div>
      `;
    }

    html += `
        <div style="margin-bottom: 20px;">
          <h3>Effective LVR</h3>
          <div class="big">${Number(res.effectiveLVR).toFixed(2)}%</div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3>New Monthly Repayment (Estimate)</h3>
          <div class="big" style="color: orange;">$${fmt(res.monthlyRepayment)}</div>
        </div>
      </div>
    `;

    writeResults(html, 'home_equity_release');

    // Prepare details context and expose selected purpose label for UI consumption
    const resForDetails = {
      ...res,
      baseLVR: Number(res.baseLVR).toFixed(2),
      effectiveLVR: Number(res.effectiveLVR).toFixed(2)
    };
    const purposeValue = $el('equityPrimaryPurpose')?.value || 'other';
    const purposeLabelMap = {
      home_renovation: 'Home Renovation',
      investment: 'Investment',
      debt_consolidation: 'Debt Consolidation',
      other: 'Other'
    };
    const equityPurposeLabel = purposeLabelMap[purposeValue] || 'Other';

    writeDetails('INPUT SUMMARY', `
      <div>Property Value: $${fmt(ctx.propertyValue)}</div>
      <div>Current Loan (Balance): $${fmt(ctx.currentBalance)}</div>
      <div>Access Amount Requested: $${fmt(ctx.equityAmount)}</div>
      <div>Current Rate: ${ctx.currentRatePct}%</div>
      <div>Interest Rate (used for calc): ${ctx.interestRatePct}%</div>
      <div>Loan Term: ${ctx.loanTerm} years</div>
      <hr class="hr"/>
      <div>Max Accessible: $${fmt(res.maxAccessible)}</div>
    `);

    window.updateLastCalc({
      loanPurpose: 'home_equity_release',
      baseLVR: res.baseLVR,
      loanAmount: res.baseLoanAmount,
      interestRate: ctx.interestRate,
      loanTerm: ctx.loanTerm,
      equityPurposeLabel
    });
    $el('disclaimer').innerText = getDisclaimer('home_equity_release');
    toggleRepaymentScenariosSection(false);
    updateSummary();
    return true;
  }

  function handleSubmitConstruction(state) {
    const type = $el('buildScenario').value;
    const rate = RATES.construction;

    let maxLoan = 0;
    let duringBuildMonthly = 0;
    let postBuildPNI = 0;
    let months = 12;
    let grossIncome = 0;
    let living = 0;
    let currentMortgageRepay = 0;
    let summaryBits = [];

    if (type === 'own_land') {
      const landValue = num($el('landValue').value);
      const landMortgaged = ($el('landMortgaged').value || 'no') === 'yes';
      const landMortgageBalance = landMortgaged ? num($el('landMortgageBalance').value || '0') : 0;
      const buildCost = num($el('buildCost').value);
      const addCosts = num($el('additionalCosts').value || '0');
      months = Math.max(6, Math.min(24, parseInt($el('buildMonths').value || '12', 10)));
      grossIncome = num($el('consGrossIncome').value);
      living = num($el('consLiving').value);
      currentMortgageRepay = num($el('consCurrentRepay').value);

      const totalConstructionAndCosts = buildCost + addCosts;
      const totalProjectValue = landValue + totalConstructionAndCosts;
      maxLoan = totalProjectValue * 0.8;

      duringBuildMonthly = (maxLoan * rate / 12) * CONSTRUCTION_AVG_DRAW_FACTOR;
      postBuildPNI = calcMonthlyRepayment(maxLoan, rate, DEFAULT_TERM_YEARS);

      summaryBits.push(`<div>Land Mortgaged: ${landMortgaged ? 'Yes' : 'No'} ${landMortgaged ? `(Balance: $${fmt(landMortgageBalance)})` : ''}</div>`);
      summaryBits.push(`<div>Total Project Value: $${fmt(totalProjectValue)} (Land $${fmt(landValue)} + Build $${fmt(buildCost)} + Add. $${fmt(addCosts)})</div>`);
    } else if (type === 'buy_land_build') {
      const landPrice = num($el('landPurchasePrice').value);
      const buildCost = num($el('buildCost').value);
      const addCosts = num($el('additionalCosts').value || '0');
      months = Math.max(6, Math.min(24, parseInt($el('buildMonths').value || '12', 10)));
      grossIncome = num($el('consGrossIncome').value);
      living = num($el('consLiving').value);

      const totalProjectValue = landPrice + buildCost + addCosts;
      maxLoan = totalProjectValue * 0.8;

      duringBuildMonthly = (maxLoan * rate / 12) * CONSTRUCTION_AVG_DRAW_FACTOR;
      postBuildPNI = calcMonthlyRepayment(maxLoan, rate, DEFAULT_TERM_YEARS);

      summaryBits.push(`<div>Total Project Value: $${fmt(totalProjectValue)} (Land $${fmt(landPrice)} + Build $${fmt(buildCost)} + Add. $${fmt(addCosts)})</div>`);
    } else {
      // reno_kdr
      const knockdownCost = num($el('knockdownCost').value);
      const buildCost = num($el('buildCost').value);
      const addCosts = num($el('additionalCosts').value || '0');
      months = Math.max(6, Math.min(24, parseInt($el('buildMonths').value || '12', 10)));
      currentMortgageRepay = num($el('consCurrentRepay').value);
      living = num($el('consLiving').value);
      grossIncome = num($el('consGrossIncome').value);

      const totalProjectCost = knockdownCost + buildCost + addCosts;
      // Without a property value, we’ll conservatively apply LVR to build costs only; still illustrative
      maxLoan = totalProjectCost * 0.8;

      duringBuildMonthly = (maxLoan * rate / 12) * CONSTRUCTION_AVG_DRAW_FACTOR;
      postBuildPNI = calcMonthlyRepayment(maxLoan, rate, DEFAULT_TERM_YEARS);

      summaryBits.push(`<div>Total Project Cost (KDR): $${fmt(totalProjectCost)} (KD $${fmt(knockdownCost)} + Build $${fmt(buildCost)} + Add. $${fmt(addCosts)})</div>`);
    }

    // Clamp negative values to $0 and signal no borrowable amount if needed
    if (maxLoan < 0 || isNaN(maxLoan)) maxLoan = 0;
    if (duringBuildMonthly < 0 || isNaN(duringBuildMonthly)) duringBuildMonthly = 0;
    if (postBuildPNI < 0 || isNaN(postBuildPNI)) postBuildPNI = 0;

    const netMonthlyIncome = (grossIncome / 12) * 0.68;
    const commitments = duringBuildMonthly + living + (currentMortgageRepay || 0);
    const ratio = netMonthlyIncome > 0 ? (commitments / netMonthlyIncome) : 99;

    let html = `
      <div class="dash-col-header">YOUR CONSTRUCTION PROJECT ESTIMATE</div>
      <div class="dash-col-content">
        <div class="muted" style="margin-bottom: 8px;">1) Loan Estimate</div>
        <div>Estimated Maximum Loan Amount (80% LVR): <strong>$${fmt(maxLoan)}</strong></div>
        ${maxLoan === 0 ? `<div class="muted" style="margin-top: 6px;">No borrowable amount based on the current inputs.</div>` : ''}

        <hr class="hr"/>
        <div class="muted" style="margin-bottom: 8px;">2) Repayment Estimate</div>
        <div>During Construction (Interest Only): ~<strong>$${fmt(duringBuildMonthly)}</strong>/month</div>
        <div>After Construction (P&I): ~<strong>$${fmt(postBuildPNI)}</strong>/month @ ${(rate*100).toFixed(1)}%</div>

        <hr class="hr"/>
        <div class="muted" style="margin-bottom: 8px;">3) Indicative Affordability</div>
        <div>Estimated Monthly Commitments (avg build payment + living + current mortgage): ~$${fmt(commitments)}</div>
        <div>Estimated Monthly Net Income: ~$${fmt(netMonthlyIncome)}</div>
        <div style="margin-top:8px;">${affordabilityBadge(ratio)}</div>
      </div>
    `;
    writeResults(html, 'home_construction');

    writeDetails('INPUT SUMMARY', `
      <div>Type: ${type === 'own_land' ? 'Build on land I own' : type === 'buy_land_build' ? 'Purchase land and build' : 'Knock-down rebuild'}</div>
      <div>Estimated Construction Period: ${months} months</div>
      <div>Assumed Construction Rate: ${(rate*100).toFixed(1)}% p.a.</div>
      ${summaryBits.join('')}
    `);

    window.updateLastCalc({ loanPurpose: 'home_construction' });
    $el('disclaimer').innerText = getDisclaimer('home_construction');
    toggleRepaymentScenariosSection(false);
    updateSummary();
    return true;
  }

  // Remove duplicate Equity Release menu option programmatically (so we don’t have to edit ui.js)
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const sel = document.getElementById('loanPurpose');
      if (sel) {
        const dup = Array.from(sel.options).find(o => o.value === 'home_equity_release');
        if (dup) sel.removeChild(dup);
      }
    } catch (e) {}
  });

  // ============= PUBLIC API =============
  window.homeExtras = {
    renderFields: function (loanType) {
      switch (loanType) {
        case 'home_bridging': return renderFieldsBridging();
        case 'home_next_home': return renderFieldsNextHome();
        case 'home_investment': return renderFieldsInvestment();
        case 'home_equity_release': return renderFieldsEquityRelease(); // Kept; removed from picker by DOM tweak
        case 'home_construction': return renderFieldsConstruction();
        default: return false;
      }
    },
    handleSubmit: function (loanPurpose) {
      const state = ($el('stateSelect')?.value) || '';
      if (!loanPurpose) return false;
      switch (loanPurpose) {
        case 'home_bridging': return handleSubmitBridging(state);
        case 'home_next_home': return handleSubmitNextHome(state);
        case 'home_investment': return handleSubmitInvestment(state);
        case 'home_equity_release': return handleSubmitEquityRelease(state);
        case 'home_construction': return handleSubmitConstruction(state);
        default: return false;
      }
    }
  };
})();
