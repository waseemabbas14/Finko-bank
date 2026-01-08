/**
 * email-service.js
 * Handles sending calculation results via email using EmailJS
 */

// Global initialization flag - MUST be in global scope
window.emailjsReady = false;

(function() {
  // EmailJS Configuration
  const EMAILJS_SERVICE_ID = 'service_finco_calculator';
  const EMAILJS_TEMPLATE_ID = 'template_calculation_res';
  const EMAILJS_PUBLIC_KEY = '_3-Pa82P2kn0pPq_M'; // Will be replaced with actual key
  const RECIPIENT_EMAIL = 'mehdiakbarmir905@gmail.com';

  // Configuration: whether to automatically send emails after every calculation.
  // Default is false — emails will only be sent when the user clicks "Send Results to Email".
  const AUTO_SEND_EMAIL_ON_CALC = false;
  // Expose for debugging/toggling from the console if needed
  window.EMAIL_AUTO_SEND = AUTO_SEND_EMAIL_ON_CALC;

  // Initialize EmailJS
  function initializeEmailJS() {
    console.log('📌 Checking for emailjs library...');
    if (typeof emailjs !== 'undefined') {
      console.log('✅ emailjs library found:', typeof emailjs);
      try {
        emailjs.init(EMAILJS_PUBLIC_KEY);
        window.emailjsReady = true;
        console.log('✓ EmailJS initialized successfully with public key');
        return true;
      } catch (error) {
        console.error('❌ Error initializing EmailJS:', error);
        window.emailjsReady = false;
        return false;
      }
    } else {
      console.warn('⚠️ emailjs library not found. Waiting for CDN...');
      window.emailjsReady = false;
      return false;
    }
  }

  // Wait for EmailJS to load if not available yet
  function waitForEmailJS(callback, maxAttempts = 100) {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (typeof emailjs !== 'undefined') {
        clearInterval(checkInterval);
        console.log('✅ EmailJS library loaded from CDN, initializing...');
        initializeEmailJS();
        if (callback) callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error('❌ EmailJS library failed to load after ' + (maxAttempts * 100) + 'ms');
        console.error('Please check: 1) CDN URL is accessible, 2) No Content Security Policy blocks it');
      }
    }, 100);
  }

  /**
   * Send calculation results to email
   * @param {Object} calculationData - The calculation results object
   * @param {String} loanCategory - Type of loan (home, commercial, smsf)
   * @param {String} loanPurpose - Specific loan purpose
   * @param {Object} formInputs - User input data
   */
  window.sendCalculationResultsEmail = async function(calculationData, loanCategory, loanPurpose, formInputs = {}) {
    try {
      // Wait for EmailJS to be initialized if not ready
      if (!window.emailjsReady) {
        console.log('⏳ Waiting for EmailJS to initialize...');
        // Wait up to 5 seconds for EmailJS to be ready
        for (let i = 0; i < 50; i++) {
          if (window.emailjsReady && typeof emailjs !== 'undefined') {
            console.log('✅ EmailJS is now ready');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Final check after waiting
      if (!window.emailjsReady || typeof emailjs === 'undefined') {
        console.error('❌ EmailJS library failed to load. Email cannot be sent.');
        return false;
      }

      // Only send if calculation was successful
      if (!calculationData || typeof calculationData !== 'object') {
        console.warn('No valid calculation data to send');
        return false;
      }

      // Prepare email content
      const emailContent = formatCalculationDataForEmail(calculationData, loanCategory, loanPurpose, formInputs);

      // Send email via EmailJS
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          recipient_email: RECIPIENT_EMAIL,
          loan_category: getLoanCategoryName(loanCategory),
          loan_purpose: getLoanPurposeName(loanPurpose),
          calculation_details: emailContent,
          timestamp: new Date().toLocaleString('en-AU'),
          user_agent: navigator.userAgent,
          // Optional user-provided details (if present in formInputs)
          user_full_name: formInputs.user_full_name || '',
          user_email: formInputs.user_email || ''
        }
      );

      if (response.status === 200) {
        console.log('✓ Calculation results sent successfully to ' + RECIPIENT_EMAIL);
        return true;
      }
    } catch (error) {
      console.error('Error sending calculation results:', error);
      return false;
    }
  };

  /**
   * Public function for button click - sends current results to email
   * Called when user clicks "Send Results to Email" button
   */
  window.sendResultsToEmailNow = async function(overrides = {}) {
    try {
      const loanCategory = document.getElementById('loanCategory')?.value || (window.lastCalc && window.lastCalc.loanCategory) || '';
      const loanPurpose = document.getElementById('loanPurpose')?.value || (window.lastCalc && window.lastCalc.loanPurpose) || '';
      const results = window.lastCalc || {};
      const formInputs = captureFormInputs();

      // Include user-entered details if provided via overrides
      if (overrides.userFullName) formInputs.user_full_name = overrides.userFullName;
      if (overrides.userEmail) formInputs.user_email = overrides.userEmail;

      if (!loanCategory || !loanPurpose) {
        console.error('❌ Error: Loan category or purpose not found. Please complete a calculation first.');
        return false;
      }

      console.log('📧 Sending results to email...');
      const success = await window.sendCalculationResultsEmail(results, loanCategory, loanPurpose, formInputs);
      
      if (success) {
        console.log('✅ Email sent successfully!');
      } else {
        console.error('❌ Failed to send email. Please check your EmailJS configuration or try again.');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error sending results to email:', error);
      return false;
    }
  };

  /**
   * Generate a simple Word (.doc) document containing the current calculation results and form inputs,
   * and trigger a download. Falls back to .doc if PDF generation libraries are not present.
   * @param {String} filenameBase - base filename (no extension)
   * @returns {Boolean} true on success
   */
  window.downloadResultsDocument = function(filenameBase = 'calculation-results') {
    try {
      const results = window.lastCalc || null;
      if (!results || Object.keys(results).length === 0) {
        alert('Please run a calculation first to generate results to include in the guide.');
        return false;
      }

      const loanCategory = document.getElementById('loanCategory')?.value || '';
      const loanPurpose = document.getElementById('loanPurpose')?.value || '';
      const formInputs = captureFormInputs();

      // Build a friendly HTML document
      const title = 'Calculation Results';
      const timestamp = new Date().toLocaleString();

      function rowHtml(key, value) {
        return `<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;background:#f7f7f7;">${key}</td><td style="padding:6px 10px;border:1px solid #ddd;">${value}</td></tr>`;
      }

      let bodyRows = '';
      bodyRows += rowHtml('Timestamp', timestamp);
      bodyRows += rowHtml('Loan Category', loanCategory || 'N/A');
      bodyRows += rowHtml('Loan Purpose', loanPurpose || 'N/A');

      // Add known result fields
      const fields = ['monthlyRepayment','totalLoanAmount','loanAmount','lmiPremium','effectiveLVR','baseLVR','interestTotal','capacity'];
      fields.forEach(f => {
        if (results[f] !== undefined && results[f] !== null) {
          let val = results[f];
          if (typeof val === 'number') val = '$' + (Math.round(val * 100) / 100).toLocaleString();
          bodyRows += rowHtml(f, val);
        }
      });

      // Add form inputs
      if (formInputs && Object.keys(formInputs).length > 0) {
        bodyRows += `<tr><td colspan="2" style="padding:8px;background:#fff;border:1px solid #ddd;font-weight:800;">User Inputs</td></tr>`;
        for (const [k,v] of Object.entries(formInputs)) {
          bodyRows += rowHtml(k, v);
        }
      }

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><div style="font-family:Arial, Helvetica, sans-serif;max-width:800px;margin:20px auto;padding:20px;border:1px solid #eee"><h1 style="color:#F7931E">${title}</h1><p style="color:#666">Generated: ${timestamp}</p><table style="width:100%;border-collapse:collapse">${bodyRows}</table><p style="margin-top:20px;color:#999;font-size:12px">Generated by Finco Capital Calculator</p></div></body></html>`;

      // Prefer PDF if jsPDF is available
      if (window.jspdf && typeof window.jspdf.jsPDF === 'function') {
        try {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF({ unit: 'pt', format: 'a4' });
          doc.html(html, {
            callback: function (doc) {
              const pdfName = filenameBase + '.pdf';
              doc.save(pdfName);
            },
            x: 20,
            y: 20,
            html2canvas: { scale: 1 }
          });
          return true;
        } catch (err) {
          console.warn('PDF generation failed, falling back to .doc:', err);
        }
      }

      // Fallback: create a .doc (Word-friendly HTML blob)
      const blob = new Blob([html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filenameBase + '.doc';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    } catch (err) {
      console.error('Error generating download document:', err);
      return false;
    }
  };

  /**
   * Format calculation data into readable email format
   */
  function formatCalculationDataForEmail(data, loanCategory, loanPurpose, formInputs) {
    let content = '';

    // Add main calculation results
    if (data.monthlyRepayment) {
      content += `Monthly Repayment: $${fmt(data.monthlyRepayment)}\n`;
    }
    if (data.totalLoanAmount) {
      content += `Total Loan Amount: $${fmt(data.totalLoanAmount)}\n`;
    }
    if (data.loanAmount) {
      content += `Base Loan Amount: $${fmt(data.loanAmount)}\n`;
    }
    if (data.lmiPremium) {
      content += `LMI Premium: $${fmt(data.lmiPremium)}\n`;
    }
    if (data.effectiveLVR) {
      content += `Effective LVR: ${data.effectiveLVR}%\n`;
    }
    if (data.baseLVR) {
      content += `Base LVR: ${data.baseLVR}%\n`;
    }
    if (data.interestTotal) {
      content += `Total Interest: $${fmt(data.interestTotal)}\n`;
    }

    // Add form inputs as context
    if (Object.keys(formInputs).length > 0) {
      content += '\n--- User Inputs ---\n';

      // Prefer showing full name and email first if provided
      if (formInputs.user_full_name) content += `Full Name: ${formInputs.user_full_name}\n`;
      if (formInputs.user_email) content += `Email: ${formInputs.user_email}\n`;

      for (const [key, value] of Object.entries(formInputs)) {
        // Skip the two user fields since already shown
        if (key === 'user_full_name' || key === 'user_email') continue;
        if (value && value !== '' && value !== '0') {
          const displayKey = humanizeKey(key);
          content += `${displayKey}: ${value}\n`;
        }
      }
    }

    return content || JSON.stringify(data, null, 2);
  }

  /**
   * Convert loan category code to display name
   */
  function getLoanCategoryName(category) {
    const names = {
      'home': 'Home Loan',
      'commercial': 'Commercial Loan',
      'smsf': 'SMSF Loan'
    };
    return names[category] || category;
  }

  /**
   * Convert loan purpose code to display name
   */
  function getLoanPurposeName(purpose) {
    const names = {
      'borrowing': 'Borrowing Capacity',
      'repayment': 'Repayment',
      'refinance': 'Refinance',
      'upgrade': 'Home Upgrade',
      'equity': 'Access Equity',
      'consolidate': 'Debt Consolidation',
      'bridging': 'Bridging Loans',
      'next-home': 'Next Home',
      'investment': 'Investment Loans',
      'equity-release': 'Equity Release',
      'construction': 'Construction Loans'
    };
    
    // Check for full match first
    if (names[purpose]) return names[purpose];
    
    // Otherwise humanize the purpose string
    return humanizeKey(purpose);
  }

  /**
   * Convert snake_case or kebab-case to Title Case
   */
  function humanizeKey(str) {
    return String(str)
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  /**
   * Utility functions from global scope
   */
  function fmt(n, d = 0) {
    if (typeof window.fmt === 'function') {
      return window.fmt(n, d);
    }
    return Number(n).toLocaleString(undefined, { 
      minimumFractionDigits: d, 
      maximumFractionDigits: d 
    });
  }

  /**
   * Hook into form submission to auto-send emails
   * Call this after calculations are complete
   *
   * This implementation attempts to wrap an existing `renderResults` function if present,
   * and also attaches a fallback `submit` listener to `#loanForm` so emails are sent reliably.
   */
  window.hookEmailSendingIntoCalculations = function() {
    // Attempt to wrap a global renderResults() if present so we send after UI rendering
    try {
      const originalRenderResults = window.renderResults;
      if (typeof originalRenderResults === 'function') {
        window.renderResults = function(loanCategory, calculatorType, loanPurpose, results) {
          const returnValue = originalRenderResults.call(this, loanCategory, calculatorType, loanPurpose, results);
          try {
            const formInputs = captureFormInputs();
            // Only send automatically if explicitly enabled via configuration
            if (window.EMAIL_AUTO_SEND) {
              setTimeout(() => {
                window.sendCalculationResultsEmail(results || window.lastCalc || {}, loanCategory, loanPurpose, formInputs);
              }, 100);
            } else {
              console.log('⚠️ Skipping auto-send of email after renderResults (EMAIL_AUTO_SEND is false)');
            }
          } catch (err) {
            console.error('Error in email hook (renderResults):', err);
          }
          return returnValue;
        };
      }
    } catch (e) { /* ignore */ }

    // Fallback: attach to the loan form submit event (attach once)
    try {
      const form = document.getElementById('loanForm');
      if (form && !form.__emailHookAttached) {
        form.addEventListener('submit', function () {
          // Delay slightly so the page's submit handler can finish rendering results
          setTimeout(() => {
            try {
              const loanCategory = document.getElementById('loanCategory')?.value || '';
              const loanPurpose = document.getElementById('loanPurpose')?.value || (window.lastCalc && window.lastCalc.loanPurpose) || '';
              const results = window.lastCalc || {};
              const formInputs = captureFormInputs();
              if (window.EMAIL_AUTO_SEND) {
                window.sendCalculationResultsEmail(results, loanCategory, loanPurpose, formInputs);
              } else {
                console.log('⚠️ Skipping auto-send of email on form submit (EMAIL_AUTO_SEND is false)');
              }
            } catch (err) {
              console.error('Error in email hook (submit):', err);
            }
          }, 300);
        });
        form.__emailHookAttached = true;
      }
    } catch (e) {
      console.error('Error attaching submit hook:', e);
    }
  };

  /**
   * Capture current form inputs for context
   */
  function captureFormInputs() {
    const inputs = {};
    const form = document.getElementById('loanForm');
    
    if (form) {
      const fields = form.querySelectorAll('input, select, textarea');
      fields.forEach(field => {
        if (field.value && field.id) {
          inputs[field.id] = field.value;
        }
      });
    }

    // Also capture selected State (outside the loan form)
    try {
      const stateEl = document.getElementById('stateSelect');
      if (stateEl) {
        const stateVal = stateEl.value || '';
        const stateText = (stateEl.options && stateEl.selectedIndex >= 0) ? (stateEl.options[stateEl.selectedIndex].text || stateVal) : stateVal;
        if (stateText) inputs['state'] = stateText;
      }
    } catch (e) { /* ignore */ }
    
    return inputs;
  }

  /**
   * Initialize on page load
   */
  // Try immediate initialization first
  console.log('🚀 email-service.js loaded, attempting immediate emailjs check...');
  initializeEmailJS();
  
  // If not ready yet, wait for it
  if (!window.emailjsReady) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        waitForEmailJS(function() {
          window.hookEmailSendingIntoCalculations();
        });
      });
    } else {
      waitForEmailJS(function() {
        window.hookEmailSendingIntoCalculations();
      });
    }
  } else {
    // EmailJS is ready immediately
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        window.hookEmailSendingIntoCalculations();
      });
    } else {
      window.hookEmailSendingIntoCalculations();
    }
  }
})();
