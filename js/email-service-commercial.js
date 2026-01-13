(function(){
  console.log('📧 [Commercial] email-service-commercial.js loading...');

  // Commercial-specific EmailJS config
  const EMAILJS_SERVICE_ID_COMMERCIAL = 'service_y3uxg4s';
  const EMAILJS_TEMPLATE_ID_COMMERCIAL = 'template_zoiyz49';
  const EMAILJS_PUBLIC_KEY = 'CM3iDUqeWtaSmwhPl';

  // Initialize EmailJS on script load
  function initializeEmailJS() {
    try {
      if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_PUBLIC_KEY);
        window.emailjsReady = true;
        console.log('✅ [Commercial] EmailJS initialized successfully');
        return true;
      } else {
        console.warn('⚠️ [Commercial] EmailJS library not found - waiting for it to load');
        setTimeout(initializeEmailJS, 500);
        return false;
      }
    } catch (err) {
      console.error('❌ [Commercial] EmailJS init failed:', err);
      return false;
    }
  }

  function isEmailJsReady() {
    if (typeof emailjs === 'undefined') {
      console.warn('⚠️ [Commercial] emailjs library not available');
      return false;
    }
    if (!window.emailjsReady) {
      console.log('📧 [Commercial] Attempting EmailJS initialization...');
      initializeEmailJS();
    }
    return window.emailjsReady === true;
  }

  // Compute LVR with consistent fallbacks used by both email and PDF generators
  function computeLVR(calculationData = {}, formInputs = {}) {
    const parseNumber = (v) => {
      if (v === undefined || v === null) return NaN;
      const s = String(v).replace(/[^0-9.\-]/g, '');
      const n = parseFloat(s);
      return isNaN(n) ? NaN : n;
    };

    const candidates = [
      calculationData.effectiveLVR,
      calculationData.baseLVR,
      calculationData.lvr,
      calculationData.lvr_percent,
      calculationData.lvrPercent,
      calculationData.LVR,
      formInputs.lvr,
      formInputs.LVR,
      formInputs.lvrPercent,
      formInputs.lvr_percent,
      (window.lastCalc && window.lastCalc.effectiveLVR),
      (window.lastCalc && window.lastCalc.baseLVR),
      (window.lastCalc && window.lastCalc.lvr),
      (window.lastCalc && window.lastCalc.LVR),
      document.getElementById('lvr')?.value,
      document.getElementById('LVR')?.value,
      document.getElementById('lvrPercent')?.value,
      document.getElementById('lvr_percent')?.value,
    ];

    for (const c of candidates) {
      const n = parseNumber(c);
      if (!isNaN(n) && n > 0) return n;
    }

    // Try computing from loan amount / property value
    const loanFromCalc = parseNumber(calculationData.loanAmount) || parseNumber(calculationData.totalLoanAmount) || parseNumber(formInputs.loanAmount) || parseNumber(formInputs.totalLoanAmount) || parseNumber(window.lastCalc?.loanAmount) || NaN;

    const propCandidates = [
      formInputs.propertyValue,
      formInputs.property_value,
      formInputs.purchasePrice,
      formInputs.purchase_price,
      calculationData.propertyValue,
      calculationData.property_value,
      calculationData.purchasePrice,
      calculationData.purchase_price,
      window.lastCalc?.propertyValue,
      window.lastCalc?.property_value,
      document.getElementById('propertyValue')?.value,
      document.getElementById('property_value')?.value,
      document.getElementById('purchasePrice')?.value,
      document.getElementById('purchase_price')?.value,
    ];
    let propFromCalc = NaN;
    for (const p of propCandidates) {
      const n = parseNumber(p);
      if (!isNaN(n) && n > 0) { propFromCalc = n; break; }
    }

    if (!isNaN(loanFromCalc) && !isNaN(propFromCalc) && propFromCalc > 0) {
      return Math.round((loanFromCalc / propFromCalc) * 10000) / 100;
    }

    // Last fallback: if we at least have a property value, assume conservative default 70%
    if (!isNaN(propFromCalc) && propFromCalc > 0) return 70;

    return NaN;
  }

  /**
   * Build Commercial-specific insights based on loan type and metrics
   * Dynamic content for all 6 commercial loan types
   */
  function buildCommercialInsightsByLoanType(loanType, lvr, debtServiceRatio, yearsInBusiness) {
    let insights = '';
    let nextStep = '';

    // Base commercial insights (universal context)
    const baseInsights = `Commercial lenders assess cashflow strength, industry type, security position, trading history and director experience. Financial ratios — such as Gearing, ICR and serviceability — shape lender appetite and pricing tiers. Pricing varies significantly with loan size, security offered and industry risk classification. Adjusting loan structure, collateral or financial documentation may improve lender options or pricing.`;

    const loanTypeNorm = String(loanType || '').toLowerCase().trim();

    if (loanTypeNorm.includes('property') || loanTypeNorm.includes('commercial-property') || loanTypeNorm.includes('commercial_repayment')) {
      // 🟦 1. COMMERCIAL PROPERTY FINANCE
      insights = `COMMERCIAL PROPERTY FINANCE

• Lenders assess LVR, lease quality, tenant strength, yield and property type when determining appetite.
• Interest Coverage Ratio (ICR) and net passing income are key drivers of approval and pricing.
• Security type (office, industrial, retail, specialised asset) materially affects loan terms and maximum LVR.
• Longer lease terms and stable tenants can unlock sharper pricing and higher borrowing capacity.
• If owner-occupied, serviceability relies more heavily on business financials rather than rental income.`;
      nextStep = `Your Finco specialist will assess your property type, lease profile, cashflow position and target LVR to outline suitable commercial property lenders and indicative terms.`;
    } else if (loanTypeNorm.includes('equipment') || loanTypeNorm.includes('equipment_asset') || loanTypeNorm.includes('asset')) {
      // 🟧 2. EQUIPMENT FINANCE
      insights = `EQUIPMENT FINANCE

• Lender appetite varies based on equipment type, age, industry use and whether the asset is new or used.
• Many lenders offer streamlined approvals for essential equipment supporting core operations.
• Asset-backed structures can reduce the need for additional security or director guarantees.
• Matching loan term to asset life optimises cashflow and minimises residual risk.
• Strong trading history and clear evidence of business use enhance approval prospects.`;
      nextStep = `Your Finco specialist will outline lender options for your specific equipment type, review the most efficient structures and confirm documentation requirements for a streamlined approval.`;
    } else if (loanTypeNorm.includes('invoice') || loanTypeNorm.includes('invoice_finance') || loanTypeNorm.includes('debtor')) {
      // 🟨 3. INVOICE / DEBTOR FINANCE
      insights = `INVOICE FINANCE

• Facility size and pricing depend on debtor quality, concentration risk, invoice terms and payment history.
• Faster cashflow can reduce reliance on overdrafts and improve working capital stability.
• Lenders may require debtor reporting, aged receivables summaries and verification processes.
• Businesses with long payment cycles or large credit terms often benefit most from invoice finance.
• Strong debtor diversification and low disputes typically secure better pricing.`;
      nextStep = `Your Finco specialist will assess your debtor book, concentration levels and invoice cycles to recommend suitable invoice finance structures and outline approval documentation.`;
    } else if (loanTypeNorm.includes('unsecured') || loanTypeNorm.includes('working-capital') || loanTypeNorm.includes('working_capital')) {
      // 🟥 4. UNSECURED WORKING CAPITAL LOANS
      insights = `UNSECURED WORKING CAPITAL LOANS

• Approval relies heavily on cashflow strength, bank statements, trading history and industry risk.
• Unsecured pricing varies widely and can be reduced with stronger financials or lower loan amounts.
• Facilities may be structured as lump-sum loans, revolving limits or short-term cashflow boosters.
• Lenders may review BAS, bank statements, P&L, tax returns and director credit history.
• High seasonal fluctuation or irregular revenue may require additional documentation.`;
      nextStep = `Your Finco specialist will review your bank statements, BAS and cashflow position to match you with suitable unsecured lenders and outline expected pricing and terms.`;
    } else if (loanTypeNorm.includes('overdraft')) {
      // 🟩 5. BUSINESS OVERDRAFT
      insights = `BUSINESS OVERDRAFT

• Overdraft approvals depend on turnover stability, account conduct, business cashflow and trading history.
• This facility is ideal for managing short-term fluctuations rather than long-term capital needs.
• Secured overdrafts may offer lower pricing than unsecured facilities.
• Lenders may request financial statements, bank statements and debt schedules.
• Proper limit sizing is essential to maintain cost efficiency and lender appetite.`;
      nextStep = `Your Finco specialist will analyse your cashflow cycles and account conduct to determine appropriate overdraft limits and match you with lenders offering competitive terms.`;
    } else if (loanTypeNorm.includes('acquisition') || loanTypeNorm.includes('business-acquisition') || loanTypeNorm.includes('business_acquisition')) {
      // 🟪 6. BUSINESS ACQUISITION LOANS
      insights = `BUSINESS ACQUISITION LOANS

• Lenders assess business valuation, historical financials, industry risk and buyer experience.
• Serviceability relies on the ongoing cashflow of the target business post-acquisition.
• Stronger security or partial property backing can improve pricing and loan terms.
• Detailed due diligence — including P&L, tax returns, contracts and forecasts — is typically required.
• Specialist lenders may support goodwill-heavy acquisitions where banks are more conservative.`;
      nextStep = `Your Finco specialist will review financials, valuation, due-diligence documents and your acquisition strategy to outline lender pathways and indicative terms for the purchase.`;
    } else {
      // DEFAULT: GENERAL COMMERCIAL
      insights = `COMMERCIAL LENDING

• Lenders assess cashflow strength, industry type, security position, trading history and director experience.
• Financial ratios — such as Gearing, ICR and serviceability — shape lender appetite and pricing tiers.
• Pricing varies significantly with loan size, security offered and industry risk classification.
• Adjusting loan structure, collateral or financial documentation may improve lender options or pricing.
• Your specialist will tailor the approach to match your specific business and funding objectives.`;
      nextStep = `Your specialist will assess your business performance, financial ratios, industry risk and funding needs to recommend the most suitable commercial pathway.`;
    }

    return { insights, nextStep };
  }

  /**
   * Send Commercial calculation results via email
   */
  window.sendCommercialCalculationResultsEmail = async function (calculationData, loanCategory, loanPurpose, formInputs = {}) {
    try {
      console.log('📧 [Commercial] sendCommercialCalculationResultsEmail invoked', { loanCategory, loanPurpose, hasEmail: !!formInputs.user_email });

      // Wait for EmailJS library to be available
      let attempts = 0;
      while (typeof emailjs === 'undefined' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (typeof emailjs === 'undefined') {
        console.error('❌ [Commercial] EmailJS library not loaded');
        return false;
      }

      const effectiveLoanCategory = loanCategory || formInputs.loanCategory || document.getElementById('loanCategory')?.value || (window.lastCalc && window.lastCalc.loanCategory) || '';
      if (String(effectiveLoanCategory).toLowerCase() !== 'commercial') {
        console.warn('📧 [Commercial] sendCommercialCalculationResultsEmail: abort — not commercial category', effectiveLoanCategory);
        return false;
      }

      if (!formInputs.user_email) {
        console.warn('📧 [Commercial] user_email missing');
        alert('Please enter your email address');
        return false;
      }

      // Extract form fields with comprehensive fallbacks
      const lvr = calculationData.effectiveLVR || calculationData.baseLVR || 0;
      const chosenPropertyRaw = formInputs.propertyValue || formInputs.property_value || formInputs.purchasePrice || formInputs.purchase_price || calculationData.propertyValue || calculationData.property_value || calculationData.purchasePrice || calculationData.purchase_price || (window.lastCalc && window.lastCalc.propertyValue) || (window.lastCalc && window.lastCalc.property_value) || document.getElementById('propertyValue')?.value || document.getElementById('property_value')?.value || document.getElementById('purchasePrice')?.value || document.getElementById('purchase_price')?.value || '';
      const chosenDepositRaw = formInputs.depositAmount || formInputs.deposit_amount || formInputs.deposit || calculationData.depositAmount || calculationData.deposit_amount || calculationData.deposit || (window.lastCalc && window.lastCalc.deposit) || (window.lastCalc && window.lastCalc.depositAmount) || (window.lastCalc && window.lastCalc.deposit_amount) || document.getElementById('depositAmount')?.value || document.getElementById('deposit_amount')?.value || document.getElementById('deposit')?.value || '';
      const chosenState = formInputs.state || formInputs.stateSelect || document.getElementById('stateSelect')?.value || '';

      const formatValue = (raw) => {
        if (raw === undefined || raw === null) return 'N/A';
        const s = String(raw).trim();
        if (s === '') return 'N/A';
        const num = parseFloat(s.replace(/[^0-9.\-]/g, ''));
        return isNaN(num) ? String(raw) : '$' + (typeof window.fmt === 'function' ? window.fmt(num) : Number(num).toLocaleString());
      };

      // Parse numeric values
      const parseNumber = (v) => {
        if (v === undefined || v === null) return NaN;
        const s = String(v).replace(/[^0-9.\-]/g, '');
        const n = parseFloat(s);
        return isNaN(n) ? NaN : n;
      };

      // Compute LVR using centralized helper
      const lvrNum = computeLVR(calculationData, formInputs);

      // Loan type and insights
      const loanType = formInputs.loanPurpose || formInputs.loan_purpose || loanPurpose || '';
      const debtServiceRatio = calculationData.debtServiceRatio || calculationData.debt_service_ratio || '';
      const yearsInBusiness = calculationData.yearsInBusiness || calculationData.years_in_business || '';
      const gearingRatio = calculationData.gearingRatio || calculationData.gearing_ratio || calculationData.debtToEbitda || '';
      const icr = calculationData.icr || calculationData.interest_coverage_ratio || calculationData.interestCoverageRatio || '';
      const securityType = calculationData.securityType || calculationData.security_type || formInputs.securityType || formInputs.security_type || '';
      
      const dynamicText = buildCommercialInsightsByLoanType(loanType, lvrNum, debtServiceRatio, yearsInBusiness);

      // Estimated loan amount with fallbacks
      let estimatedLoanAmountRaw = calculationData.loanAmount || calculationData.totalLoanAmount || calculationData.baseLoanAmount || calculationData.estimatedLoanAmount || calculationData.loan_amount || null;
      let estimatedLoanAmountNum = parseNumber(estimatedLoanAmountRaw);

      // Pre-calc parsed property and deposit for consistent debugging and fallback use
      const propNum = parseNumber(chosenPropertyRaw);
      const depNum = parseNumber(chosenDepositRaw);

      // Debug: print candidate values used to compute loan amount
      console.log('🔍 [Commercial][Debug] email loan-calc candidates', {
        calculationDataLoanRaw: estimatedLoanAmountRaw,
        calculationDataLoanParsed: parseNumber(estimatedLoanAmountRaw),
        window_lastCalc_loan: window.lastCalc?.loanAmount || window.lastCalc?.totalLoanAmount || null,
        formInputsLoan: formInputs.loanAmount || formInputs.totalLoanAmount || null,
        propertyRaw: chosenPropertyRaw,
        propertyNum: propNum,
        depositRaw: chosenDepositRaw,
        depositNum: depNum,
        lvrUsed: lvrNum
      });

      if (isNaN(estimatedLoanAmountNum)) {
        if (!isNaN(propNum) && !isNaN(depNum) && propNum > 0) {
          estimatedLoanAmountNum = Math.max(0, propNum - depNum);
        } else if (!isNaN(propNum) && !isNaN(lvrNum) && lvrNum > 0 && propNum > 0) {
          estimatedLoanAmountNum = Math.round(propNum * (Number(lvrNum) / 100));
        } else if (!isNaN(propNum) && propNum > 0) {
          // If we have property value but no way to calculate loan, use 80% LVR as fallback
          estimatedLoanAmountNum = Math.round(propNum * 0.8);
        }
      }

      console.log('🔍 [Commercial][Debug] email computed loan', { estimatedLoanAmountNum });
      const estimatedLoanAmount = !isNaN(estimatedLoanAmountNum) && estimatedLoanAmountNum > 0 ? estimatedLoanAmountNum : '';

      // Determine serviceability indicator
      let serviceabilityIndicator = 'Moderate';
      let serviceabilityColor = '#fef08a';
      try {
        const dsr = parseFloat(debtServiceRatio) || 0;
        const icr_num = parseFloat(icr) || 0;
        if ((dsr <= 1.5 && icr_num >= 2.5) || icr_num >= 3) { serviceabilityIndicator = 'Strong'; serviceabilityColor = '#dcfce7'; }
        else if (dsr <= 2.5 || icr_num >= 1.5) { serviceabilityIndicator = 'Moderate'; serviceabilityColor = '#fef9c3'; }
        else { serviceabilityIndicator = 'Higher Risk'; serviceabilityColor = '#fee2e2'; }
      } catch (e) { /* ignore */ }

      // Calculate risk position (0-100) based on LVR
      const riskPosition = Math.max(0, Math.min(100, Number(lvrNum) || 0));

      // Build scenario note
      let scenarioNote = 'Your commercial financing has been analyzed. ';
      if (lvrNum > 80) {
        scenarioNote += 'High LVR detected. ';
      } else if (lvrNum <= 60) {
        scenarioNote += 'Conservative positioning. ';
      }
      if (parseFloat(icr) > 2.5) {
        scenarioNote += 'Strong interest coverage. ';
      }
      scenarioNote += 'Contact Finco Capital to explore your lender options.';

      const payload = {
        /* Core/common */
        to_email: formInputs.user_email,
        customer_name: formInputs.user_full_name || 'Client',
        state: chosenState || 'N/A',
        loan_category: 'Commercial Loan',
        loan_purpose: loanType || 'N/A',
        reference_id: 'COMM-' + Math.floor(Math.random() * 90000 + 10000),
        timestamp: new Date().toLocaleString('en-AU'),

        /* New template-specific placeholders for commercial */
        funding_amount: (estimatedLoanAmount !== '' && !isNaN(estimatedLoanAmount)) ? ('$' + (typeof window.fmt === 'function' ? window.fmt(estimatedLoanAmount) : Number(estimatedLoanAmount).toLocaleString())) : 'N/A',
        facility_type: loanType || 'N/A',
        business_purpose: loanType || 'N/A',
        commercial_lvr: (!isNaN(lvrNum) ? Number(lvrNum).toFixed(2) : 'N/A'),
        gearing_ratio: gearingRatio ? Number(gearingRatio).toFixed(2) : 'N/A',
        icr: icr ? Number(icr).toFixed(2) : 'N/A',
        serviceability_indicator: serviceabilityIndicator,
        serviceability_color: serviceabilityColor,
        security_type: securityType || 'N/A',
        trading_history: yearsInBusiness || 'N/A',
        risk_position: riskPosition,
        scenario_note: scenarioNote,

        /* Backwards-compatible fields */
        property_purchase_price: formatValue(chosenPropertyRaw),
        estimated_commercial_loan_amount: (estimatedLoanAmount !== '' && !isNaN(estimatedLoanAmount)) ? ('$' + (typeof window.fmt === 'function' ? window.fmt(estimatedLoanAmount) : Number(estimatedLoanAmount).toLocaleString())) : 'N/A',
        commercial_deposit_balance: formatValue(chosenDepositRaw),
        debt_service_ratio: debtServiceRatio ? Number(debtServiceRatio).toFixed(2) : 'N/A',
        years_in_business: yearsInBusiness || 'N/A',
        loan_type: loanType || 'N/A',
        property_value: formatValue(chosenPropertyRaw),
        deposit_amount: formatValue(chosenDepositRaw),
        loan_amount: (estimatedLoanAmount !== '' && !isNaN(estimatedLoanAmount)) ? ('$' + (typeof window.fmt === 'function' ? window.fmt(estimatedLoanAmount) : Number(estimatedLoanAmount).toLocaleString())) : 'N/A',
        monthly_repayment: (calculationData.monthlyRepayment !== undefined && calculationData.monthlyRepayment !== null && calculationData.monthlyRepayment !== '') ? ('$' + (typeof window.fmt === 'function' ? window.fmt(calculationData.monthlyRepayment) : Number(calculationData.monthlyRepayment).toLocaleString()) + ' / month') : 'N/A',
        lvr_percent: (!isNaN(lvrNum) ? Number(lvrNum).toFixed(2) + '%' : 'N/A'),
        key_insights: dynamicText.insights || 'N/A',
        next_steps: dynamicText.nextStep,
        user_agent: navigator.userAgent
      };

      console.log('📧 [Commercial] payload:', payload);

      // Ensure EmailJS is initialized with commercial public key before sending
      if (typeof emailjs !== 'undefined') {
        try {
          emailjs.init(EMAILJS_PUBLIC_KEY);
          console.log('✅ [Commercial] EmailJS initialized for commercial service');
        } catch (err) {
          console.error('❌ [Commercial] EmailJS init failed', err);
        }
      }

      const resp = await emailjs.send(EMAILJS_SERVICE_ID_COMMERCIAL, EMAILJS_TEMPLATE_ID_COMMERCIAL, payload);
      console.log('📧 [Commercial] response:', resp);

      const ok = resp && resp.status === 200;
      if (ok) {
        console.log('✅ [Commercial] Email sent to', formInputs.user_email);
      }
      return ok;
    } catch (err) {
      console.error('❌ [Commercial] email send failed', err);
      return false;
    }
  };

  /**
   * Download Commercial calculation results as PDF
   */
  window.downloadCommercialResultsAsPDF = async function (filename = 'finco-commercial-results') {
    try {
      const results = window.lastCalc || {};
      if (!results || Object.keys(results).length === 0) {
        alert('Please run a calculation first to generate results.');
        return false;
      }

      const loanCategory = document.getElementById('loanCategory')?.value || (window.lastCalc && window.lastCalc.loanCategory) || '';
      if (String(loanCategory).toLowerCase() !== 'commercial') {
        alert('PDF downloads are available for Commercial calculators only.');
        return false;
      }

      const loanPurpose = document.getElementById('loanPurpose')?.value || (window.lastCalc && window.lastCalc.loanPurpose) || '';
      const formInputs = (typeof captureFormInputs === 'function') ? captureFormInputs() : {};

      // Compute LVR using centralized helper (keeps email and PDF consistent)
      let lvr = computeLVR(results, formInputs);

      // Extract property value with multiple fallbacks
      const chosenPropertyRaw = formInputs.propertyValue || formInputs.property_value || formInputs.purchasePrice || formInputs.purchase_price || results.propertyValue || results.property_value || results.purchasePrice || results.purchase_price || document.getElementById('propertyValue')?.value || document.getElementById('property_value')?.value || document.getElementById('purchasePrice')?.value || document.getElementById('purchase_price')?.value || '';
      
      // Extract deposit with multiple fallbacks
      const chosenDepositRaw = formInputs.depositAmount || formInputs.deposit_amount || formInputs.deposit || results.deposit || results.depositAmount || results.deposit_amount || window.lastCalc?.deposit || window.lastCalc?.depositAmount || window.lastCalc?.deposit_amount || document.getElementById('depositAmount')?.value || document.getElementById('deposit_amount')?.value || document.getElementById('deposit')?.value || '';
      const chosenState = formInputs.state || formInputs.stateSelect || document.getElementById('stateSelect')?.value || '';

      const formatValue = (raw) => {
        if (raw === undefined || raw === null) return 'N/A';
        const s = String(raw).trim();
        if (s === '') return 'N/A';
        const num = parseFloat(s.replace(/[^0-9.\-]/g, ''));
        return isNaN(num) ? String(raw) : '$' + (typeof window.fmt === 'function' ? window.fmt(num) : Number(num).toLocaleString());
      };

      const propertyValue = formatValue(chosenPropertyRaw);
      const depositAmount = formatValue(chosenDepositRaw);
      
      // Loan amount with multiple fallbacks and calculation
      let estimatedLoanAmountRaw = results.loanAmount || results.totalLoanAmount || results.baseLoanAmount || results.estimatedLoanAmount || results.loan_amount || window.lastCalc?.loanAmount || window.lastCalc?.totalLoanAmount || window.lastCalc?.baseLoanAmount || window.lastCalc?.estimatedLoanAmount || window.lastCalc?.loan_amount || document.getElementById('loanAmount')?.value || null;

      // Ensure parseNumber exists in this scope (local fallback)
      const parseNumber = (v) => {
        if (v === undefined || v === null) return NaN;
        const s = String(v).replace(/[^0-9.\-]/g, '');
        const n = parseFloat(s);
        return isNaN(n) ? NaN : n;
      };

      let estimatedLoanAmountNum = parseNumber(estimatedLoanAmountRaw) || NaN;

      // Pre-calc parsed property and deposit for consistent debugging and fallback use
      const propNum = parseNumber(chosenPropertyRaw);
      const depNum = parseNumber(chosenDepositRaw);

      // Debug: print candidate values used to compute loan amount (PDF path)
      console.log('🔍 [Commercial][Debug] pdf loan-calc candidates', {
        resultsLoanRaw: estimatedLoanAmountRaw,
        resultsLoanParsed: parseNumber(estimatedLoanAmountRaw),
        window_lastCalc_loan: window.lastCalc?.loanAmount || window.lastCalc?.totalLoanAmount || null,
        domLoanField: document.getElementById('loanAmount')?.value || null,
        propertyRaw: chosenPropertyRaw,
        propertyNum: propNum,
        depositRaw: chosenDepositRaw,
        depositNum: depNum,
        lvrUsed: lvr
      });

      if (isNaN(estimatedLoanAmountNum)) {
        if (!isNaN(propNum) && !isNaN(depNum) && propNum > 0) {
          estimatedLoanAmountNum = Math.max(0, propNum - depNum);
        } else if (!isNaN(propNum) && !isNaN(lvr) && lvr > 0 && propNum > 0) {
          estimatedLoanAmountNum = Math.round(propNum * (Number(lvr) / 100));
        } else if (!isNaN(propNum) && propNum > 0) {
          // If we have property value but no way to calculate loan, use 80% LVR as fallback
          estimatedLoanAmountNum = Math.round(propNum * 0.8);
        }
      }

      console.log('🔍 [Commercial][Debug] pdf computed loan', { estimatedLoanAmountNum });
      
      const loanAmount = (!isNaN(estimatedLoanAmountNum) && estimatedLoanAmountNum > 0) ? ('$' + (typeof window.fmt === 'function' ? window.fmt(estimatedLoanAmountNum) : Number(estimatedLoanAmountNum).toLocaleString())) : (propertyValue !== 'N/A' ? propertyValue : 'N/A');
      
      const monthlyRepayment = results.monthlyRepayment ? '$' + (typeof window.fmt === 'function' ? window.fmt(results.monthlyRepayment) : Number(results.monthlyRepayment).toLocaleString()) + ' / month' : 'N/A';
      const lvr_percent = (lvr !== undefined && lvr !== null) ? String(lvr) + '%' : 'N/A';
      
      // Extract all commercial metrics
      const debtServiceRatio = results.debtServiceRatio || results.debt_service_ratio || 'N/A';
      const yearsInBusiness = results.yearsInBusiness || results.years_in_business || 'N/A';
      const gearingRatio = results.gearingRatio || results.gearing_ratio || results.debtToEbitda || 'N/A';
      const icr = results.icr || results.interest_coverage_ratio || results.interestCoverageRatio || 'N/A';
      const securityType = results.securityType || results.security_type || formInputs.securityType || formInputs.security_type || 'N/A';
      
      // Determine serviceability indicator
      let serviceabilityIndicator = 'Moderate';
      let serviceabilityColor = '#fef08a';
      try {
        const dsr = parseFloat(debtServiceRatio) || 0;
        const icr_num = parseFloat(icr) || 0;
        if ((dsr <= 1.5 && icr_num >= 2.5) || icr_num >= 3) { serviceabilityIndicator = 'Strong'; serviceabilityColor = '#dcfce7'; }
        else if (dsr <= 2.5 || icr_num >= 1.5) { serviceabilityIndicator = 'Moderate'; serviceabilityColor = '#fef9c3'; }
        else { serviceabilityIndicator = 'Higher Risk'; serviceabilityColor = '#fee2e2'; }
      } catch (e) { /* ignore */ }
      
      // Calculate risk position (0-100) based on LVR
      const riskPosition = Math.max(0, Math.min(100, Number(lvr) || 0));
      
      // Build scenario note
      let scenario_note = 'Your commercial financing has been analyzed. ';
      if (lvr > 80) {
        scenario_note += 'High LVR detected. ';
      } else if (lvr <= 60) {
        scenario_note += 'Conservative positioning. ';
      }
      if (parseFloat(icr) > 2.5) {
        scenario_note += 'Strong interest coverage. ';
      }
      scenario_note += 'Contact Finco Capital to explore your lender options.';

      // Get commercial-specific insights
      const dynamicText = buildCommercialInsightsByLoanType(loanPurpose, lvr, debtServiceRatio, yearsInBusiness);

      // Build Commercial-specific HTML for PDF using the new template
      const htmlContent = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
<tr>
<td align="center">

<!-- ================= HEADER ================= -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;">
<tr>
<td width="33%" style="padding:16px;">
  <img src="https://mediumslateblue-mantis-913186.hostingersite.com/assests/finko-removebg-preview.png"
       width="120" style="display:block;background:#fff;">
  <div style="font-size:12px;color:#fff;font-style:italic;margin-top:6px;">
    Financial Confidence. Unlocked.
  </div>
</td>

<td width="34%" align="center" style="color:#f59e0b;font-size:18px;font-weight:bold;">
  Your Preliminary<br>Commercial Finance Estimate
</td>

<td width="33%" align="right" style="padding:16px;color:#fff;font-size:12px;">
  <strong>Ref:</strong> COMM${Math.floor(Math.random() * 90000 + 10000)}<br>
  <strong>Date:</strong> ${new Date().toLocaleString('en-AU')}
</td>
</tr>
</table>

<!-- ================= MAIN CARD ================= -->
<table width="100%" cellpadding="0" cellspacing="0"
style="max-width:600px;background:#ffffff;border-radius:8px;padding:24px;margin-top:20px;margin-bottom:20px;">

<!-- INTRO -->
<tr>
<td style="font-size:14px;color:#374151;line-height:1.6;">
  Dear <strong>${formInputs.user_full_name || 'Valued Client'}</strong>,<br><br>
  Thank you for requesting a call-back. Your Finco Capital commercial lending specialist is now preparing your tailored strategy session.
</td>
</tr>

<!-- ================= JOURNEY ================= -->
<tr>
<td style="padding-top:30px;">

<div style="font-size:20px;font-weight:bold;color:#f59e0b;margin-bottom:20px;">
  Where you are in the journey
</div>

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
  <td align="center" style="font-size:13px;">1. Online Enquiry</td>
  <td></td>
  <td align="center" style="font-size:13px;font-weight:bold;">2. Preliminary Estimate</td>
  <td></td>
  <td align="center" style="font-size:13px;">3. Strategy Session</td>
</tr>

<tr>
  <td align="center">
    <div style="border:2px solid #111827;width:30px;height:30px;line-height:28px;font-weight:bold;">1</div>
  </td>

  <td width="50%">
    <div style="height:3px;background:#d1d5db;"></div>
  </td>

  <td align="center">
    <div style="background:#f59e0b;color:#fff;border:2px solid #f59e0b;width:32px;height:32px;line-height:30px;font-weight:bold;">2</div>
  </td>

  <td width="100%">
    <div style="height:3px;background:#d1d5db;"></div>
  </td>

  <td align="center">
    <div style="border:2px solid #111827;width:30px;height:30px;line-height:28px;font-weight:bold;">3</div>
  </td>
</tr>
</table>

</td>
</tr>

<!-- ================= SNAPSHOT ================= -->
<tr>
<td style="padding-top:40px;">
  <div style="font-size:20px;font-weight:bold;">
    Snapshot of your scenario
  </div>
  <div style="font-size:12px;color:#6b7280;margin-bottom:15px;">
    (based on the details you entered)
  </div>

  <table width="100%" cellpadding="10" cellspacing="0"
         style="border:1px solid #d1d5db;border-collapse:collapse;font-size:14px;">

    <tr>
      <td style="padding:12px;border-right:1px solid #d1d5db;background:#f9fafb;">Funding Amount Requested</td>
      <td style="padding:12px;font-weight:bold;text-align:right;background:#f9fafb;">${loanAmount}</td>
    </tr>

    <tr>
      <td style="padding:12px;border-right:1px solid #d1d5db;">Facility Type</td>
      <td style="padding:12px;font-weight:bold;text-align:right;">${loanPurpose || 'N/A'}</td>
    </tr>

    <tr>
      <td style="padding:12px;border-right:1px solid #d1d5db;">Business Purpose</td>
      <td style="padding:12px;font-weight:bold;text-align:right;">${loanPurpose || 'N/A'}</td>
    </tr>

    <tr>
      <td style="padding:12px;border-right:1px solid #d1d5db;">Commercial LVR</td>
      <td style="padding:12px;font-weight:bold;text-align:right;">${lvr_percent}</td>
    </tr>

    <tr>
      <td style="padding:12px;border-right:1px solid #d1d5db;">Gearing Ratio (Debt / EBITDA)</td>
      <td style="padding:12px;font-weight:bold;text-align:right;">${typeof gearingRatio === 'string' ? gearingRatio : (gearingRatio ? gearingRatio.toFixed(2) : 'N/A')}x</td>
    </tr>

    <tr>
      <td style="padding:12px;border-right:1px solid #d1d5db;">Interest Coverage Ratio (ICR)</td>
      <td style="padding:12px;font-weight:bold;text-align:right;">${typeof icr === 'string' ? icr : (icr ? icr.toFixed(2) : 'N/A')}x</td>
    </tr>

    <tr>
      <td style="padding:12px;border-right:1px solid #d1d5db;">Serviceability Indicator</td>
      <td style="padding:12px;font-weight:bold;text-align:right;color:${serviceabilityColor};">
        ${serviceabilityIndicator}
      </td>
    </tr>

    <tr>
      <td style="padding:12px;border-right:1px solid #d1d5db;">Security Type</td>
      <td style="padding:12px;font-weight:bold;text-align:right;">${securityType}</td>
    </tr>

    <tr>
      <td style="padding:12px;border-right:1px solid #d1d5db;">Trading History</td>
      <td style="padding:12px;font-weight:bold;text-align:right;">${yearsInBusiness} years</td>
    </tr>

  </table>
</td>
</tr>

<!-- ================= LENDING STRENGTH ================= -->
<tr>
<td style="padding-top:40px;">
  <div style="font-size:20px;font-weight:bold;">
    Commercial Lending Strength Overview
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:15px;font-size:13px;">
    <tr>
      <td width="33%" align="center"><strong>Strong:</strong> High lender appetite</td>
      <td width="34%" align="center"><strong>Moderate:</strong> Industry dependent</td>
      <td width="33%" align="center"><strong>Higher Risk:</strong> Specialist lenders</td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
    <tr>
      <td style="height:30px;background:linear-gradient(to right,#22c55e 0%,#22c55e 33%,#facc15 33%,#facc15 67%,#ef4444 67%,#ef4444 100%);position:relative;">
        <div style="position:absolute;top:-5px;left:${riskPosition}%;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #000;"></div>
        <div style="position:absolute;top:15px;left:${riskPosition}%;transform:translateX(-50%);font-size:12px;font-weight:bold;">
          Your Position
        </div>
      </td>
    </tr>
  </table>
</td>
</tr>

<!-- ================= SCENARIO NOTE ================= -->
<tr>
<td style="padding-top:30px;">
  <div style="font-size:16px;font-weight:bold;color:#374151;margin-bottom:10px;">
    Scenario Note
  </div>
  <div style="font-size:14px;color:#374151;background:#f8fafc;padding:12px;border-left:3px solid #f59e0b;">
    ${scenario_note}
  </div>
</td>
</tr>

<!-- ================= KEY INSIGHTS ================= -->
<tr>
<td style="padding-top:30px;">
<div style="font-size:20px;font-weight:bold;color:#f59e0b;">
  Key insights for your decision
</div>
<div style="margin-top:10px;font-size:14px;color:#374151;line-height:1.6;">
  ${dynamicText.insights}
</div>
</td>
</tr>

<!-- ================= CTA ================= -->
<tr>
<td style="padding:30px;text-align:center;background:#001233;">
  <div style="background:#ff9500;color:#fff;padding:16px;font-size:18px;font-weight:bold;">
    Next step: 20-minute strategy call
  </div>
  <br>
  <span style="font-size:13px;color:#fff;">
    Your Finco Capital specialist will contact you shortly to review your goals, funding requirements, lender options and documentation.
  </span>
</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="padding-top:20px;font-size:12px;color:#6b7280;text-align:center;">
  This estimate is indicative only and not a loan offer or approval.
</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>
      `;

      // Attempt PDF generation
      if (window.jspdf && typeof window.jspdf.jsPDF === 'function') {
        try {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF({ unit: 'mm', format: 'a4' });
          await new Promise((resolve, reject) => {
            try {
              doc.html(htmlContent, {
                callback: function (pdfDoc) {
                  try {
                    pdfDoc.save(filename + '.pdf');
                    console.log('✅ [Commercial] PDF saved:', filename + '.pdf');
                    resolve(true);
                  } catch (ex) { reject(ex); }
                },
                x: 10,
                y: 10,
                width: 195,
                html2canvas: { scale: 2 }
              });
            } catch (ex) { reject(ex); }
          });
          return true;
        } catch (err) { console.warn('📧 [Commercial] PDF generation failed:', err); }
      }

      // Fallback: download HTML
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename + '.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      console.log('📧 [Commercial] Fallback: HTML downloaded');
      return true;
    } catch (err) {
      console.error('❌ [Commercial] PDF download failed:', err);
      return false;
    }
  };

  console.log('📧 [Commercial] email-service-commercial.js loaded. Template ID:', EMAILJS_TEMPLATE_ID_COMMERCIAL);
  
  // EmailJS initialization will happen just before sending (not on load to avoid public key conflicts)
  // Also expose init function globally in case manual init needed
  window.initCommercialEmailJS = function() {
    if (typeof emailjs !== 'undefined') {
      try {
        emailjs.init(EMAILJS_PUBLIC_KEY);
        console.log('✅ [Commercial] Manual EmailJS init successful');
      } catch (err) {
        console.error('❌ [Commercial] Manual EmailJS init failed', err);
      }
    }
  };
})();
