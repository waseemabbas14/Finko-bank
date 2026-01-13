/**
 * email-service.js
 * Handles sending calculation results via email using EmailJS
 */

/* ================= GLOBAL FLAG ================= */
window.emailjsReady = false;

(function () {
  /* ================= CONFIG ================= */
  const EMAILJS_SERVICE_ID = 'service_eemvkes';
  const EMAILJS_TEMPLATE_ID = 'template_bbqahd7';
  const EMAILJS_PUBLIC_KEY = 'y4iEqRabCwdFRnejk';

  const AUTO_SEND_EMAIL_ON_CALC = false;
  window.EMAIL_AUTO_SEND = AUTO_SEND_EMAIL_ON_CALC;

  /* ================= INIT ================= */
  function initializeEmailJS() {
    if (typeof emailjs !== 'undefined') {
      try {
        emailjs.init(EMAILJS_PUBLIC_KEY);
        window.emailjsReady = true;
        console.log('✅ EmailJS initialized');
        return true;
      } catch (err) {
        console.error('❌ EmailJS init failed', err);
      }
    }
    return false;
  }

  function waitForEmailJS(callback, max = 100) {
    let i = 0;
    const timer = setInterval(() => {
      i++;
      if (typeof emailjs !== 'undefined') {
        clearInterval(timer);
        initializeEmailJS();
        callback && callback();
      }
      if (i >= max) clearInterval(timer);
    }, 100);
  }

  /* ================= MAIN SEND ================= */
  window.sendCalculationResultsEmail = async function (
    calculationData,
    loanCategory,
    loanPurpose,
    formInputs = {}
  ) {
    try {
      // Wait for EmailJS library to be available
      let attempts = 0;
      while (typeof emailjs === 'undefined' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (typeof emailjs === 'undefined') {
        console.error('❌ EmailJS library not loaded');
        return false;
      }

      if (!formInputs.user_email) {
        console.warn('⚠️ user_email missing');
        return false;
      }

      if (!calculationData || typeof calculationData !== 'object') {
        console.warn('⚠️ Invalid calculation data');
        return false;
      }

      // Debug: show calculation and form inputs to trace missing fields
      try {
        console.log('📧 [DEBUG] calculationData:', calculationData);
        console.log('📧 [DEBUG] window.lastCalc:', window.lastCalc);
        console.log('📧 [DEBUG] formInputs keys:', Object.keys(formInputs || {}));
        console.log('📧 [DEBUG] formInputs:', formInputs);
      } catch (e) { /* ignore logging errors */ }

      // SMSF sends should be handled by the SMSF-specific handler. If the handler
      // isn't loaded yet (race with script order), wait briefly for it to appear
      const effectiveLoanCategory = loanCategory || formInputs.loanCategory || document.getElementById('loanCategory')?.value || (window.lastCalc && window.lastCalc.loanCategory) || '';
      const effectiveLoanPurpose = loanPurpose || formInputs.loanPurpose || document.getElementById('loanPurpose')?.value || (window.lastCalc && window.lastCalc.loanPurpose) || '';
      console.log('📧 [CHECK] sendCalculationResultsEmail: effectiveLoanCategory=', effectiveLoanCategory, 'effectiveLoanPurpose=', effectiveLoanPurpose, 'loanCategory arg=', loanCategory, 'formInputs.loanCategory=', formInputs.loanCategory);

      // Robust SMSF detection: check category, purpose, lastCalc markers and form keys
      const looksLikeSMSF = (s) => String(s || '').toLowerCase().includes('smsf');
      const isSMSF = looksLikeSMSF(effectiveLoanCategory) || looksLikeSMSF(effectiveLoanPurpose) || looksLikeSMSF(formInputs.smsg || formInputs.smsfCalculatorType || formInputs.smsc || (window.lastCalc && window.lastCalc.loanType));
      
      // Robust Commercial detection: check category
      const looksLikeCommercial = (s) => String(s || '').toLowerCase() === 'commercial';
      const isCommercial = looksLikeCommercial(effectiveLoanCategory);
      
      // Route to SMSF handler if detected
      if (isSMSF) {
        console.log('📧 [CHECK] Detected SMSF (by multiple heuristics) — attempting to delegate to SMSF handler');

        // Helper: load a script only once and return a promise that resolves on load/error
        const loadScriptOnce = (src, id) => new Promise((resolve) => {
          try {
            if (id && document.getElementById(id)) return resolve(true);
            const s = document.createElement('script');
            if (id) s.id = id;
            s.src = src;
            s.async = false; // preserve execution order for this script
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
          } catch (e) { resolve(false); }
        });

        // If the SMSF handler isn't present, attempt to dynamically load the file
        if (typeof window.sendSMSFCalculationResultsEmail !== 'function') {
          const smsfsrc = '/js/email-service-smsf.js';
          console.log('📧 sendCalculationResultsEmail: SMSF handler not found — dynamically loading', smsfsrc);
          const ok = await loadScriptOnce(smsfsrc, 'email-service-smsf-js');
          if (!ok) console.warn('📧 sendCalculationResultsEmail: dynamic load attempted but failed for', smsfsrc);
        }

        // Wait up to ~2 seconds for the SMSF handler to become available
        const waitForHandler = () => new Promise(res => {
          let tries = 0;
          const max = 20;
          const t = setInterval(() => {
            if (typeof window.sendSMSFCalculationResultsEmail === 'function') {
              clearInterval(t);
              res(window.sendSMSFCalculationResultsEmail);
            }
            tries++;
            if (tries >= max) {
              clearInterval(t);
              res(null);
            }
          }, 100);
        });

        const handler = await waitForHandler();
        if (handler) {
          try {
            console.log('📧 Delegating SMSF send to sendSMSFCalculationResultsEmail');
            return await handler(calculationData, loanCategory, loanPurpose, formInputs);
          } catch (e) {
            console.error('❌ SMSF handler threw error during delegation', e);
            return false;
          }
        }

        console.error('❌ sendCalculationResultsEmail: SMSF handler not available after wait — aborting');
        return false;
      }

      // Route to Commercial handler if detected
      if (isCommercial) {
        console.log('📧 [CHECK] Detected Commercial — attempting to delegate to Commercial handler');

        // Helper: load a script only once and return a promise that resolves on load/error
        const loadScriptOnce = (src, id) => new Promise((resolve) => {
          try {
            if (id && document.getElementById(id)) return resolve(true);
            const s = document.createElement('script');
            if (id) s.id = id;
            s.src = src;
            s.async = false; // preserve execution order for this script
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
          } catch (e) { resolve(false); }
        });

        // If the Commercial handler isn't present, attempt to dynamically load the file
        if (typeof window.sendCommercialCalculationResultsEmail !== 'function') {
          const commsrc = '/js/email-service-commercial.js';
          console.log('📧 sendCalculationResultsEmail: Commercial handler not found — dynamically loading', commsrc);
          const ok = await loadScriptOnce(commsrc, 'email-service-commercial-js');
          if (!ok) console.warn('📧 sendCalculationResultsEmail: dynamic load attempted but failed for', commsrc);
        }

        // Wait up to ~2 seconds for the Commercial handler to become available
        const waitForHandler = () => new Promise(res => {
          let tries = 0;
          const max = 20;
          const t = setInterval(() => {
            if (typeof window.sendCommercialCalculationResultsEmail === 'function') {
              clearInterval(t);
              res(window.sendCommercialCalculationResultsEmail);
            }
            tries++;
            if (tries >= max) {
              clearInterval(t);
              res(null);
            }
          }, 100);
        });

        const handler = await waitForHandler();
        if (handler) {
          try {
            console.log('📧 Delegating Commercial send to sendCommercialCalculationResultsEmail');
            return await handler(calculationData, loanCategory, loanPurpose, formInputs);
          } catch (e) {
            console.error('❌ Commercial handler threw error during delegation', e);
            return false;
          }
        }

        console.error('❌ sendCalculationResultsEmail: Commercial handler not available after wait — aborting');
        return false;
      }

      const lvr =
        calculationData.effectiveLVR ||
        calculationData.baseLVR ||
        0;

      const loanPercent = Number(lvr) || 0;
      const depositPercent = Math.max(0, 100 - loanPercent);

      const loanType =
        loanPurpose === 'investment' ? 'investor' :
        loanPurpose === 'construction' ? 'construction' :
        loanPurpose === 'bridging' ? 'bridging' :
        loanPurpose === 'refinance' ? 'refinance' :
        loanPurpose === 'upgrade' ? 'upgrader' :
        formInputs.first_home_buyer === 'yes' ? 'fhb' :
        '';

      const dynamicText = buildInsightsAndNextSteps(lvr, loanType);

      /* ===== SEND EMAIL ===== */
      // Normalize and log chosen property, deposit and state sources (form fields or calculation data)
      const chosenPropertyRaw = formInputs.propertyValue || formInputs.property_value || formInputs.purchasePrice || formInputs.purchase_price || formInputs.property || calculationData.propertyValue || '';
      const chosenDepositRaw = formInputs.depositAmount || formInputs.deposit_amount || formInputs.deposit || calculationData.deposit || calculationData.depositAmount || '';
      const chosenState = formInputs.state || formInputs.stateSelect || document.getElementById('stateSelect')?.value || '';
      console.log('📧 [DEBUG] chosenPropertyRaw:', chosenPropertyRaw, 'chosenDepositRaw:', chosenDepositRaw, 'chosenState:', chosenState);

      // Ensure EmailJS is initialized with correct public key before sending
      if (typeof emailjs !== 'undefined' && !window.emailjsReady) {
        try {
          emailjs.init(EMAILJS_PUBLIC_KEY);
          window.emailjsReady = true;
          console.log('✅ EmailJS initialized for generic service');
        } catch (err) {
          console.error('❌ EmailJS init failed', err);
        }
      }

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          /* CORE */
          to_email: formInputs.user_email,
          customer_name: formInputs.user_full_name || 'Customer',
          state: (function(){ return chosenState || 'N/A'; })(),
          loan_category: getLoanCategoryName(loanCategory),
          loan_purpose: getLoanPurposeName(loanPurpose),
          reference_id: 'FC' + Math.floor(Math.random() * 90000 + 10000),
          timestamp: new Date().toLocaleString('en-AU'),

          /* SNAPSHOT */
          property_value: (function(){
            const raw = chosenPropertyRaw;
            if (!raw || String(raw).trim() === '') return 'N/A';
            const num = parseFloat(String(raw).replace(/[^0-9.\-]/g, ''));
            return isNaN(num) ? String(raw) : `$${fmt(num)}`;
          })(),

          loan_amount: calculationData.loanAmount
            ? `$${fmt(calculationData.loanAmount)}`
            : 'N/A',

          deposit_amount: (function(){
            const raw = chosenDepositRaw;
            if (!raw || String(raw).trim() === '') return 'N/A';
            const num = parseFloat(String(raw).replace(/[^0-9.\-]/g, ''));
            return isNaN(num) ? String(raw) : `$${fmt(num)}`;
          })(),

          monthly_repayment: (function(){
            // Try common keys first
            const candidates = [
              calculationData.monthlyRepayment,
              calculationData.monthly_repayment,
              calculationData.newMonthly,
              calculationData.oldMonthly,
              calculationData.monthlyRepaymentAmount,
            ];
            for (const c of candidates) {
              if (c !== undefined && c !== null && String(c) !== '') {
                const num = parseFloat(String(c).toString().replace(/[^0-9.\-]/g, ''));
                if (!isNaN(num)) return `$${fmt(num)} / month`;
                return String(c);
              }
            }

            // Fallback: try computing from loan amount, interest rate and term
            try {
              const P = parseFloat(String(calculationData.totalLoanAmount || calculationData.loanAmount || calculationData.baseLoanAmount || calculationData.currentBalance || 0).replace(/[^0-9.\-]/g, '')) || 0;
              let r = calculationData.interestRate;
              let years = calculationData.loanTerm;
              // If missing, read from DOM fields commonly used
              if ((r === undefined || r === null) && document.getElementById('interestRate')) {
                r = parseFloat(document.getElementById('interestRate').value) / 100 || 0;
              }
              if ((years === undefined || years === null) && document.getElementById('loanTerm')) {
                years = parseFloat(document.getElementById('loanTerm').value) || 0;
              }
              if (P > 0 && r !== undefined && years) {
                if (typeof window.calcMonthlyRepayment === 'function') {
                  const val = window.calcMonthlyRepayment(P, r, years);
                  if (!isNaN(val)) return `$${fmt(Math.round(val))} / month`;
                } else if (r > 0) {
                  // basic amortization formula
                  const n = years * 12;
                  const monthlyRate = r / 12;
                  const payment = (P * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
                  if (!isNaN(payment)) return `$${fmt(Math.round(payment))} / month`;
                }
              }
            } catch (e) { /* ignore */ }

            return 'N/A';
          })(),

          /* LVR */
          lvr_percent: lvr ? `${lvr}%` : 'N/A',

          /* FUNDING */
          loan_percentage: loanPercent.toFixed(2),
          deposit_percentage: depositPercent.toFixed(2),

          /* STAMP DUTY */
          stamp_duty_saving: (function(){
            // Accept multiple possible keys produced by calculation modules or form
            let raw = formInputs.stampDuty || formInputs.stamp_duty || calculationData.stampDuty || calculationData.stampDutySaving || calculationData.stampDutyEstimate || '';
            console.log('📧 [DEBUG] initialStampDutyRaw:', raw);

            // If missing, attempt to compute using calcStampDuty(state, price, isFirstHomeBuyer, propertyType)
            if ((!raw || String(raw).trim() === '') && typeof window.calcStampDuty === 'function') {
              try {
                const state = formInputs.state || document.getElementById('stateSelect')?.value || '';
                const propRaw = formInputs.propertyValue || formInputs.property_value || formInputs.purchasePrice || formInputs.purchase_price || formInputs.property || calculationData.propertyValue || '';
                const propNum = parseFloat(String(propRaw).replace(/[^0-9.\-]/g, '')) || 0;
                const isFHB = (formInputs.first_home_buyer === 'yes' || formInputs.firstHomeBuyer === 'yes' || formInputs.fhb === 'yes');
                const propertyType = formInputs.propertyType || formInputs.property_type || '';
                if (propNum > 0) {
                  const computed = window.calcStampDuty ? window.calcStampDuty(state, propNum, isFHB, propertyType) : null;
                  if (computed !== null && computed !== undefined) {
                    raw = computed;
                    console.log('📧 [DEBUG] computedStampDuty:', raw);
                  }
                }
              } catch (e) {
                console.warn('Could not compute stamp duty:', e);
              }
            }

            if (!raw || String(raw).trim() === '') return 'N/A';
            const num = parseFloat(String(raw).replace(/[^0-9.\-]/g, ''));
            return isNaN(num) ? String(raw) : `$${fmt(num)}`;
          })(),

          /* CONTENT */
          key_insights: dynamicText.insights,
          next_steps: dynamicText.nextStep,

          /* DEBUG */
          user_agent: navigator.userAgent
        }
      );

      if (response && response.status === 200) {
        console.log('✅ Email sent to', formInputs.user_email);
        return true;
      }

    } catch (err) {
      console.error('❌ Email send failed', err);
      return false;
    }
  };

  /**
   * Download calculation results as PDF using email template styling
   */
  window.downloadResultsAsPDF = async function(filename = 'finco-results') {
    try {
      const results = window.lastCalc || {};
      if (!results || Object.keys(results).length === 0) {
        alert('Please run a calculation first to generate results.');
        return false;
      }

      const loanCategory = document.getElementById('loanCategory')?.value || '';
      const loanPurpose = document.getElementById('loanPurpose')?.value || '';
      const formInputs = captureFormInputs();

      // Collect email payload values (same as email sending)
      const lvr = results.effectiveLVR || results.baseLVR || 0;
      const loanPercent = Number(lvr) || 0;
      const depositPercent = Math.max(0, 100 - loanPercent);
      const loanType = loanPurpose === 'investment' ? 'investor' : loanPurpose === 'construction' ? 'construction' : loanPurpose === 'bridging' ? 'bridging' : loanPurpose === 'refinance' ? 'refinance' : loanPurpose === 'upgrade' ? 'upgrader' : formInputs.first_home_buyer === 'yes' ? 'fhb' : '';
      const dynamicText = buildInsightsAndNextSteps(lvr, loanType);

      // Extract values same way as email
      const chosenPropertyRaw = formInputs.propertyValue || formInputs.property_value || formInputs.purchasePrice || formInputs.purchase_price || formInputs.property || results.propertyValue || '';
      const chosenDepositRaw = formInputs.depositAmount || formInputs.deposit_amount || formInputs.deposit || results.deposit || results.depositAmount || '';
      const chosenState = formInputs.state || formInputs.stateSelect || document.getElementById('stateSelect')?.value || '';
      
      // Helper to format property/deposit/stamp duty
      const formatValue = (raw) => {
        if (!raw || String(raw).trim() === '') return 'N/A';
        const num = parseFloat(String(raw).replace(/[^0-9.\-]/g, ''));
        return isNaN(num) ? String(raw) : '$' + fmt(num);
      };

      const propertyValue = formatValue(chosenPropertyRaw);
      const depositAmount = formatValue(chosenDepositRaw);
      const loanAmount = results.loanAmount ? '$' + fmt(results.loanAmount) : 'N/A';
      // Resolve monthly repayment with multiple fallbacks
      let monthlyRepayment = 'N/A';
      try {
        const monthlyCandidates = [
          results.monthlyRepayment,
          results.monthly_repayment,
          results.newMonthly,
          results.oldMonthly,
          results.monthlyRepaymentAmount
        ];
        for (const c of monthlyCandidates) {
          if (c !== undefined && c !== null && String(c) !== '') {
            const num = parseFloat(String(c).toString().replace(/[^0-9.\-]/g, ''));
            if (!isNaN(num)) { monthlyRepayment = '$' + fmt(Math.round(num)) + ' / month'; break; }
            monthlyRepayment = String(c);
            break;
          }
        }

        // Fallback: compute from loan amount, interest rate and term if available
        if (monthlyRepayment === 'N/A') {
          const P = parseFloat(String(results.totalLoanAmount || results.loanAmount || results.baseLoanAmount || results.currentBalance || 0).replace(/[^0-9.\-]/g, '')) || 0;
          let r = results.interestRate;
          let years = results.loanTerm;
          if ((r === undefined || r === null) && document.getElementById('interestRate')) {
            r = parseFloat(document.getElementById('interestRate').value) || 0;
            if (r > 1) r = r / 100;
          }
          if ((years === undefined || years === null) && document.getElementById('loanTerm')) {
            years = parseFloat(document.getElementById('loanTerm').value) || 0;
          }
          if (P > 0 && r !== undefined && years) {
            if (typeof window.calcMonthlyRepayment === 'function') {
              const val = window.calcMonthlyRepayment(P, r, years);
              if (!isNaN(val)) monthlyRepayment = '$' + fmt(Math.round(val)) + ' / month';
            } else if (r > 0) {
              const n = years * 12;
              const monthlyRate = r / 12;
              const payment = (P * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
              if (!isNaN(payment)) monthlyRepayment = '$' + fmt(Math.round(payment)) + ' / month';
            }
          }
        }
      } catch (e) { monthlyRepayment = 'N/A'; }
      const lvr_percent = lvr ? lvr + '%' : 'N/A';
      // Resolve stamp duty with fallback to calcStampDuty when possible
      let stampDutySaving = 'N/A';
      try {
        const sdRaw = results.stampDuty || results.stamp_duty || results.stampDutySaving || results.stampDutyEstimate || '';
        if (sdRaw && String(sdRaw).trim() !== '') {
          const num = parseFloat(String(sdRaw).replace(/[^0-9.\-]/g, ''));
          stampDutySaving = isNaN(num) ? String(sdRaw) : '$' + fmt(num);
        } else if (typeof window.calcStampDuty === 'function') {
          const state = formInputs.state || document.getElementById('stateSelect')?.value || '';
          const propRaw = formInputs.propertyValue || formInputs.property_value || formInputs.purchasePrice || formInputs.purchase_price || formInputs.property || results.propertyValue || '';
          const propNum = parseFloat(String(propRaw).replace(/[^0-9.\-]/g, '')) || 0;
          const isFHB = (formInputs.first_home_buyer === 'yes' || formInputs.firstHomeBuyer === 'yes' || formInputs.fhb === 'yes');
          if (propNum > 0) {
            const computed = window.calcStampDuty ? window.calcStampDuty(state, propNum, isFHB, formInputs.propertyType || '') : null;
            if (computed !== null && computed !== undefined) stampDutySaving = '$' + fmt(computed);
          }
        }
      } catch (e) { stampDutySaving = 'N/A'; }

      // Build email-template-like HTML for PDF
      const htmlContent = `
<!DOCTYPE html>
<html>

<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
        <tr>
            <td align="center">

                <!-- HEADER -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#000; padding: 0px 55px;">
                    <tr>
                        <td width="33%" style="padding:16px;">
                            <img src="https://mediumslateblue-mantis-913186.hostingersite.com/assests/finko-removebg-preview.png"
                                width="120" style="display:block;background:#fff;">
                            <div style="font-size:12px;color:#fff;font-style:italic;margin-top:6px;">
                                Financial Confidence. Unlocked.
                            </div>
                        </td>

                        <td width="34%" align="center" style="color:#f59e0b;font-size:18px;font-weight:bold;">
                            Your Preliminary<br>${getLoanCategoryName(loanCategory)}<br>
                            Finance Estimate
                        </td>

                        <td width="33%" align="right" style="padding:16px;color:#fff;font-size:12px;">
                            <strong>Ref:</strong>FC${Math.floor(Math.random() * 90000 + 10000)}<br>
                            <strong>Generated:</strong> ${new Date().toLocaleString('en-AU')}
                        </td>
                    </tr>
                </table>

                <!-- MAIN CARD -->
                <table width="100%" cellpadding="0" cellspacing="0"
                    style="max-width:100%px;background:#ffffff;border-radius:8px;padding:30px 70px;">

                    <!-- INTRO -->
                    <tr>
                        <td style="font-size:14px;color:#374151;line-height:1.6;">
                            Dear <strong>${formInputs.user_full_name || 'Valued Client'}</strong>,<br><br>
                            Thank you for requesting a call-back regarding your SMSF lending needs. Your Finco Capital
                            broker is now preparing
                            your tailored strategy session.
                        </td>
                    </tr>

                    <!-- JOURNEY -->
                    <tr>
                        <td style="padding-top:30px;">

                            <div style="font-size:20px;font-weight:bold;color:#f59e0b;margin-bottom:20px;">
                                Where you are in the journey
                            </div>

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="font-size:13px;">1. Online Enquiry</td>
                                    <td></td>
                                    <td align="center" style="font-size:13px;font-weight:bold;">2. Preliminary Estimate
                                    </td>
                                    <td></td>
                                    <td align="center" style="font-size:13px;">3. Strategy Session</td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <div
                                            style="border:2px solid #111827;width:30px;height:30px;line-height:28px;font-weight:bold;">
                                            1</div>
                                    </td>
                                    <td width="50%">
                                        <div style="height:3px;background:#d1d5db;"></div>
                                    </td>
                                    <td align="center">
                                        <div style="background:#f59e0b;color:#fff;border:2px solid #f59e0b;
                width:32px;height:32px;line-height:30px;font-weight:bold;">2</div>
                                    </td>
                                    <td width="100%">
                                        <div style="height:3px;background:#d1d5db;"></div>
                                    </td>
                                    <td align="center">
                                        <div
                                            style="border:2px solid #111827;width:30px;height:30px;line-height:28px;font-weight:bold;">
                                            3</div>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- SNAPSHOT + LVR -->
                    <tr>
                        <td style="padding-top:30px;">

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>

                                    <!-- LEFT: SNAPSHOT -->
                                    <td width="50%" valign="top" style="padding-right:30px;">

                                        <div style="font-size:18px;font-weight:bold;">
                                            Snapshot of your scenario
                                        </div>
                                        <div style="font-size:12px;color:#6b7280;">
                                            These figures are based on the inputs you provided.
                                        </div>

                                        <table width="100%" cellpadding="0" cellspacing="0"
                                            style="margin-top:12px;border:2px solid #d1d5db;padding:10px;background-color:#ffffff; border-radius: 3px;">

                                            <tr>
                                                <td style="padding:12px;font-size:13px;">
                                                    Property Value<br><strong>${propertyValue}</strong>
                                                </td>
                                                <td style="padding:12px;font-size:13px;">
                                                    Loan Amount<br><strong>${loanAmount}</strong>
                                                </td>
                                                <td style="padding:12px;font-size:13px;">
                                                    Deposit<br><strong>${depositAmount}</strong>
                                                </td>
                                            </tr>

                                            <tr>
                                                <td colspan="3"
                                                    style="background:#f59e0b;color:#fff;padding:4px 3px;font-size:14px;font-weight:bold;">
                                                    <pre
                                                        style="padding: 2px;"> Monthly Repayment (P&I)                       ${monthlyRepayment}</pre>
                                                </td>
                                            </tr>

                                        </table>

                                    </td>

                                    <!-- RIGHT: LVR -->
                                    <td width="50%" valign="top" style="padding-left:30px;">

                                        <div style="font-size:18px;font-weight:bold;margin-bottom:50px">
                                            Loan-to-Value Ratio (LVR) Overview
                                        </div>
                                        <div style="display:flex; justify-content: space-between;gap:50px;">
                                            <div style="font-size:12px;margin-bottom:9px;">
                                                Target comfort zone ≤ 80% often gives sharper rates
                                            </div>
                                            <div style="font-size:13px;">
                                                Base LVR: <strong>${lvr_percent}</strong>
                                            </div>
                                        </div>

                                        <div style="border:1px solid #d1d5db;margin-top:14px;">
                                            <div style="height:30px;
      background:linear-gradient(to right,
      #22c55e 0%,
      #22c55e 60%,
      #facc15 60%,
      #facc15 79.2%,
      #ffffff 79.2%,
      #ffffff 79.5%,
      #facc15 79.5%,
      #facc15 85%,
      #ef4444 85%,
      #ef4444 100%);">
                                            </div>
                                        </div>

                                    </td>

                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- FUNDING + STAMP DUTY -->
                    <tr>
                        <td style="padding-top:80px;">

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>

                                    <!-- LEFT: FUNDING -->
                                    <td width="50%" valign="top" style="padding-right:30px;">

                                        <div style="font-size:18px;font-weight:bold;">
                                            How your funding breaks down
                                        </div>
                                        <div style="font-size:12px;font-weight:500;">
                                            Funding Composition for your purchase (Including LMI Gov Charges & Fees)
                                        </div>

                                        <table width="100%" cellpadding="0" cellspacing="0"
                                            style="margin-top:10px; border-left:2px solid #d1d5db;border-bottom:2px solid #d1d5db;padding-top:20px;padding-bottom:20px;padding-right:20px;margin-left:10px;">
                                            <tr>
                                                <td style="background:#1e293b;color:#fff;padding:10px;font-size:12px;">
                                                    ${loanPercent.toFixed(1)}% Loan
                                                </td>
                                                <td style="background:#22c55e;color:#fff;padding:10px;font-size:12px;">
                                                    ${depositPercent.toFixed(1)}% Deposit
                                                </td>
                                            </tr>
                                        </table>

                                    </td>

                                    <!-- RIGHT: STAMP DUTY -->
                                    <td width="50%" valign="top" style="padding-left:30px;">

                                        <div style="font-size:18px;font-weight:bold;margin-bottom:32px">
                                            Potential stamp duty Saving
                                        </div>

                                        <div
                                            style="margin-top:10px;background:#fbbf24;padding:20px 10px;border:1px solid black;">
                                            <strong>Estimated stamp duty:</strong> ${stampDutySaving}<br>
                                            <span style="font-size:12px;">
                                                As a ${chosenState}first home buyer, you may be eligible for a full
                                                stamp duty exemption. Subject to confirmation of eligibility
                                                requirements.
                                            </span>
                                        </div>

                                    </td>

                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- INSIGHTS -->
                    <tr>
                        <td style="padding-top:30px;">

                            <div style="font-size:18px;font-weight:bold;color:#ff9500;">
                                Key insights For Your Decision
                            </div>

                            <div style="margin-top:10px;font-size:14px;line-height:1.6;">
                                ${dynamicText.insights}
                            </div>

                        </td>
                    </tr>

                    <!-- NOTES -->
                    <tr>
                        <td style="padding-top:24px;">

                            <div style="font-size:18px;font-weight:bold;color:#f59e0b;">
                                Important notes & assumptions
                            </div>

                            <div style="margin-top:10px;font-size:13px;color:#374151;line-height:1.6;">
                                ${dynamicText.nextStep}<br><br>
                                <strong>Compliance Note:</strong> This estimate is indicative only and must be reviewed
                                with your accountant and tax advisor. All figures are subject to verification and SMSF
                                fund member serviceability.
                            </div>

                        </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                        <td style="text-align: center;display: flex;justify-content: center;">
                            <div
                                style="width:71%;padding:26px 26px 35px 26px;text-align:center;background-color: #001233;margin: 20px 0px;display: flex;flex-direction:column;justify-content: center;align-items: center;">

                                <div
                                    style="width:60%;background:#ff9500;color:#fff;padding:16px;font-size:18px;font-weight:bold;">
                                    Next step:
                                    <a href="tel:03169032961" style="color:#fff;text-decoration:none;">
                                        20-minute strategy call
                                    </a><br>

                                </div>
                                <br>
                                <div style="display:flex;flex-direction:column">
                                    <span style="font-size:18px;font-weight:500;color:white;">Date
                                        booked: ${new Date().toLocaleString('en-AU')}</span>
                                    <br>
                                    <span style="font-size:18px;font-weight:500;color:white;">
                                        Your dedicated Finco Capital broker will call you shortly.
                                    </span>
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- FOOTER -->

                </table>
            </td>
        </tr>
    </table>

</body>

</html>
      `;

      console.log('📄 downloadResultsAsPDF: starting PDF generation, checking jspdf availability...');
      if (window.jspdf && typeof window.jspdf.jsPDF === 'function') {
        try {
          console.log('📄 jspdf detected — attempting html->pdf render');
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF({ unit: 'mm', format: 'a4' });

          // Render with timeout fallback: if html->pdf does not complete within TIMEOUT_MS,
          // fall back to downloading the HTML version (covers html2canvas/CORS stalls on desktop).
          const TIMEOUT_MS = 10000;
          await new Promise((resolve, reject) => {
            let finished = false;
            const t = setTimeout(() => {
              if (!finished) {
                finished = true;
                reject(new Error('jsPDF html rendering timed out'));
              }
            }, TIMEOUT_MS);

            try {
              doc.html(htmlContent, {
                callback: function (pdf) {
                  if (finished) return;
                  finished = true;
                  clearTimeout(t);
                  try {
                    pdf.save(filename + '.pdf');
                    console.log('✅ PDF saved:', filename + '.pdf');
                    resolve(true);
                  } catch (ex) {
                    reject(ex);
                  }
                },
                x: 10,
                y: 10,
                width: 195,
                html2canvas: { scale: 2 }
              });
            } catch (ex) {
              if (!finished) {
                finished = true;
                clearTimeout(t);
                reject(ex);
              }
            }
          }).catch((err) => { throw err; });

          return true;
        } catch (err) {
          console.warn('📄 PDF generation failed or timed out:', err);
          // Fall through to HTML download fallback below
        }
      } else {
        console.warn('📄 jspdf not available; falling back to HTML download');
      }

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename + '.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (err) {
      console.error('❌ PDF download failed:', err);
      return false;
    }
  };

  /* ================= BUTTON TRIGGER ================= */
  window.sendResultsToEmailNow = async function (overrides = {}) {
    const loanCategory =
      document.getElementById('loanCategory')?.value ||
      window.lastCalc?.loanCategory ||
      '';

    const loanPurpose =
      document.getElementById('loanPurpose')?.value ||
      window.lastCalc?.loanPurpose ||
      '';

    const results = window.lastCalc || {};
    const formInputs = captureFormInputs();

    if (overrides.userFullName) formInputs.user_full_name = overrides.userFullName;
    if (overrides.userEmail) formInputs.user_email = overrides.userEmail;

    return await window.sendCalculationResultsEmail(
      results,
      loanCategory,
      loanPurpose,
      formInputs
    );
  };

  /* ================= HELPERS ================= */
  function getLoanCategoryName(cat) {
    return { home: 'Home Loan', commercial: 'Commercial Loan', smsf: 'SMSF Loan' }[cat] || cat;
  }

  function getLoanPurposeName(p) {
    const map = {
      borrowing: 'Borrowing Capacity',
      repayment: 'Repayment',
      refinance: 'Refinance',
      upgrade: 'Home Upgrade',
      equity: 'Access Equity',
      consolidate: 'Debt Consolidation',
      bridging: 'Bridging Loan',
      investment: 'Investment Loan',
      construction: 'Construction Loan'
    };
    return map[p] || humanizeKey(p);
  }

  function humanizeKey(str) {
    return String(str).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function fmt(n) {
    if (typeof window.fmt === 'function') return window.fmt(n);
    return Number(n).toLocaleString();
  }

  function captureFormInputs() {
    const data = {};
    const form = document.getElementById('loanForm');
    if (form) {
      form.querySelectorAll('input,select,textarea').forEach(el => {
        if (el.id && el.value) data[el.id] = el.value;
      });
    }
    return data;
  }

  /* ================= INIT ON SEND ================= */
  // EmailJS initialization will happen just before sending (not on load to avoid public key conflicts with category-specific services)
})();
