(function(){
  console.log('📧 [SMSF] email-service-smsf.js loading...');

  // SMSF-specific EmailJS config
  const EMAILJS_SERVICE_ID_SMSF = 'service_eemvkes';
  const EMAILJS_TEMPLATE_ID_SMSF = 'template_qxg4vnd'; // Your SMSF template ID
  const EMAILJS_PUBLIC_KEY_SMSF = 'y4iEqRabCwdFRnejk';

  // Initialize EmailJS on script load
  function initializeEmailJS() {
    try {
      if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_PUBLIC_KEY_SMSF);
        window.emailjsReady = true;
        console.log('✅ [SMSF] EmailJS initialized successfully');
        return true;
      } else {
        console.warn('⚠️ [SMSF] EmailJS library not found - waiting for it to load');
        // Try again after delay if not ready
        setTimeout(initializeEmailJS, 500);
        return false;
      }
    } catch (err) {
      console.error('❌ [SMSF] EmailJS init failed:', err);
      return false;
    }
  }

  function isEmailJsReady() {
    if (typeof emailjs === 'undefined') {
      console.warn('⚠️ [SMSF] emailjs library not available');
      return false;
    }
    if (!window.emailjsReady) {
      console.log('📧 [SMSF] Attempting EmailJS initialization...');
      initializeEmailJS();
    }
    return window.emailjsReady === true;
  }

  /**
   * Build SMSF-specific insights and next steps based on property type
   * Returns property-specific messaging for Residential vs Commercial SMSF lending
   */
  function buildSMSFInsightsByPropertyType(propertyType, lvr, nryNum, liqNum) {
    let insights = '';
    let nextStep = '';

    // Normalize property type
    const pType = String(propertyType).toLowerCase().trim();

    if (pType.includes('commercial')) {
      // COMMERCIAL PROPERTY INSIGHTS
      insights = `<ul>
      <li>Commercial SMSF loans are assessed on lease strength, tenant quality, remaining lease term and net yield.</li><li>Higher yields can strengthen SMSF cashflow and improve servicing capacity, but liquidity requirements remain critical.</li><li>If the property is leased to a related business, strict arm's-length rules apply; lenders may request lease evidence and valuation support.</li><li>Commercial SMSF lenders review liquidity, rental coverage, fund balance and the property's specialised nature (general commercial vs industrial vs retail).</li><li>Some lenders apply reduced maximum LVRs or require stronger post-settlement liquidity for specialised or single-use assets.</li><li> We compare bank and specialist SMSF commercial lenders to match your LVR, liquidity and rental profile.</li></ul>`;
      nextStep = `Your SMSF specialist will review the lease profile, rental income, liquidity position and property type, then outline suitable lender pathways and documentation required for SMSF commercial approval.`;
    } else {
      // RESIDENTIAL PROPERTY INSIGHTS (default)
      insights = `<ul><li>Residential SMSF lending places strong emphasis on rental income, fund liquidity and long-term cashflow stability.</li><li>Your fund must be able to service the loan independently — no personal income can be used in SMSF lending.</li><li>Lenders typically review valuation quality, market rent, property condition and expected tenancy continuity.</li><li>Post-purchase liquidity of 10–20%+ is often required to maintain an acceptable risk profile and ensure ongoing compliance.</li><li>Residential SMSF properties must be strictly non-owner-occupied and meet arm's-length SMSF investment rules.</li><li>We compare SMSF-friendly bank and specialist lenders to determine which ones support your liquidity position, rental yield and LVR.</li></ul>`;
      nextStep = `Your SMSF specialist will walk you through your residential SMSF borrowing capacity, liquidity position, rental income assessment and lender options, then outline the pathway to final approval.`;
    }

    return { insights, nextStep };
  }

  /**
   * Build SMSF-specific insights and next steps based on LVR and loan type
   */
  function buildSMSFInsightsAndNextSteps(lvr, loanType) {
    let insights = 'Your SMSF loan structure has been analyzed based on your inputs. ';
    let nextStep = 'Contact your Finco Capital broker for detailed strategy and compliance advice.';

    if (lvr && lvr > 80) {
      insights += 'High LVR detected — consider deposit optimization. ';
    }
    if (lvr && lvr <= 60) {
      insights += 'Conservative LVR positioning — good debt serviceability. ';
    }

    return { insights, nextStep };
  }

  /**
   * Send SMSF calculation results via email
   */
  window.sendSMSFCalculationResultsEmail = async function (calculationData, loanCategory, loanPurpose, formInputs = {}) {
    try {
      console.log('📧 [SMSF] sendSMSFCalculationResultsEmail invoked', { loanCategory, loanPurpose, hasEmail: !!formInputs.user_email });

      // Wait for EmailJS library to be available
      let attempts = 0;
      while (typeof emailjs === 'undefined' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (typeof emailjs === 'undefined') {
        console.error('❌ [SMSF] EmailJS library not loaded');
        return false;
      }

      const effectiveLoanCategory = loanCategory || formInputs.loanCategory || document.getElementById('loanCategory')?.value || (window.lastCalc && window.lastCalc.loanCategory) || '';
      if (String(effectiveLoanCategory).toLowerCase() !== 'smsf') {
        console.warn('📧 [SMSF] sendSMSFCalculationResultsEmail: abort — not SMSF category', effectiveLoanCategory);
        return false;
      }

      if (!formInputs.user_email) {
        console.warn('📧 [SMSF] user_email missing');
        alert('Please enter your email address');
        return false;
      }

      // Extract form fields
      const lvr = calculationData.effectiveLVR || calculationData.baseLVR || 0;
      const chosenPropertyRaw = formInputs.propertyValue || formInputs.property_value || calculationData.propertyValue || '';
      const chosenDepositRaw = formInputs.depositAmount || formInputs.deposit_amount || calculationData.deposit || '';
      const chosenState = formInputs.state || formInputs.stateSelect || document.getElementById('stateSelect')?.value || '';

      const formatValue = (raw) => {
        if (raw === undefined || raw === null) return 'N/A';
        const s = String(raw).trim();
        if (s === '') return 'N/A';
        const num = parseFloat(s.replace(/[^0-9.\-]/g, ''));
        return isNaN(num) ? String(raw) : '$' + (typeof window.fmt === 'function' ? window.fmt(num) : Number(num).toLocaleString());
      };

      // Log incoming data for diagnostics
      try { console.log('📧 [SMSF] incoming calculationData keys:', Object.keys(calculationData || {})); } catch (e) {}
      try { console.log('📧 [SMSF] calculationData sample:', calculationData); } catch (e) {}
      try { console.log('📧 [SMSF] window.lastCalc sample:', window.lastCalc); } catch (e) {}

      // We'll compute a robust numeric LVR (lvrNum) below and use it for insights
      // dynamicText assigned after lvrNum is resolved

      // Derive additional template-specific fields expected by the client's SMSF template
      const parseNumber = (v) => {
        if (v === undefined || v === null) return NaN;
        const s = String(v).replace(/[^0-9.\-]/g, '');
        const n = parseFloat(s);
        return isNaN(n) ? NaN : n;
      };

      // Robust LVR detection from multiple possible keys
      const lvrCandidates = [
        calculationData.effectiveLVR,
        calculationData.baseLVR,
        calculationData.lvr,
        calculationData.lvr_percent,
        calculationData.lvrPercent,
        calculationData.LVR,
        calculationData.lvrPercentDisplay,
      ];
      let lvrNum = NaN;
      for (const c of lvrCandidates) {
        const n = parseNumber(c);
        if (!isNaN(n)) { lvrNum = n; break; }
      }
      // If still missing, try window.lastCalc
      if (isNaN(lvrNum) && window.lastCalc) {
        const alt = window.lastCalc.effectiveLVR || window.lastCalc.baseLVR || window.lastCalc.lvr || window.lastCalc.lvrPercent;
        lvrNum = parseNumber(alt);
      }

      // Show more raw candidates for debugging before fallback
      try {
        console.log('📧 [SMSF] debug raw loan/property candidates', {
          formInputsLoan: formInputs.loanAmount || formInputs.loan_amount || null,
          formInputsProperty: formInputs.propertyValue || formInputs.property_value || null,
          calcLoanAmount: calculationData.loanAmount || calculationData.totalLoanAmount || calculationData.baseLoanAmount || null,
          calcPropertyValue: calculationData.propertyValue || null,
          windowLastCalcLoan: window.lastCalc && (window.lastCalc.loanAmount || window.lastCalc.baseLoanAmount) || null,
          windowLastCalcProperty: window.lastCalc && window.lastCalc.propertyValue || null
        });
      } catch (e) {}

      // As a final fallback, compute LVR from loan amount / property value if available
      if (isNaN(lvrNum)) {
        const loanFromCalc = parseNumber(formInputs.loanAmount) || parseNumber(formInputs.loan_amount) || parseNumber(calculationData.loanAmount) || parseNumber(calculationData.totalLoanAmount) || parseNumber(calculationData.baseLoanAmount) || parseNumber(window.lastCalc && window.lastCalc.loanAmount) || NaN;
        const propFromFormOrCalc = parseNumber(formInputs.propertyValue) || parseNumber(formInputs.property_value) || parseNumber(chosenPropertyRaw) || parseNumber(window.lastCalc && window.lastCalc.propertyValue) || parseNumber(calculationData.propertyValue) || NaN;
        console.log('📧 [SMSF] fallback numbers:', { loanFromCalc, propFromFormOrCalc });
        if (!isNaN(loanFromCalc) && !isNaN(propFromFormOrCalc) && propFromFormOrCalc > 0) {
          lvrNum = Math.round((loanFromCalc / propFromFormOrCalc) * 10000) / 100; // keep two decimals
        }
      }

      // Additional fallback: if still NaN, try calculating from property - deposit
      if (isNaN(lvrNum)) {
        const propNum = parseNumber(chosenPropertyRaw);
        const depNum = parseNumber(chosenDepositRaw);
        if (!isNaN(propNum) && !isNaN(depNum) && propNum > 0) {
          const loanComputed = Math.max(0, propNum - depNum);
          lvrNum = Math.round((loanComputed / propNum) * 10000) / 100;
          console.log('📧 [SMSF] calculated LVR from property-deposit:', { propNum, depNum, lvrNum });
        }
      }

      // Keep NaN if still unknown (so we display 'N/A' rather than 0%)

      // Estimated loan amount detection and fallbacks
      let estimatedLoanAmountRaw = calculationData.loanAmount || calculationData.totalLoanAmount || calculationData.baseLoanAmount || calculationData.estimatedLoanAmount || calculationData.estimated_smsf_loan_amount || calculationData.estimated_smsf_loan || null;
      let estimatedLoanAmountNum = parseNumber(estimatedLoanAmountRaw);
      // Fallback: compute from property minus deposit if available
      if (isNaN(estimatedLoanAmountNum)) {
        const propNum = parseNumber(chosenPropertyRaw);
        const depNum = parseNumber(chosenDepositRaw);
        if (!isNaN(propNum) && !isNaN(depNum)) {
          estimatedLoanAmountNum = Math.max(0, propNum - depNum);
        } else if (!isNaN(propNum) && !isNaN(lvrNum)) {
          estimatedLoanAmountNum = Math.round(propNum * (Number(lvrNum) / 100));
        }
      }
      const estimatedLoanAmount = !isNaN(estimatedLoanAmountNum) ? estimatedLoanAmountNum : '';

      // For logging/debugging: show resolved numeric values
      console.log('📧 [SMSF] lvrCandidates:', lvrCandidates);
      console.log('📧 [SMSF] resolved values:', { lvrNum, estimatedLoanAmountNum, chosenPropertyRaw, chosenDepositRaw });
      const netRentalYield = calculationData.netRentalYield || calculationData.net_rental_yield || '';
      const liquidityRatio = calculationData.liquidityRatio || calculationData.liquidity_ratio || '';
      
      // Robust property type detection - capture from multiple sources (including dropdown loanPurpose)
      let propertyTypeRaw = formInputs.propertyType || formInputs.property_type || formInputs.loanPurpose || formInputs.loan_purpose || document.getElementById('loanPurpose')?.value || calculationData.propertyType || calculationData.property_type || calculationData.loanPurpose || calculationData.loan_purpose || window.lastCalc?.propertyType || window.lastCalc?.property_type || window.lastCalc?.loanPurpose || window.lastCalc?.loan_purpose || '';
      let propertyTypeString = String(propertyTypeRaw).toLowerCase().trim();
      let propertyType = '';
      
      // Check for keywords in the selected value
      if (propertyTypeString.includes('commercial')) {
        propertyType = 'Commercial';
      } else if (propertyTypeString.includes('residential')) {
        propertyType = 'Residential';
      } else if (propertyTypeString === 'res' || propertyTypeString === 'home') {
        propertyType = 'Residential';
      } else if (propertyTypeString === 'comm' || propertyTypeString === 'business') {
        propertyType = 'Commercial';
      } else if (propertyTypeString) {
        propertyType = String(propertyTypeRaw).charAt(0).toUpperCase() + String(propertyTypeRaw).slice(1).toLowerCase();
      }
      
      console.log('📧 [SMSF] propertyType resolved:', { raw: propertyTypeRaw, resolved: propertyType });
      
      const smsfStructure = formInputs.smsf_structure || formInputs.smsfStructure || '';

      // Use property-type specific insights instead of generic ones
      const nryNum = parseFloat(netRentalYield) || 0;
      const liqNum = parseFloat(liquidityRatio) || 0;
      const dynamicText = buildSMSFInsightsByPropertyType(propertyType, lvrNum, nryNum, liqNum);

      // Simple serviceability heuristic
      let serviceabilityIndicator = 'Moderate';
      let serviceabilityColor = '#fef08a';
      try {
        const nr = parseFloat(netRentalYield) || 0;
        const liq = parseFloat(liquidityRatio) || 0;
        if ((nr > 5 && liq >= 20) || (liq >= 30)) { serviceabilityIndicator = 'Strong'; serviceabilityColor = '#dcfce7'; }
        else if (nr > 2 || liq >= 15) { serviceabilityIndicator = 'Moderate'; serviceabilityColor = '#fef9c3'; }
        else { serviceabilityIndicator = 'Higher Risk'; serviceabilityColor = '#fee2e2'; }
      } catch (e) { /* ignore */ }

      // Position indicator for the visual bar: map resolved LVR to 0-100
      const posIndicator = Math.max(0, Math.min(100, Number(lvrNum) || 0));

      // Build scenario note based on LVR and metrics
      let scenarioNote = 'Your SMSF loan structure has been analyzed based on your inputs. ';
      if (lvrNum && lvrNum > 80) {
        scenarioNote += 'High LVR detected — consider deposit optimization for better lender terms. ';
      } else if (lvrNum && lvrNum <= 60) {
        scenarioNote += 'Conservative LVR positioning — good debt serviceability outlook. ';
      }
      if (nryNum > 5 && liqNum >= 20) {
        scenarioNote += 'Strong rental income and liquidity position — highly attractive to SMSF lenders. ';
      } else if (nryNum > 2 || liqNum >= 15) {
        scenarioNote += 'Moderate rental yield and adequate liquidity — good lending proposition. ';
      } else {
        scenarioNote += 'Liquidity and rental income require specialist SMSF lender assessment. ';
      }
      scenarioNote += 'Contact your Finco Capital broker during your strategy call to optimize your structure.';

      // Provide both HTML and plain-text bullet versions of key insights.
      const insightsHtml = dynamicText && dynamicText.insights ? String(dynamicText.insights) : '';
      const insightsPlain = insightsHtml
        .replace(/<\/(li|ul|ol)>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<[^>]+>/g, '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .join('\n');

      const payload = {
        /* Core/common */
        to_email: formInputs.user_email,
        customer_name: formInputs.user_full_name || 'Client',
        state: chosenState || 'N/A',
        loan_category: 'SMSF Loan',
        loan_purpose: loanPurpose || 'N/A',
        reference_id: 'SMSF-' + Math.floor(Math.random() * 90000 + 10000),
        timestamp: new Date().toLocaleString('en-AU'),

        /* Template-specific placeholders (match the provided template) */
        property_purchase_price: formatValue(chosenPropertyRaw),
        estimated_smsf_loan_amount: (estimatedLoanAmount !== '' && !isNaN(estimatedLoanAmount)) ? ('$' + (typeof window.fmt === 'function' ? window.fmt(estimatedLoanAmount) : Number(estimatedLoanAmount).toLocaleString())) : 'N/A',
        smsf_deposit_balance: formatValue(chosenDepositRaw),
        smsf_lvr: (!isNaN(lvrNum) ? Number(lvrNum).toFixed(2) : 'N/A'),
        net_rental_yield: netRentalYield ? Number(netRentalYield).toFixed(2) : 'N/A',
        liquidity_ratio: liquidityRatio ? Number(liquidityRatio).toFixed(2) : 'N/A',
        serviceability_indicator: serviceabilityIndicator,
        serviceability_color: serviceabilityColor,
        property_type: propertyType || 'N/A',
        smsf_structure: smsfStructure || 'N/A',
        position_indicator: posIndicator,
        senario_note: scenarioNote,

        /* Backwards-compatible fields */
        property_value: formatValue(chosenPropertyRaw),
        deposit_amount: formatValue(chosenDepositRaw),
        loan_amount: (estimatedLoanAmount !== '' && !isNaN(estimatedLoanAmount)) ? ('$' + (typeof window.fmt === 'function' ? window.fmt(estimatedLoanAmount) : Number(estimatedLoanAmount).toLocaleString())) : 'N/A',
        monthly_repayment: (calculationData.monthlyRepayment !== undefined && calculationData.monthlyRepayment !== null && calculationData.monthlyRepayment !== '') ? ('$' + (typeof window.fmt === 'function' ? window.fmt(calculationData.monthlyRepayment) : Number(calculationData.monthlyRepayment).toLocaleString()) + ' / month') : 'N/A',
        lvr_percent: (!isNaN(lvrNum) ? Number(lvrNum).toFixed(2) + '%' : 'N/A'),
        loan_percentage: (Number(lvrNum) || 0).toFixed(2),
        deposit_percentage: Math.max(0, 100 - (Number(lvrNum) || 0)).toFixed(2),
        stamp_duty_saving: calculationData.stampDuty ? ('$' + (typeof window.fmt === 'function' ? window.fmt(calculationData.stampDuty) : Number(calculationData.stampDuty).toLocaleString())) : 'N/A',
        key_insights: insightsPlain || (dynamicText && dynamicText.insights) || 'N/A',
        key_insights_html: insightsHtml || '',
        next_steps: dynamicText.nextStep,
        user_agent: navigator.userAgent
      };

      console.log('📧 [SMSF] payload:', payload);

      // Ensure EmailJS is initialized with SMSF public key before sending
      if (typeof emailjs !== 'undefined') {
        try {
          emailjs.init(EMAILJS_PUBLIC_KEY_SMSF);
          console.log('✅ [SMSF] EmailJS initialized for SMSF service');
        } catch (err) {
          console.error('❌ [SMSF] EmailJS init failed', err);
        }
      }

      const resp = await emailjs.send(EMAILJS_SERVICE_ID_SMSF, EMAILJS_TEMPLATE_ID_SMSF, payload);
      console.log('📧 [SMSF] response:', resp);

      const ok = resp && resp.status === 200;
      if (ok) {
        console.log('✅ [SMSF] Email sent to', formInputs.user_email);
      }
      return ok;
    } catch (err) {
      console.error('❌ [SMSF] email send failed', err);
      return false;
    }
  };

  /**
   * Download SMSF calculation results as PDF
   */
  window.downloadSMSFResultsAsPDF = async function (filename = 'finco-smsf-results') {
    try {
      const results = window.lastCalc || {};
      if (!results || Object.keys(results).length === 0) {
        alert('Please run a calculation first to generate results.');
        return false;
      }

      const loanCategory = document.getElementById('loanCategory')?.value || (window.lastCalc && window.lastCalc.loanCategory) || '';
      if (String(loanCategory).toLowerCase() !== 'smsf') {
        alert('PDF downloads are available for SMSF calculators only.');
        return false;
      }

      const loanPurpose = document.getElementById('loanPurpose')?.value || (window.lastCalc && window.lastCalc.loanPurpose) || '';
      const formInputs = (typeof captureFormInputs === 'function') ? captureFormInputs() : {};

      // Extract LVR with multiple fallbacks
      const lvrCandidates = [
        results.effectiveLVR,
        results.baseLVR,
        results.lvr,
        results.lvr_percent,
        results.lvrPercent,
        results.LVR,
        results.lvrPercentDisplay,
        window.lastCalc?.effectiveLVR,
        window.lastCalc?.baseLVR,
        window.lastCalc?.lvr,
        window.lastCalc?.lvr_percent,
        window.lastCalc?.lvrPercent,
        window.lastCalc?.LVR,
        window.lastCalc?.lvrPercentDisplay,
      ];
      
      let lvr = 0;
      const parseNumber = (v) => {
        if (v === undefined || v === null) return NaN;
        const s = String(v).replace(/[^0-9.\-]/g, '');
        const n = parseFloat(s);
        return isNaN(n) ? NaN : n;
      };
      
      for (const c of lvrCandidates) {
        const n = parseNumber(c);
        if (!isNaN(n)) { lvr = n; break; }
      }
      
      // Fallback: calculate from loan amount / property value if available
      if (lvr === 0) {
        const propNum = parseNumber(document.getElementById('propertyValue')?.value || document.getElementById('property_value')?.value || formInputs.propertyValue || formInputs.property_value || results.propertyValue || '');
        const loanNum = parseNumber(results.loanAmount || results.totalLoanAmount || results.baseLoanAmount || window.lastCalc?.loanAmount || window.lastCalc?.baseLoanAmount || '');
        if (!isNaN(propNum) && !isNaN(loanNum) && propNum > 0) {
          lvr = Math.round((loanNum / propNum) * 10000) / 100;
        }
      }
      
      // Final fallback: calculate from deposit percentage
      if (lvr === 0) {
        const propNum = parseNumber(document.getElementById('propertyValue')?.value || document.getElementById('property_value')?.value || formInputs.propertyValue || formInputs.property_value || results.propertyValue || '');
        const depNum = parseNumber(document.getElementById('depositAmount')?.value || document.getElementById('deposit_amount')?.value || formInputs.depositAmount || formInputs.deposit_amount || results.deposit || '');
        if (!isNaN(propNum) && !isNaN(depNum) && propNum > 0) {
          const loanComputed = Math.max(0, propNum - depNum);
          lvr = Math.round((loanComputed / propNum) * 10000) / 100;
        }
      }
      
      // Extract property type to use property-type-specific insights (matching email template)
      const propertyTypeRaw = formInputs.propertyType || formInputs.property_type || formInputs.loanPurpose || formInputs.loan_purpose || document.getElementById('loanPurpose')?.value || results.propertyType || results.property_type || results.loanPurpose || results.loan_purpose || window.lastCalc?.propertyType || window.lastCalc?.property_type || window.lastCalc?.loanPurpose || window.lastCalc?.loan_purpose || '';
      let propertyTypeString = String(propertyTypeRaw).toLowerCase().trim();
      let propertyType = '';
      
      // Check for keywords in the selected value
      if (propertyTypeString.includes('commercial')) {
        propertyType = 'Commercial';
      } else if (propertyTypeString.includes('residential')) {
        propertyType = 'Residential';
      } else if (propertyTypeString === 'res' || propertyTypeString === 'home') {
        propertyType = 'Residential';
      } else if (propertyTypeString === 'comm' || propertyTypeString === 'business') {
        propertyType = 'Commercial';
      } else if (propertyTypeString) {
        propertyType = String(propertyTypeRaw).charAt(0).toUpperCase() + String(propertyTypeRaw).slice(1).toLowerCase();
      }
      
      // Extract rental yield and liquidity metrics for insights
      const netRentalYield = results.netRentalYield || results.net_rental_yield || '';
      const liquidityRatio = results.liquidityRatio || results.liquidity_ratio || '';
      const nryNum = parseFloat(netRentalYield) || 0;
      const liqNum = parseFloat(liquidityRatio) || 0;
      
      // Use property-type-specific insights (same as email template)
      const dynamicText = buildSMSFInsightsByPropertyType(propertyType, lvr, nryNum, liqNum);

      // Extract property value with multiple fallbacks (same as email function)
      const chosenPropertyRaw = formInputs.propertyValue || formInputs.property_value || formInputs.purchasePrice || formInputs.purchase_price || results.propertyValue || results.property_value || results.purchasePrice || results.purchase_price || window.lastCalc?.propertyValue || window.lastCalc?.property_value || window.lastCalc?.purchasePrice || window.lastCalc?.purchase_price || document.getElementById('propertyValue')?.value || document.getElementById('property_value')?.value || document.getElementById('purchasePrice')?.value || document.getElementById('purchase_price')?.value || '';
      
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
      let estimatedLoanAmountRaw = results.loanAmount || results.totalLoanAmount || results.baseLoanAmount || results.estimatedLoanAmount || results.estimated_smsf_loan_amount || results.estimated_smsf_loan || window.lastCalc?.loanAmount || window.lastCalc?.totalLoanAmount || window.lastCalc?.baseLoanAmount || window.lastCalc?.estimatedLoanAmount || document.getElementById('loanAmount')?.value || document.getElementById('totalLoanAmount')?.value || null;
      
      let estimatedLoanAmountNum = parseFloat(String(estimatedLoanAmountRaw || '').replace(/[^0-9.\-]/g, '')) || NaN;
      
      // Fallback: compute from property minus deposit if available
      if (isNaN(estimatedLoanAmountNum)) {
        const propNum = parseFloat(String(chosenPropertyRaw || '').replace(/[^0-9.\-]/g, '')) || NaN;
        const depNum = parseFloat(String(chosenDepositRaw || '').replace(/[^0-9.\-]/g, '')) || NaN;
        if (!isNaN(propNum) && !isNaN(depNum) && propNum > 0) {
          estimatedLoanAmountNum = Math.max(0, propNum - depNum);
        } else if (!isNaN(propNum) && !isNaN(lvr) && propNum > 0) {
          estimatedLoanAmountNum = Math.round(propNum * (Number(lvr) / 100));
        }
      }
      
      const loanAmount = (!isNaN(estimatedLoanAmountNum)) ? ('$' + (typeof window.fmt === 'function' ? window.fmt(estimatedLoanAmountNum) : Number(estimatedLoanAmountNum).toLocaleString())) : 'N/A';
      
      const monthlyRepayment = results.monthlyRepayment ? '$' + (typeof window.fmt === 'function' ? window.fmt(results.monthlyRepayment) : Number(results.monthlyRepayment).toLocaleString()) + ' / month' : 'N/A';
      const lvr_percent = (lvr !== undefined && lvr !== null) ? String(lvr) + '%' : 'N/A';
      const stampDutySaving = results.stampDuty ? '$' + (typeof window.fmt === 'function' ? window.fmt(results.stampDuty) : Number(results.stampDuty).toLocaleString()) : 'N/A';
      const property_type = propertyType || 'N/A';
      
      // Build scenario note based on LVR and metrics
      let senario_note = 'Your SMSF loan structure has been analyzed based on your inputs. ';
      if (lvr && lvr > 80) {
        senario_note += 'High LVR detected — consider deposit optimization for better lender terms. ';
      } else if (lvr && lvr <= 60) {
        senario_note += 'Conservative LVR positioning — good debt serviceability outlook. ';
      }
      if (nryNum > 5 && liqNum >= 20) {
        senario_note += 'Strong rental income and liquidity position — highly attractive to SMSF lenders. ';
      } else if (nryNum > 2 || liqNum >= 15) {
        senario_note += 'Moderate rental yield and adequate liquidity — good lending proposition. ';
      } else {
        senario_note += 'Liquidity and rental income require specialist SMSF lender assessment. ';
      }
      senario_note += 'Contact your Finco Capital broker during your strategy call to optimize your structure.';

      // Build SMSF-specific HTML for PDF
      const htmlContent = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
<tr>
<td align="center">

<!-- HEADER -->
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
  Your Preliminary<br>SMSF Loan Finance Estimate
</td>

<td width="33%" align="right" style="padding:16px;color:#fff;font-size:12px;">
  <strong>Ref:</strong> SMSF${Math.floor(Math.random() * 90000 + 10000)}<br>
  <strong>Generated:</strong> ${new Date().toLocaleString('en-AU')}
</td>
</tr>
</table>

<!-- MAIN CARD -->
<table width="100%" cellpadding="0" cellspacing="0"
style="max-width:600px;background:#ffffff;border-radius:8px;padding:24px;margin-top:20px;margin-bottom:20px;">

<!-- INTRO -->
<tr>
<td style="font-size:14px;color:#374151;line-height:1.6;">
  Dear <strong>${formInputs.user_full_name || 'Valued Client'}</strong>,<br><br>
  Thank you for requesting a call-back regarding your SMSF lending needs.
</td>
</tr>
 <tr>
<td style="padding-top:30px;">

<div style="font-size:20px;font-weight:bold;color:#f59e0b;margin-bottom:20px;">
  Where you are in the journey
</div>

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
  <td align="center" style="font-size:13px;">1.Online Enquiry</td>
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
    <div style="background:#f59e0b;color:#fff;border:2px solid #f59e0b;
                width:32px;height:32px;line-height:30px;font-weight:bold;">
      2
    </div>
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
<!-- SNAPSHOT -->
<tr>
<td style="padding-top:30px;">
  <div style="font-size:20px;font-weight:bold;">
    Snapshot of your SMSF scenario
  </div>
  <div style="font-size:12px;color:#6b7280;margin-bottom:12px;">
    (based on the details you entered)
  </div>

  <table width="100%" cellpadding="10" cellspacing="0"
         style="border:1px solid #d1d5db;border-collapse:collapse;font-size:14px;">

    <tr style="background:#f9fafb;">
      <td style="border-right:1px solid #d1d5db;">Property purchase price</td>
      <td style="font-weight:bold;text-align:right;">${propertyValue}</td>
    </tr>

    <tr>
      <td style="border-right:1px solid #d1d5db;">Estimated SMSF Loan Amount</td>
      <td style="font-weight:bold;text-align:right;">${loanAmount}</td>
    </tr>

    <tr style="background:#f9fafb;">
      <td style="border-right:1px solid #d1d5db;">SMSF Deposite / Existing Balance</td>
      <td style="font-weight:bold;text-align:right;">${depositAmount}</td>
    </tr>

    <tr>
      <td style="border-right:1px solid #d1d5db;">SMSF LVR</td>
      <td style="font-weight:bold;text-align:right;">${lvr_percent}</td>
    </tr>

    <tr style="background:#f9fafb;">
      <td style="border-right:1px solid #d1d5db;">Property Type</td>
      <td style="font-weight:bold;text-align:right;">${property_type}</td>
    </tr>

  </table>
</td>
</tr>



<!-- ================= SMSF LENDING STRENGTH OVERVIEW ================= -->
<tr>
<td style="padding-top:40px;">
  <div style="font-size:20px;font-weight:bold;">
    SMSF Lending Strength Overview
  </div>
  
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:15px;margin-bottom:10px;font-size:13px;">
    <tr>
      <td width="33%" style="text-align:center;padding:8px;">
        <strong>Strong:</strong> High SMSF lending appetite
      </td>
      <td width="34%" style="text-align:center;padding:8px;">
        <strong>Moderate:</strong> Depends on liquidity & rent
      </td>
      <td width="33%" style="text-align:center;padding:8px;">
        <strong>Higher Risk:</strong> Specialist SMSF lenders
      </td>
    </tr>
  </table>
  
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:5px;">
    <tr>
      <td style="height:30px;background:linear-gradient(to right, #22c55e 0%, #22c55e 33%, #facc15 33%, #facc15 67%, #ef4444 67%, #ef4444 100%);position:relative;">
        <!-- Position indicator -->
        <div style="position:absolute;top:-5px;left:50%;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #000;"></div>
        <div style="position:absolute;top:15px;left:52%;transform:translateX(-50%);font-size:12px;font-weight:bold;white-space:nowrap;">
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
  <div style="font-size:14px;color:#374151;line-height:1.6;background-color:#f8fafc;padding:12px;border-left:3px solid #f59e0b;">
     ${senario_note}
  </div>
</td>
</tr>
<!-- INSIGHTS -->
<tr>
<td style="padding-top:30px;">
  <div style="font-size:20px;font-weight:bold;color:#f59e0b;">
    Key insights for your decision
  </div>
  <div style="margin-top:10px;font-size:14px;line-height:1.6;">
    ${dynamicText.insights}
  </div>
</td>
</tr>

<!-- NOTES -->
<tr>
<td style="padding-top:30px;">
  <div style="font-size:20px;font-weight:bold;color:#f59e0b;">
    Important notes & assumptions
  </div>
  <div style="margin-top:10px;font-size:13px;color:#374151;line-height:1.6;">
    ${dynamicText.nextStep}
  </div>
</td>
</tr>

<!-- CTA -->
<tr>
<td style="padding:26px;text-align:center;background:#001233;">
  <div style="background:#ff9500;color:#fff;padding:16px;
              font-size:18px;font-weight:bold;">
    Next step:
    <a href="tel:03169032961" style="color:#fff;text-decoration:none;">
      20-minute SMSF Strategy Call
    </a>
  </div>
</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="padding-top:20px;font-size:12px;color:#6b7280;text-align:center;">
  This SMSF estimate is indicative only and not a loan offer or approval.
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
                    console.log('✅ [SMSF] PDF saved:', filename + '.pdf');
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
        } catch (err) { console.warn('📧 [SMSF] PDF generation failed:', err); }
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
      console.log('📧 [SMSF] Fallback: HTML downloaded');
      return true;
    } catch (err) {
      console.error('❌ [SMSF] PDF download failed:', err);
      return false;
    }
  };

  console.log('📧 [SMSF] email-service-smsf.js loaded. Template ID:', EMAILJS_TEMPLATE_ID_SMSF);
  
  // EmailJS initialization will happen just before sending (not on load to avoid public key conflicts)
  // Also expose init function globally in case manual init needed
  window.initSMSFEmailJS = function() {
    if (typeof emailjs !== 'undefined') {
      try {
        emailjs.init(EMAILJS_PUBLIC_KEY_SMSF);
        console.log('✅ [SMSF] Manual EmailJS init successful');
      } catch (err) {
        console.error('❌ [SMSF] Manual EmailJS init failed', err);
      }
    }
  };
})();
