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
  const RECIPIENT_EMAIL = 'mehdiakbar905@gmail.com';

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
      const loanCategory = document.getElementById('loanCategory')?.value || '';
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
