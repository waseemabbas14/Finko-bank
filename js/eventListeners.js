// eventListeners.js - UPDATED & COMPLETED
// - Integrated five new Home calculators (Bridging, Next Home, Investment, Equity Release, Construction)
// - Early-submit delegation to home_extras handlers to avoid duplicate rendering
// - Preserved debounced auto-recalc and container behaviors
// - Added safe lazy loader for home_extras.js when needed
// - UPDATED: Home Upgrade and Access Equity result layouts per spec
// - UPDATED: Debt Consolidation now reads dynamic debts list and shows required comparison

// ============================================
// NAVBAR DROPDOWN FUNCTIONALITY
// ============================================

// Hamburger Menu Toggle
function initHamburgerMenu() {
  const hamburger = document.getElementById('hamburger');
  const navbar = document.getElementById('navbar');
  
  if (!hamburger || !navbar) return;
  
  hamburger.addEventListener('click', function(e) {
    e.preventDefault();
    hamburger.classList.toggle('active');
    navbar.classList.toggle('active');
  });
  
  // Close menu when dropdown is clicked
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', function() {
      hamburger.classList.remove('active');
      navbar.classList.remove('active');
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('header')) {
      hamburger.classList.remove('active');
      navbar.classList.remove('active');
    }
  });

    // Ensure any manual changes to the `loanPurpose` select flip to the back view
    document.addEventListener('change', function(e){
      try {
        const t = e.target;
        if (t && t.id === 'loanPurpose') {
          if (window.dashboardFlip && typeof window.dashboardFlip.showBack === 'function' && typeof window.dashboardFlip.isFlipped === 'function') {
            if (!window.dashboardFlip.isFlipped()) window.dashboardFlip.showBack();
          }
        }
      } catch (err) { }
    });
}

function toggleDropdown(event) {
  try { event.preventDefault(); } catch(e) {}
  // Ensure we operate on the button element even if the event target was an inner element
  let button = event.currentTarget;
  if (button && button.tagName && button.tagName.toLowerCase() !== 'button') {
    button = (button.closest && button.closest('button')) || button;
  }
  const dropdownMenu = button ? button.nextElementSibling : null;
  if (!dropdownMenu) return;
  const isMobile = window.innerWidth <= 768;
  
  // Close all dropdowns first
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    if (menu !== dropdownMenu) {
      menu.classList.remove('active');
    }
  });
  document.querySelectorAll('.dropdown-toggle').forEach(btn => {
    if (btn !== button) {
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  
  // On hover (desktop), always open
  if (!isMobile) {
    dropdownMenu.classList.add('active');
    button.setAttribute('aria-expanded', 'true');
  } else {
    // On mobile, toggle
    const isActive = dropdownMenu.classList.contains('active');
    if (!isActive) {
      dropdownMenu.classList.add('active');
      button.setAttribute('aria-expanded', 'true');
    } else {
      dropdownMenu.classList.remove('active');
      button.setAttribute('aria-expanded', 'false');
    }
  }
}

function closeDropdown(event) {
  // Only close if mouse actually left the dropdown container
  const dropdownContainer = event.currentTarget;
  const relatedTarget = event.relatedTarget;
  
  // Check if mouse moved to something outside this dropdown
  if (relatedTarget && !dropdownContainer.contains(relatedTarget)) {
    const dropdownMenu = dropdownContainer.querySelector('.dropdown-menu');
    const button = dropdownContainer.querySelector('.dropdown-toggle');
    
    if (dropdownMenu) {
      dropdownMenu.classList.remove('active');
    }
    if (button) {
      button.setAttribute('aria-expanded', 'false');
    }
  }
}

// Function to read URL parameters and wait for user to select state, then auto-populate category/purpose
function applyURLParametersToForm() {
  try {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const purpose = params.get('purpose');
    const friendlyFront = params.get('friendlyFront');
    const frontPurpose = params.get('frontPurpose');
    const openBack = params.get('openBack');
    
    // If no category/purpose in URL, nothing to do
    if (!category && !purpose) return;
    
    // Store these values to apply when user selects state
    window.pendingURLSelection = {
      category: category,
      purpose: purpose || frontPurpose,
      friendlyFront: friendlyFront,
      openBack: openBack
    };
    
  } catch (error) {
    console.warn('Error reading URL parameters:', error);
  }
}

// Helper function to apply pending URL selection after state is selected
function applyPendingURLSelection() {
  try {
    if (!window.pendingURLSelection) return;
    
    const { category, purpose, friendlyFront, openBack } = window.pendingURLSelection;
    const loanCategorySelect = document.getElementById('loanCategory');
    const loanPurposeSelect = document.getElementById('loanPurpose');
    
    // Set loan category
    if (category && loanCategorySelect) {
      loanCategorySelect.value = category;
      loanCategorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // For commercial loans, auto-select simple calculator
    if (category === 'commercial') {
      setTimeout(() => {
        const commercialCalc = document.getElementById('commercialCalculatorType');
        if (commercialCalc) {
          commercialCalc.value = 'simple';
          commercialCalc.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, 200);
    }
    
    // For SMSF loans, auto-select simple calculator
    if (category === 'smsf') {
      setTimeout(() => {
        const smsfCalc = document.getElementById('smsfCalculatorType');
        if (smsfCalc) {
          smsfCalc.value = 'simple';
          smsfCalc.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, 200);
    }
    
    // Set loan purpose with retries (purpose options may take time to populate)
    if (purpose) {
      let attempts = 0;
      const maxAttempts = 20;
      
      function applyPurpose() {
        attempts++;
        const loanPurposeSelect = document.getElementById('loanPurpose');
        
        if (loanPurposeSelect && loanPurposeSelect.options && loanPurposeSelect.options.length > 1) {
          // Try to find the purpose option
          const purposeOpt = Array.from(loanPurposeSelect.options).find(o => {
            const val = (o.value || '').trim();
            const text = (o.textContent || '').trim().toLowerCase();
            const friendlyCandidate = (friendlyFront || '').replace(/[_-]/g, ' ').toLowerCase();
            const purposeCandidate = (purpose || '').replace(/[_-]/g, ' ').toLowerCase();
            
            return val === purpose || 
                   text.includes(purposeCandidate) || 
                   (friendlyCandidate && text.includes(friendlyCandidate));
          });
          
          if (purposeOpt) {
            loanPurposeSelect.value = purposeOpt.value;
            loanPurposeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            
            // If openBack is set, flip to the back panel
            if (openBack === '1') {
              setTimeout(() => {
                if (window.dashboardFlip && typeof window.dashboardFlip.showBack === 'function') {
                  window.dashboardFlip.showBack();
                }
              }, 300);
            }
            
            // Clear pending selection
            window.pendingURLSelection = null;
            return;
          }
        }
        
        // Retry if options not ready yet
        if (attempts < maxAttempts) {
          setTimeout(applyPurpose, 150);
        }
      }
      
      applyPurpose();
    }
    
  } catch (error) {
    console.warn('Error applying pending URL selection:', error);
  }
}

function selectFromDropdown(event, category, purpose) {
  event.preventDefault();

  // Close all dropdowns
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.classList.remove('active');
  });
  document.querySelectorAll('.dropdown-toggle').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
  });

  // Map friendly dropdown keys to actual loanPurpose option values used by the app
  const purposeMap = {
    'bridging': 'home_bridging',
    'next-home': 'home_equity', // Buy Your Next Home -> access equity from my home
    'construction': 'home_repayment',
    'custom-build': 'home_custom_build',
    'consolidate': 'home_consolidate',
    'equity-release': 'home_equity_release',
    'expat': 'home_expat',
    'first-home': 'home_first_home', // First Home Buyer -> load dedicated page but select home_repayment calculator
    'home-loan': 'home_borrowing',
    'investment': 'home_investment',
    'refinance': 'home_refinance',
    'reverse': 'home_reverse',
    'self-employed': 'home_self_employed',

    // Commercial mappings
    // 'Business Line of Credit' should select the overdraft/LOC repayment scenario
    'business-loc': 'overdraft',
    'commercial-property': 'commercial_repayment',
    'debtor-finance': 'invoice_finance',
    'equipment-finance': 'equipment_asset',
    'secured-business': 'secured_business',
    'unsecured-business': 'unsecured_business',

    // SMSF mappings
    'residential-smsf': 'smsf_residential',
    'commercial-smsf': 'smsf_commercial'
  };

  const translatedPurpose = purposeMap[purpose] || purpose;

  // Special-case: if user clicked equity-release, expat, investment or reverse dropdowns we only select Home category
  // and intentionally DO NOT set the loanPurpose on the front; we still load the back content.
  const isEquityReleaseOnlyCategory = (purpose === 'equity-release' || purpose === 'expat' || purpose === 'investment' || purpose === 'reverse');

  // Before applying values on the current page, check whether the current page actually contains
  // the calculator. If not, redirect to the appropriate main-page (so the hero calculator exists).
  const isMainPagesPath = window.location.pathname.indexOf('/main-pages/') !== -1;
  const hasCalculatorOnCurrentPage = !!document.getElementById('loanCategory');

  // Compute a conservative "backPurpose" that matches what the main pages expect
  let mainPurpose = translatedPurpose;
  if (purpose === 'equity-release') mainPurpose = 'home_equity_release';
  else if (purpose === 'expat') mainPurpose = 'home_expat';
  else if (purpose === 'investment') mainPurpose = 'home_investment';
  else if (purpose === 'reverse') mainPurpose = 'home_reverse';
  else if (purpose === 'first-home') mainPurpose = 'home_first_home';
  else if (purpose === 'home-loan') mainPurpose = 'home_borrowing';
  else if (purpose === 'refinance') mainPurpose = 'home_refinance';
  else if (purpose === 'custom-build') mainPurpose = 'home_custom_build';

  // Determine the destination main page for this category
  let targetMainPage = '';
  if (category === 'home') targetMainPage = '/main-pages/Home-Loan.html';
  else if (category === 'commercial') targetMainPage = '/main-pages/commercial-loan.html';
  else if (category === 'smsf') targetMainPage = '/main-pages/smsf-loan.html';

  // If the current page is NOT the destination main page, always navigate there so the main hero calculator
  // can receive and apply the selection. This ensures clicks from Home (or any page) take the user to the correct page.
  try {
    const currentPath = (window.location.pathname || '').toLowerCase();
    if (targetMainPage && !currentPath.includes(targetMainPage.toLowerCase())) {
      const params = new URLSearchParams();
      params.set('purpose', mainPurpose);
      params.set('category', category);
      params.set('openBack', '1');
      params.set('friendly', purpose);

      const stateValNow = (document.getElementById('stateSelect') && document.getElementById('stateSelect').value) || '';
      if (!stateValNow) {
        params.set('waitForState', '1');
        params.set('frontPurpose', translatedPurpose);
        params.set('friendlyFront', purpose);
      }

      console.debug('selectFromDropdown: navigating to', targetMainPage, params.toString());
      window.location.href = targetMainPage + '?' + params.toString();
      return; // navigation will occur
    }
  } catch (e) { /* ignore and continue to try in-place behavior */ }

  // Update loan category select
  const loanCategorySelect = document.getElementById('loanCategory');

  // If there is a calculator on this page but it is for a different category, navigate to the correct main page
  if (loanCategorySelect && loanCategorySelect.value && loanCategorySelect.value !== category) {
    let mainPageUrl = '';
    if (category === 'home') mainPageUrl = '/main-pages/Home-Loan.html';
    else if (category === 'commercial') mainPageUrl = '/main-pages/commercial-loan.html';
    else if (category === 'smsf') mainPageUrl = '/main-pages/smsf-loan.html';

    if (mainPageUrl) {
      const params = new URLSearchParams();
      params.set('purpose', mainPurpose);
      params.set('category', category);
      params.set('openBack', '1');
      params.set('friendly', purpose);

      const stateValNow = (document.getElementById('stateSelect') && document.getElementById('stateSelect').value) || '';
      if (!stateValNow) {
        params.set('waitForState', '1');
        params.set('frontPurpose', translatedPurpose);
        params.set('friendlyFront', purpose);
      }

      window.location.href = mainPageUrl + '?' + params.toString();
      return;
    }
  }

  if (loanCategorySelect) {
    loanCategorySelect.value = category;
    loanCategorySelect.dispatchEvent(new Event('change', { bubbles: true }));

    // If the dropdown selection targets Commercial, auto-select the simple commercial calculator
    if (category === 'commercial') {
      const commercialCalc = document.getElementById('commercialCalculatorType');
      if (commercialCalc) {
        commercialCalc.value = 'simple';
        commercialCalc.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // If the dropdown selection targets SMSF, auto-select the simple SMSF calculator
    if (category === 'smsf') {
      const smsfCalc = document.getElementById('smsfCalculatorType');
      if (smsfCalc) {
        smsfCalc.value = 'simple';
        smsfCalc.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  // Load back page immediately (don't wait for state selection)
  if (window.loadCategoryPage) {
      // If the dashboard flip API is available and the front is currently visible, show the back immediately
      try {
        if (window.dashboardFlip && typeof window.dashboardFlip.showBack === 'function' && typeof window.dashboardFlip.isFlipped === 'function') {
          if (!window.dashboardFlip.isFlipped()) window.dashboardFlip.showBack();
        }
      } catch (e) { }
    let backPurpose = translatedPurpose;
    if (purpose === 'equity-release') {
      backPurpose = 'home_equity_release';
    } else if (purpose === 'expat') {
      backPurpose = 'home_expat';
    } else if (purpose === 'investment') {
      backPurpose = 'home_investment';
    } else if (purpose === 'reverse') {
      backPurpose = 'home_reverse';
    } else if (purpose === 'first-home') {
      backPurpose = 'home_first_home';
    } else if (purpose === 'home-loan') {
      backPurpose = 'home_borrowing';
    } else if (purpose === 'refinance') {
      backPurpose = 'home_refinance';
    } else if (purpose === 'custom-build') {
      backPurpose = 'home_custom_build';
    }
    window.loadCategoryPage(category, backPurpose);
  }

  // If state is not chosen yet, store pending selection and wait for state selection
  const stateVal = (document.getElementById('stateSelect') && document.getElementById('stateSelect').value) || '';
  if (!stateVal) {
    // store whether this is the equity-release special case and the translated purpose for front calculator
    window.pendingDropdownSelection = { category, purpose: translatedPurpose, equityOnlyCategory: isEquityReleaseOnlyCategory, originalPurpose: purpose };
    return;
  }

  // Update loan purpose select (use retries so the first selection reliably sets the front purpose)
  (function applyFrontPurposeWithRetries() {
    const maxAttempts = 14;
    let attempts = 0;

    function attempt() {
      attempts++;

      // Force loan type (category) first
      try {
        const lc = document.getElementById('loanCategory');
        if (lc) {
          lc.value = category;
          lc.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // Also ensure calculator type defaults so purpose options populate
        if (category === 'commercial') {
          const commercialCalc = document.getElementById('commercialCalculatorType');
          if (commercialCalc) { commercialCalc.value = 'simple'; commercialCalc.dispatchEvent(new Event('change', { bubbles: true })); }
        }
        if (category === 'smsf') {
          const smsfCalc = document.getElementById('smsfCalculatorType');
          if (smsfCalc) { smsfCalc.value = 'simple'; smsfCalc.dispatchEvent(new Event('change', { bubbles: true })); }
        }
      } catch (e) { /* ignore */ }

      const loanPurposeSelect = document.getElementById('loanPurpose');

      // If options not ready yet, retry a few times
      if (!loanPurposeSelect || !loanPurposeSelect.options || loanPurposeSelect.options.length === 0) {
        if (attempts < maxAttempts) return setTimeout(attempt, 120);
        // last attempt will proceed even if options are empty
      }

      try {
        // Special handling for certain friendly dropdown choices
        if (purpose === 'home-loan') {
          if (loanPurposeSelect) {
            const borrowingOpt = Array.from(loanPurposeSelect.options).find(o => o.value === 'home_borrowing' || o.textContent.trim().toLowerCase().includes('borrowing'));
            if (borrowingOpt) loanPurposeSelect.value = borrowingOpt.value; else loanPurposeSelect.value = 'home_borrowing';
            loanPurposeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else if (purpose === 'refinance') {
          if (loanPurposeSelect) {
            const refinanceOpt = Array.from(loanPurposeSelect.options).find(o => o.value === 'home_refinance' || o.textContent.trim().toLowerCase().includes('refinance'));
            if (refinanceOpt) loanPurposeSelect.value = refinanceOpt.value; else loanPurposeSelect.value = 'home_refinance';
            loanPurposeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else if (purpose === 'first-home') {
          if (loanPurposeSelect) {
            const repaymentOpt = Array.from(loanPurposeSelect.options).find(o => o.value === 'home_repayment' || o.textContent.trim().toLowerCase().includes('repayment'));
            if (repaymentOpt) loanPurposeSelect.value = repaymentOpt.value; else loanPurposeSelect.value = 'home_repayment';
            loanPurposeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else if (purpose === 'self-employed') {
          if (loanPurposeSelect) {
            const repaymentOpt = Array.from(loanPurposeSelect.options).find(o => o.value === 'home_repayment' || o.textContent.trim().toLowerCase().includes('repayment'));
            if (repaymentOpt) loanPurposeSelect.value = repaymentOpt.value; else loanPurposeSelect.value = 'home_repayment';
            loanPurposeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else if (purpose === 'custom-build') {
          if (loanPurposeSelect) {
            const repaymentOpt = Array.from(loanPurposeSelect.options).find(o => o.value === 'home_repayment' || o.textContent.trim().toLowerCase().includes('repayment'));
            if (repaymentOpt) loanPurposeSelect.value = repaymentOpt.value; else loanPurposeSelect.value = 'home_repayment';
            loanPurposeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else if (!isEquityReleaseOnlyCategory && loanPurposeSelect) {
          // If the option exists, set it; otherwise try to find a close match (also match the friendly label)
          const friendlyCandidate = (purpose || '').replace(/[_-]/g,' ').toLowerCase();
          const translatedCandidate = (translatedPurpose || '').replace(/[_-]/g,' ').toLowerCase();
          const opt = Array.from(loanPurposeSelect.options).find(o => {
            const text = (o.textContent || '').trim().toLowerCase();
            const val = (o.value || '').trim();
            return val === translatedPurpose || val === purpose || (o.dataset && o.dataset.key === translatedPurpose) || text.includes(translatedCandidate) || (friendlyCandidate && text.includes(friendlyCandidate));
          });
          if (opt) loanPurposeSelect.value = opt.value; else loanPurposeSelect.value = translatedPurpose;
          loanPurposeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch (e) { /* ignore */ }

      // Trigger back-side content load if flip panel is available
      if (window.loadCategoryPage) {
        try {
          if (window.dashboardFlip && typeof window.dashboardFlip.showBack === 'function' && typeof window.dashboardFlip.isFlipped === 'function') {
            if (!window.dashboardFlip.isFlipped()) window.dashboardFlip.showBack();
          }
        } catch (e) { }

        let backPurpose = translatedPurpose;
        if (purpose === 'equity-release') {
          backPurpose = 'home_equity_release';
        } else if (purpose === 'expat') {
          backPurpose = 'home_expat';
        } else if (purpose === 'investment') {
          backPurpose = 'home_investment';
        } else if (purpose === 'reverse') {
          backPurpose = 'home_reverse';
        } else if (purpose === 'first-home') {
          backPurpose = 'home_first_home';
        } else if (purpose === 'home-loan') {
          backPurpose = 'home_borrowing';
        } else if (purpose === 'refinance') {
          backPurpose = 'home_refinance';
        } else if (purpose === 'custom-build') {
          backPurpose = 'home_custom_build';
        }
        window.loadCategoryPage(category, backPurpose);
      }

      // If we reached here and loanPurposeSelect had no options and we still haven't succeeded,
      // try again a couple more times to cover slow option population
      if ((!document.getElementById('loanPurpose') || document.getElementById('loanPurpose').options.length === 0) && attempts < maxAttempts) {
        setTimeout(attempt, 160);
      }
    }

    // Start attempts immediately
    attempt();
  })();
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
  const navbar = document.querySelector('.navbar');
  if (navbar && !navbar.contains(event.target)) {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      menu.classList.remove('active');
    });
    document.querySelectorAll('.dropdown-toggle').forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
    });
  }
});

// Global last calculation snapshot for SUMMARY logic
window.lastCalc = null;
// Gate auto-recalc until first manual Calculate (Welcome persists for Step 1 & 2)
window.hasCalculated = false;
// Global debounced timer so we can cancel on scenario change
window.__recalcTimer = null;
// Flag to distinguish between manual and auto-recalc
window.isAutoRecalc = false;

// Helper to reset auto-recalc when scenario changes (loan type/purpose)
window.resetAutoRecalcGate = function() {
  window.hasCalculated = false;
  window.lastCalc = null;
  try { if (window.__recalcTimer) clearTimeout(window.__recalcTimer); } catch (e) {}
  window.__recalcTimer = null;
};

// Helper to safely update window.lastCalc while always including loanCategory
window.updateLastCalc = function(calcObj) {
  const loanCategory = document.getElementById('loanCategory')?.value || '';
  window.lastCalc = { ...calcObj, loanCategory };
};

/**
 * Email modal helpers
 * Creates a simple accessible modal to request Full name and Email from the user
 */
function ensureEmailModalExists() {
  if (document.getElementById('emailModal')) return;

  // Basic styles (scoped via id)
  const style = document.createElement('style');
  style.id = 'email-modal-styles';
  style.textContent = `
    /* Modal backdrop & layout */
    #emailModal{position:fixed;left:0;top:0;width:100%;height:100%;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);z-index:4000;padding:20px}
    #emailModal.show{display:flex}

    /* Modal card */
    #emailModal .modal-content{background:#ffffff;padding:20px;border-radius:12px;max-width:460px;width:100%;box-shadow:0 12px 30px rgba(3,10,30,0.18);border:1px solid rgba(15,15,15,0.04);font-family:inherit}

    /* Header */
    #emailModal .modal-header{display:flex;flex-direction:column;gap:12px;margin-bottom:8px}
    #emailModal .modal-header-row{display:flex;justify-content:space-between;align-items:center}
    #emailModal h3{margin:0;font-size:18px;color:var(--bg);font-weight:700}
    #emailModal .modal-sub{font-size:13px;color:var(--muted)}

    /* Accent bar below header */
    #emailModal .modal-accent{height:4px;background:linear-gradient(90deg,var(--accent),var(--primary));border-radius:6px;margin-bottom:10px}

    /* Body */
    #emailModal .modal-body{margin-bottom:6px}
    #emailModal label{display:block;font-size:13px;margin-bottom:6px;color:var(--muted);font-weight:600}
    #emailModal input[type="text"],#emailModal input[type="email"]{width:100%;padding:10px;border:1px solid #e6e6e6;border-radius:8px;font-size:14px;background:transparent;color:inherit;outline:none;transition:box-shadow 160ms ease, border-color 160ms ease}
    #emailModal input[type="text"]:focus,#emailModal input[type="email"]:focus{box-shadow:0 0 0 6px rgba(247,147,30,0.08);border-color:var(--accent)}

    #emailModal #emailModalError{color:var(--danger);margin-top:8px;display:none;font-size:13px}

    /* Actions */
    #emailModal .modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}
    #emailModal .btn{padding:10px 14px;border-radius:8px;border:none;cursor:pointer;font-weight:700}
    #emailModal .btn.cancel{background:transparent;border:1px solid #ececec;color:var(--muted)}
    #emailModal .btn.primary{background:linear-gradient(90deg,var(--accent),#ff9f2f);color:#fff;box-shadow:0 8px 20px rgba(247,147,30,0.12)}
    #emailModal .btn.primary:active{transform:translateY(1px)}

    /* Close button */
    #emailModal #emailModalClose{background:transparent;border:none;font-size:18px;cursor:pointer;color:var(--muted);padding:4px;border-radius:6px}
    #emailModal #emailModalClose:hover{background:rgba(0,0,0,0.04)}

    /* Responsive tweaks */
    @media (max-width:420px){ #emailModal .modal-content{padding:16px} #emailModal h3{font-size:16px} }
  `;
  document.head.appendChild(style);

  // Modal DOM
  const modal = document.createElement('div');
  modal.id = 'emailModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="modal-content" role="document">
      <div class="modal-header">
        <h3>Get a Free Consultation</h3>
        <button id="emailModalClose" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <label for="emailModalFullName">Full name</label>
        <input id="emailModalFullName" type="text" placeholder="Full name" />
        <label for="emailModalEmail" style="margin-top:10px">Email address</label>
        <input id="emailModalEmail" type="email" placeholder="you@example.com" />
        <div id="emailModalError" style="color:#ef4444;margin-top:8px;display:none;font-size:13px"></div>
      </div>
      <div class="modal-actions">
        <button class="btn cancel" id="emailModalCancel" type="button">Cancel</button>
        <button class="btn primary" id="emailModalSubmit" type="button">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Event wiring
  const closeModal = () => {
    modal.classList.remove('show');
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') closeModal(); };

  modal.querySelector('#emailModalClose').addEventListener('click', closeModal);
  modal.querySelector('#emailModalCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  // Submit action dispatches a custom event with details and does basic validation
  modal.querySelector('#emailModalSubmit').addEventListener('click', function () {
    const fullName = document.getElementById('emailModalFullName').value.trim();
    const email = document.getElementById('emailModalEmail').value.trim();
    const errEl = document.getElementById('emailModalError');
    errEl.style.display = 'none';
    if (!fullName) { errEl.textContent = 'Please enter your full name.'; errEl.style.display = 'block'; return; }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { errEl.textContent = 'Please enter a valid email address.'; errEl.style.display = 'block'; return; }

    // Dispatch event and close
    modal.dispatchEvent(new CustomEvent('email-modal-submit', { detail: { fullName, email } }));
    closeModal();
  });
}

function showEmailModal(prefill = {}, onSubmit) {
  ensureEmailModalExists();
  const modal = document.getElementById('emailModal');
  if (!modal) return;
  document.getElementById('emailModalFullName').value = prefill.fullName || '';
  document.getElementById('emailModalEmail').value = prefill.email || '';
  const handler = function (e) { if (typeof onSubmit === 'function') onSubmit(e.detail); modal.removeEventListener('email-modal-submit', handler); };
  modal.addEventListener('email-modal-submit', handler);
  modal.classList.add('show');
  // focus first input
  setTimeout(() => document.getElementById('emailModalFullName').focus(), 20);
}

// Safe lazy loader for home_extras.js (no calnew.html edits required)
function ensureHomeExtrasLoaded() {
  return new Promise((resolve, reject) => {
    if (window.homeExtras && typeof window.homeExtras.renderFields === 'function') {
      resolve();
      return;
    }
    // If script already appended, wait briefly for it to initialize
    if (document.querySelector('script[data-home-extras="1"]')) {
      setTimeout(() => resolve(), 100);
      return;
    }

    const s = document.createElement('script');
    s.src = 'js/home_extras.js';
    s.async = true;
    s.defer = true;
    s.dataset.homeExtras = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load home_extras.js'));
    document.head.appendChild(s);
  });
}

// Attach 'Get a Free Consultation' handler — behave like 'Send Results to Email'
function initConsultationButtons() {
  // Delegated handler: match elements related to consultation (flexible matching)
  // Use capture phase so we intercept before other handlers or navigation
  document.addEventListener('click', function (e) {
    try {
      const el = e.target.closest('a,button');
      if (!el) return;

      const txt = ((el.textContent || el.innerText) || '').replace(/\s+/g, ' ').trim();
      const isConsultationText = /free\s*consultation|book\s*a\s*consultation|get\s*a\s*free\s*consultation|consultation/i.test(txt);
      const isMarked = el.dataset && el.dataset.action === 'consultation';
      const hasClass = el.classList && (el.classList.contains('btn-consultation') || el.classList.contains('consultation-btn'));

      if (!isConsultationText && !isMarked && !hasClass) return;

      // Intercept the click and prevent other handlers/navigation
      try { e.preventDefault(); } catch (err) {}
      try { e.stopPropagation(); } catch (err) {}
      try { e.stopImmediatePropagation(); } catch (err) {}

      console.debug('initConsultationButtons: intercepted consultation click ->', txt, el);

      // Prevent double clicks
      if (el._sending) return;
      el._sending = true;
      const origHTML = el.innerHTML;

      // Open modal to collect name & email, then send
      showEmailModal({}, async function (details) {
        try {
          el.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:8px"></i>Sending...`;
          const success = await window.sendResultsToEmailNow({ userFullName: details.fullName, userEmail: details.email });
          if (success) {
            el.innerHTML = `<i class="fa-solid fa-check" style="margin-right:8px; color: #01eb5a;"></i>Email Sent!`;
          } else {
            el.innerHTML = `<i class="fa-solid fa-exclamation-circle" style="margin-right:8px; color: #ef4444;"></i>Calculate First to Submit`;
          }
        } catch (err) {
          console.error('Error sending consultation email:', err);
          el.innerHTML = `<i class="fa-solid fa-exclamation-circle" style="margin-right:8px; color: #ef4444;"></i>Error`;
        } finally {
          setTimeout(function () {
            try { el.innerHTML = origHTML; } catch (e) {}
            el._sending = false;
          }, 3000);
        }
      });

      // If user closes modal without submitting, re-enable the button and restore text
      const modal = document.getElementById('emailModal');
      if (modal) {
        const observer = new MutationObserver((mutations) => {
          if (!modal.classList.contains('show')) {
            try { el._sending = false; el.innerHTML = origHTML; } catch (e) {}
            observer.disconnect();
          }
        });
        observer.observe(modal, { attributes: true, attributeFilter: ['class'] });

        // In case modal was already closed quickly
        if (!modal.classList.contains('show')) {
          try { el._sending = false; el.innerHTML = origHTML; } catch (e) {}
          observer.disconnect();
        }
      }

    } catch (err) {
      console.error('initConsultationButtons handler error:', err);
    }
  }, true);
}

function initDownloadGuideButtons() {
  // Delegated handler for download guide buttons (captures phrases like 'download' + 'construction' or 'building')
  document.addEventListener('click', function (e) {
    try {
      const el = e.target.closest('a,button');
      if (!el) return;
      const txt = ((el.textContent || el.innerText) || '').replace(/\s+/g, ' ').trim();
      const isDownloadGuide = /download/i.test(txt) && /(construction|building|guide|building guide|construction guide)/i.test(txt);
      const hasClass = el.classList && (el.classList.contains('btn-download-guide') || el.classList.contains('btn-orange'));
      if (!isDownloadGuide && !hasClass) return;

      e.preventDefault();
      e.stopPropagation();
      try { e.stopImmediatePropagation(); } catch (err) {}

      // Ensure there are results to include
      if (!window.lastCalc || Object.keys(window.lastCalc).length === 0) {
        alert('Please run a calculation first — the download includes current calculation results.');
        return;
      }

      const filename = 'construction_results_' + (new Date()).toISOString().slice(0,19).replace(/[:T]/g, '-') ;
      const success = window.downloadResultsDocument(filename);
      if (!success) alert('Failed to create download. Check the console for details.');
    } catch (err) {
      console.error('initDownloadGuideButtons error:', err);
    }
  }, true);
}
// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Initialize hamburger menu for mobile
  initHamburgerMenu();
  
  // Apply URL parameters if page was navigated with query parameters (from dropdown selection)
  applyURLParametersToForm();
  
  // Setup streamlined loan selection
  setupStreamlinedLoanSelection();

  // Initialize results panel with ANIMATED welcome message
  initializeResultsPanel();

  // Attach 'Get a Free Consultation' handler to behave like 'Send Results to Email'
  initConsultationButtons();

  // Attach 'Download Guide' buttons (e.g., Download Construction Guide) to download a document with current results
  initDownloadGuideButtons();

  // Setup state change listener (does not reset gate; same scenario)
  document.getElementById('stateSelect').addEventListener('change', (e) => {
    updateStatePill();
    updateSummary();

    // If a dropdown selection was made before the state, apply the front calculator now
    try {
      const pending = window.pendingDropdownSelection;
      if (pending && pending.category) {
        // Apply category (already set) and set front purpose/calculator
        const loanCategorySelect = document.getElementById('loanCategory');
        const loanPurposeSelect = document.getElementById('loanPurpose');
        
        if (loanCategorySelect) {
          loanCategorySelect.value = pending.category;
          loanCategorySelect.dispatchEvent(new Event('change', { bubbles: true }));

          // If the pending selection is for Commercial, auto-select the simple commercial calculator so
          // purpose options populate and the pending purpose can be applied immediately.
          if (pending.category === 'commercial') {
            const commercialCalc = document.getElementById('commercialCalculatorType');
            if (commercialCalc) {
              commercialCalc.value = 'simple';
              commercialCalc.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          // If the pending selection is for SMSF, auto-select the simple SMSF calculator
          if (pending.category === 'smsf') {
            const smsfCalc = document.getElementById('smsfCalculatorType');
            if (smsfCalc) {
              smsfCalc.value = 'simple';
              smsfCalc.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }

        // Attempt to apply the pending front-purpose, with retries in case options take time to populate
        // This fixes the "first time" failure where purpose options were not yet available.
        if (pending.equityOnlyCategory) {
          // Leave front purpose unset (back page already loaded)
          window.pendingDropdownSelection = null;
        } else {
          const translatedPurpose = pending.purpose;
          const friendlyCandidate = (pending.originalPurpose || '').replace(/[_-]/g,' ').toLowerCase();
          let attempts = 0;
          let loanPurposeSelectRef = loanPurposeSelect;
          function applyPurposeAttempt() {
            attempts++;
            if (!loanPurposeSelectRef) loanPurposeSelectRef = document.getElementById('loanPurpose');
            if (loanPurposeSelectRef && loanPurposeSelectRef.options && loanPurposeSelectRef.options.length > 0) {
              const opt = Array.from(loanPurposeSelectRef.options).find(o => {
                const text = (o.textContent || '').trim().toLowerCase();
                const val = (o.value || '').trim();
                return val === translatedPurpose || (o.dataset && o.dataset.key === translatedPurpose) || text.includes((translatedPurpose || '').replace(/[_-]/g,' ')) || (friendlyCandidate && text.includes(friendlyCandidate));
              });
              if (opt) loanPurposeSelectRef.value = opt.value; else loanPurposeSelectRef.value = translatedPurpose;
              loanPurposeSelectRef.dispatchEvent(new Event('change', { bubbles: true }));
              window.pendingDropdownSelection = null;
              return;
            }
            if (attempts < 10) setTimeout(applyPurposeAttempt, 120);
            else {
              if (loanPurposeSelectRef) {
                try { loanPurposeSelectRef.value = translatedPurpose; loanPurposeSelectRef.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
              }
              window.pendingDropdownSelection = null;
            }
          }
          setTimeout(applyPurposeAttempt, 80);
        }
      }
    } catch (err) {
      console.warn('Applying pending dropdown selection failed', err);
    }

    // Also apply pending URL selection if it exists (from navigating with URL parameters)
    if (window.pendingURLSelection) {
      applyPendingURLSelection();
    }
  });

  // Setup state pill click handler
  setupStatePillClickHandler();

  // Dynamic recalc on any input change (debounced) - only after first manual calculate
  const dyn = document.getElementById('dynamicFields');
  if (dyn) {
    const scheduleRecalc = () => {
      // Only recalc when state and purpose are chosen AND after first manual calculate
      const state = document.getElementById('stateSelect').value;
      const loanPurpose = document.getElementById('loanPurpose').value;
      if (!state || !loanPurpose || !window.hasCalculated) return;
      
      try { 
        if (window.__recalcTimer) clearTimeout(window.__recalcTimer); 
      } catch (e) {}
      
      window.__recalcTimer = setTimeout(() => {
        try {
          // Create a proper form submission that will respect the validation
          const submitEvent = new Event('submit', { 
            cancelable: true,
            bubbles: true 
          });
          
          // Set a flag to indicate this is an auto-recalc, not manual
          window.isAutoRecalc = true;
          document.getElementById('loanForm').dispatchEvent(submitEvent);
          window.isAutoRecalc = false;
        } catch (e) {
          console.error('Auto-recalc error:', e);
        }
      }, 400);
    };
    
    dyn.addEventListener('input', scheduleRecalc);
    dyn.addEventListener('change', scheduleRecalc);
  }

  // Initial setup
  updateStatePill();
  document.getElementById('disclaimer').innerText = '';

  // Setup flip button for the right panel. This swaps the panel DOM nodes (not cloning),
  // so existing event listeners and size/height behaviour are preserved.
  (function setupDashboardFlip() {
    const dashboardCard = document.getElementById('dashboardCard');
    const flipButton = document.getElementById('flipButton');
    if (!dashboardCard || !flipButton) return;

    // Create containers to hold the original front nodes and the back-side content
    const frontContainer = document.createElement('div');
    frontContainer.dataset.role = 'front-holder';
    frontContainer.className = 'panel-face front-holder';

    // Move existing children into the front container (preserves listeners)
    while (dashboardCard.firstChild) {
      frontContainer.appendChild(dashboardCard.firstChild);
    }
    // Append the front container back into the dashboard (initial state)
    dashboardCard.appendChild(frontContainer);

    // Prepare a back container with commercial loan page content
    const backContainer = document.createElement('div');
    backContainer.dataset.role = 'back-holder';
    backContainer.className = 'panel-face back-holder';
    backContainer.innerHTML = `
      <div class="commercial-page-container" style="padding:12px 30px;">
        <h1>Flexible Capital. Strategic Control.</h1>
        <p>A Business Line of Credit gives your company immediate access to working capital helping you manage cash flow with precision and flexibility. Similar to a corporate credit card, this facility allows you to draw funds as needed, up to your approved limit—while paying interest only on the amount you use.</p>
        <p>Through Finco Capital's network of leading banks and specialist lenders, we can arrange both secured and unsecured lines of credit designed around your unique business profile and growth strategy.</p>
        <strong>At a Glance</strong>
        <ul>
          <li>Borrowing capacity up to $5,000,000</li>
          <li>Enhances and stabilises cash flow</li>
          <li>Flexible access to funds on demand</li>
          <li>Interest charged only on drawn amounts</li>
        </ul>
        <div class="btn-wrap">
          <a href="#" class="btn btn-dark">Apply Now</a>
          <button type="button" class="btn btn-dark btn-consultation" data-action="consultation" style="margin-left:8px">Get a Free Consultation</button>
        </div>
        <div class="divider"></div>
        <h2>Why Choose a Business Line of Credit</h2>
        <p>A line of credit is an elegant solution for businesses seeking fluid access to capital without the rigidity of traditional loans. Whether managing seasonal fluctuations, covering short-term funding gaps, or seizing new opportunities, it provides continuous financial agility—keeping your business in control.</p>
        <div class="divider"></div>
        <h2>Eligibility &amp; Process</h2>
        <p>At Finco Capital, we take a tailored approach to every facility. Our team analyses your business structure, financial performance, and funding objectives before matching you with the most suitable lender from our panel of major banks and non-bank specialists.</p>
        <strong>Typical Lender Assessment Criteria</strong>
        <ul>
          <li><strong>Business Financials:</strong> Review of bank statements, financial reports, and balance sheets.</li>
          <li><strong>Time in Business:</strong> Demonstrated trading history and operational stability.</li>
          <li><strong>Serviceability:</strong> Evidence of consistent cash flow capable of servicing the facility.</li>
          <li><strong>Credit Profile:</strong> Lenders accommodate a wide range of credit histories—from prime through to complex.</li>
        </ul>
        <p>Our process ensures each recommendation is transparent, efficient, and aligned with your business's long-term goals.</p>
        <div class="divider"></div>
        <h2>Frequently Asked Questions</h2>
        <div class="faq">
          <div class="faq-question" tabindex="0" role="button" aria-expanded="false">Are there any fees?</div>
          <div class="faq-answer">Associated fees may include application, account maintenance, or facility management costs. Finco Capital presents all possible charges from our lender partners upfront, ensuring full transparency before you proceed.</div>
        </div>
        <div class="faq">
          <div class="faq-question" tabindex="0" role="button" aria-expanded="false">How long can I access the funds for?</div>
          <div class="faq-answer">Typically lines of credit are reviewed annually by lenders; your access period will depend on the facility terms. Speak to an advisor for a tailored timeline.</div>
        </div>
        <div class="faq">
          <div class="faq-question" tabindex="0" role="button" aria-expanded="false">What can I use it for?</div>
          <div class="faq-answer">A business line of credit is commonly used for working capital, managing cash flow, short-term operational expenses, and seasonal inventory purchase.</div>
        </div>
        <div class="faq">
          <div class="faq-question" tabindex="0" role="button" aria-expanded="false">Is this the right solution for my business?</div>
          <div class="faq-answer">It depends on your cashflow profile and funding needs — our advisors can assess whether a line of credit or alternate facility better suits your goals.</div>
        </div>
      </div>
    `;
    
    // Initialize FAQ toggles for back panel
    (function(){
      const questions = backContainer.querySelectorAll('.faq-question');
      questions.forEach(q => {
        const faq = q.closest('.faq');
        const answer = faq.querySelector('.faq-answer');
        answer.style.boxSizing = 'border-box';

        function openFaq(){
          faq.classList.add('open');
          q.setAttribute('aria-expanded','true');
          answer.style.display = 'block';
          const height = answer.scrollHeight + 'px';
          answer.style.maxHeight = '0px';
          answer.style.opacity = '0';
          answer.style.paddingTop = '0px';
          requestAnimationFrame(() => {
            answer.style.maxHeight = height;
            answer.style.opacity = '1';
            answer.style.paddingTop = '15px';
          });
          const onEnd = function(e){ if(e.propertyName === 'max-height'){ answer.style.maxHeight = 'none'; answer.removeEventListener('transitionend', onEnd); } };
          answer.addEventListener('transitionend', onEnd);
        }

        function closeFaq(){
          const cur = answer.scrollHeight + 'px';
          answer.style.maxHeight = cur;
          void answer.offsetHeight;
          requestAnimationFrame(() => {
            answer.style.maxHeight = '0px';
            answer.style.opacity = '0';
            answer.style.paddingTop = '0px';
          });
          faq.classList.remove('open');
          q.setAttribute('aria-expanded','false');
        }

        function toggle(){
          if(faq.classList.contains('open')) closeFaq(); else openFaq();
        }

        q.addEventListener('click', function(e){
          document.querySelectorAll('.faq.open').forEach(openFaq => {
            if(openFaq !== faq){
              const btn = openFaq.querySelector('.faq-question');
              const a = openFaq.querySelector('.faq-answer');
              openFaq.classList.remove('open');
              if(btn) btn.setAttribute('aria-expanded','false');
              if(a){ a.style.maxHeight = '0px'; a.style.opacity = '0'; a.style.paddingTop = '0px'; }
            }
          });
          toggle();
        });

        q.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(); } });
      });
    })();

    // Note: the CSS `.back-holder` applies `transform: rotateY(180deg)` so the back
    // content reads correctly when the parent `#dashboardCard` is rotated.
    // Append both faces so the front remains in the DOM (it determines height)
    // while the back is absolutely overlaid. This ensures other scripts can
    // still `getElementById` elements inside the front face even when the back
    // is visible.
    dashboardCard.appendChild(backContainer);

    let flipped = false; // start with front visible until user selects a scenario

    // Ensure the parent is positioned for absolute overlay
    dashboardCard.style.position = dashboardCard.style.position || 'relative';

    // Apply initial flipped state and button text, hide flip control until selection
    dashboardCard.classList.add('flip-transition');
    dashboardCard.classList.toggle('flipped', flipped);
    flipButton.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    flipButton.textContent = flipped ? 'Show front' : 'Flip panel';
    // Hide flip control initially until the user chooses a calculator/category/purpose
    flipButton.style.display = 'none';

    // Show/hide flip control depending on whether the user has selected a scenario
    function maybeShowFlipControls() {
      const loanCategoryVal = document.getElementById('loanCategory')?.value || '';
      const loanPurposeVal = document.getElementById('loanPurpose')?.value || '';
      const commercialCalcVal = document.getElementById('commercialCalculatorType')?.value || '';
      const smsfCalcVal = document.getElementById('smsfCalculatorType')?.value || '';
      // If any meaningful selection exists, show the flip button
      if (loanCategoryVal || loanPurposeVal || commercialCalcVal || smsfCalcVal) {
        flipButton.style.display = '';
      } else {
        flipButton.style.display = 'none';
        // Ensure front is visible while hidden
        flipped = false;
        dashboardCard.classList.remove('flipped');
        flipButton.setAttribute('aria-pressed', 'false');
        flipButton.textContent = 'Flip panel';
      }
    }

    // Attach listeners to reveal the flip control when user makes selections
    ['loanCategory', 'loanPurpose', 'commercialCalculatorType', 'smsfCalculatorType', 'stateSelect'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', maybeShowFlipControls);
    });

    // Run once to set correct initial visibility
    maybeShowFlipControls();

    // Expose a small API so other code (submit handler) can force front/back
    window.dashboardFlip = {
      showFront: function() {
        flipped = false;
        dashboardCard.classList.remove('flipped');
        flipButton.setAttribute('aria-pressed', 'false');
        flipButton.textContent = 'Flip panel';
      },
      showBack: function() {
        flipped = true;
        dashboardCard.classList.add('flipped');
        flipButton.setAttribute('aria-pressed', 'true');
        flipButton.textContent = 'Show front';
      },
      isFlipped: function() { return flipped; }
    };

    flipButton.addEventListener('click', function () {
      dashboardCard.classList.add('flip-transition');
      flipped = !flipped;
      dashboardCard.classList.toggle('flipped', flipped);
      flipButton.setAttribute('aria-pressed', flipped ? 'true' : 'false');
      flipButton.textContent = flipped ? 'Show front' : 'Flip panel';
    });

    // Add dynamic loading for category-specific pages
    const loanCategorySelect = document.getElementById('loanCategory');
    if (loanCategorySelect) {
      // Function to load and initialize category page
      function loadCategoryPage(category, purpose) {
        let pageUrl;
        if (category === 'home') {
          // If a specific home purpose is selected, load its dedicated page
          if (purpose === 'home_borrowing') {
            pageUrl = 'pages/home-home-loans.html';
          } else if (purpose === 'home_repayment') {
            pageUrl = 'pages/home-repayment.html';
          } else if (purpose === 'home_refinance') {
            pageUrl = 'pages/home-refinancing.html';
          } else if (purpose === 'home_upgrade') {
            pageUrl = 'pages/home-upgrade.html';
          } else if (purpose === 'home_equity') {
            pageUrl = 'pages/home-equity.html';
          } else if (purpose === 'home_consolidate') {
            pageUrl = 'pages/home-consolidate.html';
          } else if (purpose === 'home_bridging') {
            pageUrl = 'pages/home-bridging.html';
          } else if (purpose === 'home_next_home') {
            pageUrl = 'pages/home-next-home.html';
          } else if (purpose === 'home_construction') {
            pageUrl = 'pages/home-construction.html';
          } else if (purpose === 'home_borrowing') {
            pageUrl = 'pages/home-home-loans.html';
          } else if (purpose === 'home_investment') {
            pageUrl = 'pages/home-investment-loans.html';
          } else if (purpose === 'home_self_employed') {
            pageUrl = 'pages/home-self-employed.html';
          } else if (purpose === 'home_custom_build') {
            pageUrl = 'pages/home-custom-build.html';
          } else if (purpose === 'home_reverse') {
            pageUrl = 'pages/home-reverse-mortgage.html';
          } else if (purpose === 'home_equity_release') {
            pageUrl = 'pages/home-equity-release.html';
          } else if (purpose === 'home_expat') {
            pageUrl = 'pages/home-expat.html';
          } else if (purpose === 'home_first_home') {
            pageUrl = 'pages/home-first-home-buyer.html';
          } else {
            // Use the canonical home overview that exists in /pages
            pageUrl = 'pages/home-home-loans.html';
          }
        } else if (category === 'commercial') {
          // Load purpose-specific commercial pages when available
          if (purpose === 'overdraft') {
            pageUrl = 'pages/commercial-pages/commercial-overdraft.html';
          } else if (purpose === 'commercial_repayment') {
            pageUrl = 'pages/commercial-pages/commercial-repayment.html';
          } else if (purpose === 'commercial_borrowing') {
            // fallback to repayment view for general commercial borrowing
            pageUrl = 'pages/commercial-pages/commercial-repayment.html';
          } else if (purpose === 'invoice_finance') {
            pageUrl = 'pages/commercial-pages/commercial-invoice-finance.html';
          } else if (purpose === 'equipment_asset') {
            pageUrl = 'pages/commercial-pages/commercial-equipment-finance.html';
          } else if (purpose === 'secured_business') {
            pageUrl = 'pages/commercial-pages/commercial-secured-business.html';
          } else if (purpose === 'unsecured_business') {
            pageUrl = 'pages/commercial-pages/commercial-unsecured-business.html';
          } else {
            // Use a sensible default page that exists in the repo
            pageUrl = 'pages/commercial-pages/commercial-repayment.html';
          }
        } else if (category === 'smsf') {
          // Load purpose-specific SMSF pages when available
          if (purpose === 'smsf_commercial') {
            pageUrl = 'pages/smsf-pages/smsf-commercial.html';
          } else if (purpose === 'smsf_residential') {
            pageUrl = 'pages/smsf-pages/smsf-residential.html';
          } else {
            // Use the residential SMSF page as the general entry point
            pageUrl = 'pages/smsf-pages/smsf-residential.html';
          }
        } else {
          pageUrl = 'pages/banks-info.html'; // default when empty
        }

        // Fetch and load the page with a fade transition (opacity-only)
        console.log('Attempting to load:', pageUrl);

        // Preserve current height to avoid layout collapse during content swap
        try {
          const h = backContainer.getBoundingClientRect().height;
          if (h && h > 20) backContainer.style.minHeight = h + 'px';
        } catch (e) {}

        // Start fade-out
        backContainer.classList.add('page-fade-out');

        // Try multiple candidate URLs (handles different directory contexts)
        const candidates = (window.location.pathname.indexOf('/main-pages/') !== -1)
          ? ['../' + pageUrl, pageUrl, '/' + pageUrl]
          : [pageUrl, '../' + pageUrl, '/' + pageUrl];

        console.log('Fetch candidates:', candidates);

        const DURATION = 300; // ms, keep in sync with CSS
        function tryFetchCandidate(i) {
          if (i >= candidates.length) {
            const err = new Error('All fetch attempts failed (404 or network error)');
            console.error('Error loading page:', err);
            setTimeout(() => {
              backContainer.innerHTML = '<div style="padding:20px;"><p>Error loading page: ' + err.message + '</p></div>';
              backContainer.classList.remove('page-fade-out');
              backContainer.classList.add('page-fade-in');
              setTimeout(() => {
                backContainer.classList.remove('page-fade-in');
                backContainer.style.minHeight = '';
              }, DURATION);
            }, DURATION);
            return;
          }

          const candidate = candidates[i];
          console.log('Attempting fetch candidate:', candidate);
          fetch(candidate)
            .then(response => {
              console.log('Response status for', candidate + ':', response.status, response.statusText);
              if (!response.ok) {
                // Try next candidate
                console.warn('Candidate failed, trying next:', candidate);
                tryFetchCandidate(i + 1);
                return null;
              }
              return response.text();
            })
            .then(html => {
              if (!html) return; // already handled via recursive try
              console.log('Successfully loaded and injecting HTML from', candidate);
              // Wait for fade-out to finish before swapping content
              setTimeout(() => {
                backContainer.innerHTML = html;
                // Re-initialize FAQ toggles for the newly loaded content
                initializeFAQsForContainer(backContainer);
                // Scroll to top when content changes
                backContainer.scrollTop = 0;

                // Start fade-in
                backContainer.classList.remove('page-fade-out');
                backContainer.classList.add('page-fade-in');

                // Cleanup after animation
                setTimeout(() => {
                  backContainer.classList.remove('page-fade-in');
                  backContainer.style.minHeight = '';
                }, DURATION);
              }, DURATION);
            })
            .catch(err => {
              console.warn('Fetch error for candidate', candidate, err);
              tryFetchCandidate(i + 1);
            });
        }

        // Start trying candidates
        tryFetchCandidate(0);
      }

      // Expose loader to global scope so other handlers can trigger back-page loads
      window.loadCategoryPage = loadCategoryPage;
      // Load initial page (banks-info by default)
      loadCategoryPage('');

      // Listen for category changes
      loanCategorySelect.addEventListener('change', function() {
        const currentPurpose = document.getElementById('loanPurpose')?.value || '';
        loadCategoryPage(this.value, currentPurpose);
      });

      // Also listen for purpose changes so we can show purpose-specific back pages
      const loanPurposeSelect = document.getElementById('loanPurpose');
      if (loanPurposeSelect) {
        loanPurposeSelect.addEventListener('change', function() {
          const currentCategory = document.getElementById('loanCategory')?.value || '';
          loadCategoryPage(currentCategory, this.value);
        });
      }
    }
  })();

  // Helper function to initialize FAQs in a container
  function initializeFAQsForContainer(container) {
    // Support both legacy `.faq` and namespaced `.cb-faq` structures
    const questions = container.querySelectorAll('.faq-question, .cb-faq-question');
      questions.forEach(q => {
        const faq = q.closest('.faq') || q.closest('.cb-faq-item');
        const answer = (faq && (faq.querySelector('.faq-answer') || faq.querySelector('.cb-faq-answer')));
      if (!answer) return;
      
      answer.style.boxSizing = 'border-box';

      function openFaq() {
        faq.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
        answer.style.display = 'block';
        const height = answer.scrollHeight + 'px';
        answer.style.maxHeight = '0px';
        answer.style.opacity = '0';
        answer.style.paddingTop = '0px';
        requestAnimationFrame(() => {
          answer.style.maxHeight = height;
          answer.style.opacity = '1';
          answer.style.paddingTop = '15px';
        });
        const onEnd = function(e) {
          if (e.propertyName === 'max-height') {
            answer.style.maxHeight = 'none';
            answer.removeEventListener('transitionend', onEnd);
          }
        };
        answer.addEventListener('transitionend', onEnd);
      }

      function closeFaq() {
        const cur = answer.scrollHeight + 'px';
        answer.style.maxHeight = cur;
        void answer.offsetHeight;
        requestAnimationFrame(() => {
          answer.style.maxHeight = '0px';
          answer.style.opacity = '0';
          answer.style.paddingTop = '0px';
        });
        faq.classList.remove('open');
        q.setAttribute('aria-expanded', 'false');
      }

      function toggle() {
        if (faq.classList.contains('open')) closeFaq();
        else openFaq();
      }

      // Remove any existing listeners first to avoid duplicates
      const newQ = q.cloneNode(true);
      q.parentNode.replaceChild(newQ, q);
      q = newQ;

      q.addEventListener('click', function(e) {
        document.querySelectorAll('.faq.open').forEach(openedFaq => {
          if (openedFaq !== faq) {
            const btn = openedFaq.querySelector('.faq-question');
            const a = openedFaq.querySelector('.faq-answer');
            openedFaq.classList.remove('open');
            if (btn) btn.setAttribute('aria-expanded', 'false');
            if (a) {
              a.style.maxHeight = '0px';
              a.style.opacity = '0';
              a.style.paddingTop = '0px';
            }
          }
        });
        toggle();
      });

      q.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  // Small helper to determine the proper back content URL for a category/purpose
  function getBackPageUrl(category, purpose) {
    if (category === 'home') {
      if (purpose === 'home_borrowing') return 'pages/home-home-loans.html';
      if (purpose === 'home_repayment') return 'pages/home-repayment.html';
      if (purpose === 'home_refinance') return 'pages/home-refinancing.html';
      if (purpose === 'home_upgrade') return 'pages/home-upgrade.html';
      if (purpose === 'home_equity') return 'pages/home-equity.html';
      if (purpose === 'home_consolidate') return 'pages/home-consolidate.html';
      if (purpose === 'home_bridging') return 'pages/home-bridging.html';
      if (purpose === 'home_next_home' || purpose === 'home_next_home') return 'pages/home-next-home.html';
      if (purpose === 'home_construction') return 'pages/home-construction.html';
      if (purpose === 'home_investment') return 'pages/home-investment-loans.html';
      if (purpose === 'home_self_employed') return 'pages/home-self-employed.html';
      if (purpose === 'home_custom_build') return 'pages/home-custom-build.html';
      if (purpose === 'home_reverse') return 'pages/home-reverse-mortgage.html';
      if (purpose === 'home_equity_release') return 'pages/home-equity-release.html';
      if (purpose === 'home_expat') return 'pages/home-expat.html';
      if (purpose === 'home_first_home') return 'pages/home-first-home-buyer.html';
      return 'pages/home-home-loans.html';
    }
    if (category === 'commercial') {
      if (purpose === 'overdraft') return 'pages/commercial-pages/commercial-overdraft.html';
      if (purpose === 'commercial_repayment') return 'pages/commercial-pages/commercial-repayment.html';
      if (purpose === 'invoice_finance') return 'pages/commercial-pages/commercial-invoice-finance.html';
      if (purpose === 'equipment_asset') return 'pages/commercial-pages/commercial-equipment-finance.html';
      if (purpose === 'secured_business') return 'pages/commercial-pages/commercial-secured-business.html';
      if (purpose === 'unsecured_business') return 'pages/commercial-pages/commercial-unsecured-business.html';
      return 'pages/commercial-pages/commercial-repayment.html';
    }
    if (category === 'smsf') {
      if (purpose === 'smsf_commercial') return 'pages/smsf-pages/smsf-commercial.html';
      if (purpose === 'smsf_residential') return 'pages/smsf-pages/smsf-residential.html';
      return 'pages/smsf-pages/smsf-residential.html';
    }
    return 'pages/banks-info.html';
  }

  // Quick modal calculator for use on non-loan main pages (About, Blog, FAQ, Contact)
  function createQuickCalculatorModal(category, friendly, translatedPurpose) {
    try {
      // Prevent multiple modals
      if (document.getElementById('qc-overlay')) return;

      const overlay = document.createElement('div');
      overlay.id = 'qc-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';

      const modal = document.createElement('div');
      modal.id = 'qc-modal';
      modal.style.cssText = 'width:100%;max-width:1100px;background:#fff;border-radius:8px;overflow:hidden;display:flex;flex-direction:row;box-shadow:0 20px 60px rgba(0,0,0,0.25);';

      modal.innerHTML = `
        <div style="width:38%;padding:24px;box-sizing:border-box;border-right:1px solid #eee;">
          <button id="qc-close" style="float:right;background:none;border:none;font-size:18px;">✕</button>
          <h3 style="margin-top:0;">Quick Calculator</h3>
          <div style="margin-top:12px;">
            <label style="display:block;margin-bottom:6px;">Select your state</label>
            <select id="qc-stateSelect" style="width:100%;padding:8px;box-sizing:border-box;">
              <option value="">Select Your State</option>
              <option value="NSW">New South Wales</option>
              <option value="VIC">Victoria</option>
              <option value="QLD">Queensland</option>
              <option value="WA">Western Australia</option>
              <option value="SA">South Australia</option>
              <option value="TAS">Tasmania</option>
              <option value="ACT">Australian Capital Territory</option>
              <option value="NT">Northern Territory</option>
            </select>
          </div>
          <div style="margin-top:12px;">
            <label style="display:block;margin-bottom:6px;">Loan Type</label>
            <select id="qc-loanCategory" style="width:100%;padding:8px;box-sizing:border-box;">
              <option value="">Loan Type</option>
              <option value="home">Home Loan</option>
              <option value="commercial">Commercial Loan</option>
              <option value="smsf">SMSF Loan</option>
            </select>
          </div>
          <div style="margin-top:12px;">
            <label style="display:block;margin-bottom:6px;">Loan Purpose</label>
            <select id="qc-loanPurpose" style="width:100%;padding:8px;box-sizing:border-box;"></select>
          </div>
          <div style="margin-top:18px;">
            <button id="qc-flip" style="padding:10px 14px;background:#0b1b33;color:#fff;border:none;border-radius:4px;">Flip to Back</button>
          </div>
        </div>
        <div style="width:62%;padding:16px;box-sizing:border-box;min-height:320px;position:relative;">
          <div id="qc-backContainer" style="height:100%;overflow:auto;">Loading content…</div>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Close handler
      document.getElementById('qc-close').addEventListener('click', () => { overlay.remove(); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

      // Prefill selects
      const qcLoanCategory = document.getElementById('qc-loanCategory');
      const qcLoanPurpose = document.getElementById('qc-loanPurpose');
      const qcState = document.getElementById('qc-stateSelect');

      if (qcLoanCategory) {
        qcLoanCategory.value = category;
      }

      // Set a single option for loanPurpose reflecting the selection (label uses friendly if possible)
      const label = (friendly && friendly.replace(/-/g,' ')) || translatedPurpose || '';
      qcLoanPurpose.innerHTML = `<option value="${translatedPurpose}">${label}</option>`;
      qcLoanPurpose.value = translatedPurpose;

      // Load the back page into modal
      const pageUrl = getBackPageUrl(category, translatedPurpose);
      const candidates = [pageUrl, '../' + pageUrl, '/' + pageUrl];
      const target = document.getElementById('qc-backContainer');

      function tryFetch(i) {
        if (i >= candidates.length) { target.innerHTML = '<p>Error loading content.</p>'; return; }
        fetch(candidates[i]).then(r => {
          if (!r.ok) { tryFetch(i+1); return; }
          return r.text();
        }).then(html => { if (html) target.innerHTML = html; }).catch(() => tryFetch(i+1));
      }
      tryFetch(0);

      // When state selected by user, if there is a pending front purpose, ensure front selects set
      qcState.addEventListener('change', function() {
        // no complex dynamic fields in modal; just ensure loanType/purpose are set
        qcLoanCategory.value = category;
        qcLoanPurpose.value = translatedPurpose;
      });

      // Flip just focuses the back content
      document.getElementById('qc-flip').addEventListener('click', function() {
        target.scrollTop = 0;
      });

      // expose reference for tests
      window.__quickCalcModalOpen = true;
    } catch (e) { console.warn('createQuickCalculatorModal failed', e); }
  }

  // Export quick modal factory so other scripts can call it
  window.createQuickCalculatorModal = createQuickCalculatorModal;

});

// Function to show validation error
function showValidationError(message) {
  const existingError = document.querySelector('.validation-error');
  if (existingError) existingError.remove();

  const errorElement = document.createElement('div');
  errorElement.className = 'validation-error';
  errorElement.style.cssText = `
    background: red;
    color: white;
    padding: 8px;
    margin: 15px 0;
    font-size: 14px;
  `;
  errorElement.innerHTML = `
    <strong>Please check your input:</strong> ${message}
  `;
  const dynamicFields = document.getElementById('dynamicFields');
  dynamicFields.parentNode.insertBefore(errorElement, dynamicFields.nextSibling);
  errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => { if (errorElement.parentNode) errorElement.remove() }, 5000);
}

// Function to validate form based on loan type
function validateForm(loanType) {
  const state = document.getElementById('stateSelect').value;
  if (!state) {
    showValidationError('Please select a state to proceed.');
    return false;
  }

  // NEW: Check if commercial calculator type is selected
  const loanCategory = document.getElementById('loanCategory').value;
  if (loanCategory === 'commercial') {
    const calculatorType = document.getElementById('commercialCalculatorType').value;
    if (!calculatorType) {
      showValidationError('Please select a calculator type for commercial loans.');
      return false;
    }
    // Financial calculators are supported; allow validation to continue and let mounted modules handle execution
  }

  // NEW: Check if SMSF calculator type is selected
  if (loanCategory === 'smsf') {
    const calculatorType = document.getElementById('smsfCalculatorType').value;
    if (!calculatorType) {
      showValidationError('Please select a calculator type for SMSF loans.');
      return false;
    }
  }

  if (loanType === "home_repayment") {
    const propertyValue = num(document.getElementById('propertyValue')?.value || 0);
    const loanAmount = num(document.getElementById('loanAmount')?.value || 0);
    const lvrPercentage = num(document.getElementById('lvrPercentage')?.value || 0);
    const calculatedLVR = propertyValue > 0 ? (loanAmount / propertyValue) * 100 : 0;
    if (lvrPercentage > 98 || calculatedLVR > 98) {
      showValidationError('LVR cannot exceed 98%. Please adjust your loan amount or deposit.');
      return false;
    }
    if (propertyValue <= 0) { showValidationError('Please enter a valid property value.'); return false; }
    if (loanAmount <= 0) { showValidationError('Please enter a valid loan amount.'); return false; }
  }

  if (loanType === "home_borrowing") {
    const grossIncome = num(document.getElementById('grossIncome')?.value || 0);
    if (grossIncome <= 0) {
      showValidationError('Please enter your gross income to calculate borrowing capacity.');
      return false;
    }
  }

  if (loanType === "home_refinance" || loanType === "home_upgrade" || loanType === "home_equity" || loanType === "home_consolidate") {
    const currentBalance = num(document.getElementById('currentBalance')?.value || 0);
    const propertyValue = num(document.getElementById('propertyValue')?.value || 0);
    if (currentBalance <= 0) { showValidationError('Please enter your current loan balance.'); return false; }
    if (propertyValue <= 0) { showValidationError('Please enter a valid property value.'); return false; }
  }

  if (loanType === "commercial_repayment" || loanType === "commercial_borrowing") {
    const propertyValue = num(document.getElementById('propertyValue')?.value || 0);
    if (propertyValue <= 0) { showValidationError('Please enter a valid property value.'); return false; }
  }

  if (loanType === "secured_business" || loanType === "unsecured_business") {
    const loanAmount = num(document.getElementById('loanAmount')?.value || 0);
    if (loanAmount <= 0) { showValidationError('Please enter a valid loan amount.'); return false; }
  }

  if (loanType === "overdraft") {
    const limit = num(document.getElementById('overdraftLimit')?.value || 0);
    if (limit <= 0) { showValidationError('Please enter a valid overdraft limit.'); return false; }
  }

  if (loanType === "equipment_asset") {
    const assetCost = num(document.getElementById('assetCost')?.value || 0);
    if (assetCost <= 0) { showValidationError('Please enter a valid asset cost.'); return false; }
  }

  if (loanType === "invoice_finance") {
    const invoiceValue = num(document.getElementById('invoiceValue')?.value || 0);
    if (invoiceValue <= 0) { showValidationError('Please enter a valid invoice value.'); return false; }
  }

  if (loanType.startsWith("smsf")) {
    const propertyValue = num(document.getElementById('propertyValue')?.value || 0);
    const rentAmount = num(document.getElementById('rentAmount')?.value || 0);
    if (propertyValue <= 0) { showValidationError('Please enter a valid property value.'); return false; }
    if (rentAmount <= 0) { showValidationError('Please enter a valid rent amount.'); return false; }
  }

  return true;
}

// NEW: Toggle repayment scenarios calculator
function toggleRepaymentScenarios() {
  const calculator = document.getElementById('repaymentScenariosCalculator');
  const button = document.querySelector('.repayment-scenarios-btn');
  
  if (calculator.classList.contains('open')) {
    calculator.classList.remove('open');
    button.classList.remove('open');
  } else {
    calculator.classList.add('open');
    button.classList.add('open');
    // Focus the input when opening
    setTimeout(() => {
      const extraRepaymentInput = document.getElementById('extraRepaymentAmount');
      if (extraRepaymentInput) extraRepaymentInput.focus();
    }, 300);
  }
}

// NEW: Calculate repayment scenarios with frequency
function calculateRepaymentScenarios() {
  const extraRepaymentAmount = num(document.getElementById('extraRepaymentAmount').value);
  const extraRepaymentFrequency = document.getElementById('extraRepaymentFrequency').value;
  const loanPurpose = document.getElementById('loanPurpose').value;
  
  if (extraRepaymentAmount <= 0) {
    // Clear results if no valid input
    document.getElementById('repaymentScenariosResults').innerHTML = '';
    return;
  }

  let resultsHTML = '';
  
  // Get the current loan details based on the loan purpose
  if (loanPurpose === "home_repayment") {
    const loanAmount = num(document.getElementById('loanAmount')?.value || 0);
    const interestRate = 5.99 / 100; // Using the same rate as main calculator
    const loanTerm = num(document.getElementById('loanTerm')?.value || 30);
    
    const scenarios = calculateExtraRepaymentScenarioWithFrequency(loanAmount, interestRate, loanTerm, extraRepaymentAmount, extraRepaymentFrequency);
    
    // Display text based on frequency
    let frequencyText = '';
    let extraRepaymentDisplay = '';
    switch (extraRepaymentFrequency) {
      case 'weekly':
        frequencyText = 'Weekly';
        extraRepaymentDisplay = `$${fmt(extraRepaymentAmount)} per week`;
        break;
      case 'fortnightly':
        frequencyText = 'Fortnightly';
        extraRepaymentDisplay = `$${fmt(extraRepaymentAmount)} per fortnight`;
        break;
      case 'monthly':
      default:
        frequencyText = 'Monthly';
        extraRepaymentDisplay = `$${fmt(extraRepaymentAmount)} per month`;
        break;
    }
    
    resultsHTML = `
      <div class="repayment-results">
        <div class="repayment-result-card">
          <h4>With Extra ${frequencyText} Repayment</h4>
          <div class="repayment-result-item">
            <span>Extra Repayment</span>
            <span class="repayment-result-value">${extraRepaymentDisplay}</span>
          </div>
          <div class="repayment-result-item">
            <span>Total Interest Charged</span>
            <span class="repayment-result-value repayment-savings">$${fmt(scenarios.withExtra.totalInterest)}</span>
          </div>
          <div class="repayment-result-item">
            <span>Loan Term</span>
            <span class="repayment-result-value repayment-savings">${scenarios.withExtra.termYears} years</span>
          </div>
          <div class="repayment-result-item">
            <span>Interest Saved</span>
            <span class="repayment-result-value repayment-savings">$${fmt(scenarios.interestSaved)}</span>
          </div>
          <div class="repayment-result-item">
            <span>Time Saved</span>
            <span class="repayment-result-value repayment-savings">${scenarios.timeSaved} years</span>
          </div>
        </div>
        
        <div class="repayment-result-card">
          <h4>Current Repayment</h4>
          <div class="repayment-result-item">
            <span>Total Interest Charged</span>
            <span class="repayment-result-value">$${fmt(scenarios.withoutExtra.totalInterest)}</span>
          </div>
          <div class="repayment-result-item">
            <span>Loan Term</span>
            <span class="repayment-result-value">${scenarios.withoutExtra.termYears} years</span>
          </div>
          <div class="repayment-result-item">
            <span>Monthly Repayment</span>
            <span class="repayment-result-value">$${fmt(scenarios.monthlyRepayment)}</span>
          </div>
        </div>
      </div>
      <div class="repayment-note">
        <strong>Note:</strong> This calculation assumes you make the same extra repayment amount every ${extraRepaymentFrequency} for the life of the loan. Actual results may vary based on your specific loan terms and conditions.
      </div>
    `;
  } else if (loanPurpose === "home_refinance" || loanPurpose === "home_upgrade" || loanPurpose === "home_equity" || loanPurpose === "home_consolidate") {
    const currentBalance = num(document.getElementById('currentBalance')?.value || 0);
    const interestRate = 5.99 / 100; // Using the same rate as main calculator
    const loanTerm = num(document.getElementById('loanTerm')?.value || 30);
    
    const scenarios = calculateExtraRepaymentScenarioWithFrequency(currentBalance, interestRate, loanTerm, extraRepaymentAmount, extraRepaymentFrequency);
    
    // Display text based on frequency
    let frequencyText = '';
    let extraRepaymentDisplay = '';
    switch (extraRepaymentFrequency) {
      case 'weekly':
        frequencyText = 'Weekly';
        extraRepaymentDisplay = `$${fmt(extraRepaymentAmount)} per week`;
        break;
      case 'fortnightly':
        frequencyText = 'Fortnightly';
        extraRepaymentDisplay = `$${fmt(extraRepaymentAmount)} per fortnight`;
        break;
      case 'monthly':
      default:
        frequencyText = 'Monthly';
        extraRepaymentDisplay = `$${fmt(extraRepaymentAmount)} per month`;
        break;
    }
    
    resultsHTML = `
      <div class="repayment-results">
        <div class="repayment-result-card">
          <h4>With Extra ${frequencyText} Repayment</h4>
          <div class="repayment-result-item">
            <span>Extra Repayment</span>
            <span class="repayment-result-value">${extraRepaymentDisplay}</span>
          </div>
          <div class="repayment-result-item">
            <span>Total Interest Charged</span>
            <span class="repayment-result-value repayment-savings">$${fmt(scenarios.withExtra.totalInterest)}</span>
          </div>
          <div class="repayment-result-item">
            <span>Loan Term</span>
            <span class="repayment-result-value repayment-savings">${scenarios.withExtra.termYears} years</span>
          </div>
          <div class="repayment-result-item">
            <span>Interest Saved</span>
            <span class="repayment-result-value repayment-savings">$${fmt(scenarios.interestSaved)}</span>
          </div>
          <div class="repayment-result-item">
            <span>Time Saved</span>
            <span class="repayment-result-value repayment-savings">${scenarios.timeSaved} years</span>
          </div>
        </div>
        
        <div class="repayment-result-card">
          <h4>Current Repayment</h4>
          <div class="repayment-result-item">
            <span>Total Interest Charged</span>
            <span class="repayment-result-value">$${fmt(scenarios.withoutExtra.totalInterest)}</span>
          </div>
          <div class="repayment-result-item">
            <span>Loan Term</span>
            <span class="repayment-result-value">${scenarios.withoutExtra.termYears} years</span>
          </div>
          <div class="repayment-result-item">
            <span>Monthly Repayment</span>
            <span class="repayment-result-value">$${fmt(scenarios.monthlyRepayment)}</span>
          </div>
        </div>
      </div>
      <div class="repayment-note">
        <strong>Note:</strong> This calculation assumes you make the same extra repayment amount every ${extraRepaymentFrequency} for the life of the loan. Actual results may vary based on your specific loan terms and conditions.
      </div>
    `;
  }
  
  var _rsElem = document.getElementById('repaymentScenariosResults');
  if (_rsElem) {
    _rsElem.innerHTML = resultsHTML;
  }
}

// Submit and calculate - UPDATED with Commercial Calculator Type validation & Home Extras delegation
var _loanFormEl = document.getElementById('loanForm');
if (_loanFormEl) {
  _loanFormEl.addEventListener('submit', async function (e) {
  e.preventDefault();
  
  // If this is an auto-recalc (not manual), don't proceed without manual calculation first
  if (window.isAutoRecalc && !window.hasCalculated) {
    return;
  }

  // Ensure the dashboard shows the front (results) when user explicitly submits
  try {
    if (window.dashboardFlip && typeof window.dashboardFlip.showFront === 'function') {
      window.dashboardFlip.showFront();
    }
  } catch (e) {}
  
  // Allow commercial/SMSF financial calculator submissions; mounted modules will intercept and handle them
  const loanCategory = document.getElementById('loanCategory').value;
  
  const loanPurpose = document.getElementById('loanPurpose').value;
  if (!loanPurpose) {
    showValidationError('Please select a loan purpose to proceed.');
    return;
  }

  const existingError = document.querySelector('.validation-error');
  if (existingError) existingError.remove();

  // EARLY DELEGATION: New Home Extras submit handling
  const extraHomePurposes = new Set([
    'home_bridging',
    'home_next_home',
    'home_investment',
    'home_equity_release',
    'home_construction'
  ]);

  if (extraHomePurposes.has(loanPurpose)) {
    // Ensure the extras module is loaded, then delegate the submission
    try {
      await ensureHomeExtrasLoaded();
      // Run module handler; it writes results, details, disclaimer, CTA, step4
      if (window.homeExtras && typeof window.homeExtras.handleSubmit === 'function') {
        const ok = window.homeExtras.handleSubmit(loanPurpose);

        // Mark as calculated if this wasn't auto-recalc
        if (!window.isAutoRecalc) window.hasCalculated = true;

        // Refresh summary and disclaimer
        updateSummary();
        document.getElementById('disclaimer').innerText = getDisclaimer(loanPurpose);
      } else {
        showValidationError('Home calculator module not available. Please try again.');
      }
    } catch (err) {
      console.error(err);
      showValidationError('Failed to load the home calculators. Please refresh and try again.');
    }
    // IMPORTANT: Stop further processing to avoid duplicate rendering
    return;
  }

  if (!validateForm(loanPurpose)) return;

  const state = document.getElementById('stateSelect').value;
  let resultsHTML = '';

  // NEW: Show repayment scenarios section for home loans (except borrowing capacity)
  const isHomeLoan = loanPurpose.startsWith('home_') && loanPurpose !== 'home_borrowing';
  let hasLVRExceeded = false;

  if (loanPurpose === "home_borrowing") {
    const grossIncome = document.getElementById('grossIncome')?.value || "0";
    const otherIncome = document.getElementById('otherIncome')?.value || "0";
    const livingExpenses = document.getElementById('livingExpenses')?.value || "0";
    const homeLoanReps = document.getElementById('homeLoanReps')?.value || "0";
    const otherLoanReps = document.getElementById('otherLoanReps')?.value || "0";
    const cardLimits = document.getElementById('cardLimits')?.value || "0";
    const otherCommitments = document.getElementById('otherCommitments')?.value || "0";
    const employmentType = document.getElementById('employmentType')?.value || "payg";

    const res = calcHomeBorrowingCapacity({
      grossIncome: grossIncome,
      otherIncome: otherIncome,
      livingExpenses: livingExpenses,
      homeLoanReps: homeLoanReps,
      otherLoanReps: otherLoanReps,
      cardLimits: cardLimits,
      otherCommitments: otherCommitments,
      employmentType: employmentType
    });

    // NEW: Heading outside the black box
    resultsHTML += `<div class="dash-col-header">YOUR ESTIMATED BORROWING POWER</div>`;
    resultsHTML += `<div class="dash-col-content">`;
    if (res.capacity > 0) {
      resultsHTML += `<div class="big" style="font-size: 24px; margin: 10px 0; color: var(--accent);">$${fmt(res.capacity)}</div>`;
    } else {
      resultsHTML += `<div class="big" style="font-size: 24px; margin: 10px 0; color: var(--danger);">$${fmt(res.capacity)}</div>`;
      resultsHTML += `<p style="color: var(--muted); font-size: 12px; margin-top: 10px;">Your expenses may be higher than your income. Try adjusting your inputs.</p>`;
    }
    resultsHTML += addBorrowingCapacityDisclaimer();
    resultsHTML += `</div>`;

    renderDetails('home_borrowing', { 
      grossIncome: num(grossIncome),
      otherIncome: num(otherIncome),
      livingExpenses: num(livingExpenses),
      monthlyCommitments: res.monthlyCommitments,
      assessmentRatePct: (res.assessmentRate * 100).toFixed(2),
      termYears: res.termYears 
    });

    window.updateLastCalc({ loanPurpose });
  }

  else if (loanPurpose === "home_repayment") {
    const propertyValue = num(document.getElementById('propertyValue')?.value || 0);
    const loanAmount = num(document.getElementById('loanAmount')?.value || 0);
    const lvrPercentage = num(document.getElementById('lvrPercentage')?.value || 0);
    const calculatedLVR = propertyValue > 0 ? (loanAmount / propertyValue) * 100 : 0;
    if (lvrPercentage > 98 || calculatedLVR > 98) {
      showValidationError('LVR cannot exceed 98%. Please adjust your loan amount or deposit.');
      return;
    }

    const ctx = {
      loanAmount: loanAmount,
      loanTerm: num(document.getElementById('loanTerm')?.value || 0),
      interestRatePct: (num(document.getElementById('interestRate')?.value || 0)).toFixed(2),
      interestRate: num(document.getElementById('interestRate')?.value || 0) / 100,
      propertyValue: propertyValue,
      depositAmount: num(document.getElementById('depositAmount')?.value || 0),
      firstHomeBuyer: document.getElementById('firstHomeBuyer')?.value === "yes",
      propertyType: document.getElementById('propertyType')?.value || 'established',
      propertyUse: document.getElementById('propertyUse')?.value || '',
      state: state
    };

    const res = calcHomePurchaseWithLMI(ctx);

    if (res.error === "MAX_LVR_EXCEEDED") {
      resultsHTML += maxLVRErrorMessage;
      hasLVRExceeded = true;
      window.updateLastCalc({ loanPurpose });
    } else {
      // NEW: Heading outside the black box
      resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
      resultsHTML += `<div class="dash-col-content">`;
      resultsHTML += `
        <div style="margin-bottom: 20px;">
          <h3>Estimated Repayment Amount (P&I)</h3>
          <div class="big">$${fmt(res.monthlyRepayment)} per Month</div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3>Effective Loan to Value ratio (LVR)</h3>
          <div class="big">${res.effectiveLVR}%</div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3>Total Cost of the Purchase</h3>
          <div class="big">$${fmt(res.totalPropertyCost)}</div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3>Cash Required for Settlement<br>
          (including your deposit amount)
          </h3>
          <div class="big">$${fmt(res.cashRequired)}</div>
        </div>
      `;

      // Cost breakdown like in screenshot
      resultsHTML += `
        <div class="cost-breakdown" style="margin-top: 15px; padding: 12px; background: #0b0d12; border-radius: 8px; font-size: 12px;">
          <div style="color: var(--muted); margin-bottom: 8px;">Cost Breakdown Estimates:</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Property Value:</span>
            <span>$${fmt(ctx.propertyValue)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Stamp Duty:</span>
            <span>$${fmt(res.stampDuty)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Government Charges:</span>
            <span>$${fmt(res.govtCharges)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Conveyancer Fees:</span>
            <span>$${fmt(res.conveyancerFees)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--line);">
            <span><strong>Total Cost:</strong></span>
            <span><strong>$${fmt(res.totalPropertyCost)}</strong></span>
          </div>
        </div>
      `;
      resultsHTML += `</div>`;

      // Ensure 2-decimal precision for LVRs in details panel
      const resForDetails = {
        ...res,
        baseLVR: Number(res.baseLVR).toFixed(2),
        effectiveLVR: Number(res.effectiveLVR).toFixed(2)
      };

      renderDetails('home_repayment', { ...ctx, ...resForDetails });
      window.updateLastCalc({ loanPurpose, baseLVR: res.baseLVR, loanAmount: ctx.loanAmount, interestRate: ctx.interestRate, loanTerm: ctx.loanTerm });
    }
  }

  else if (loanPurpose === "home_refinance") {
    const ctx = {
      currentBalance: num(document.getElementById('currentBalance')?.value || 0),
      loanTerm: num(document.getElementById('loanTerm')?.value || 0),
      interestRatePct: "5.99",
      interestRate: 5.99 / 100,
      propertyValue: num(document.getElementById('propertyValue')?.value || 0),
      currentRatePct: (num(document.getElementById('currentRate')?.value || 0)).toFixed(2),
      currentRate: num(document.getElementById('currentRate')?.value || 0) / 100,
      currentYears: num(document.getElementById('currentYears')?.value || 0)
    };

    const res = calcRefinanceSavings(
      ctx.currentBalance, 
      ctx.currentRate, 
      ctx.currentYears, 
      ctx.interestRate, 
      ctx.loanTerm,
      ctx.propertyValue
    );

    if (res.error === "MAX_LVR_EXCEEDED") {
      resultsHTML += maxLVRErrorMessage;
      hasLVRExceeded = true;
      window.updateLastCalc({ loanPurpose });
    } else {
      const lvr = calcLVR(ctx.currentBalance, ctx.propertyValue);
      // NEW: Heading outside the black box
      resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
      resultsHTML += `<div class="dash-col-content">`;
      resultsHTML += `<h3>Old Repayment Amount</h3><div class="big">$${fmt(res.oldMonthly)}</div>`;
      resultsHTML += `<h3>New Repayment Amount</h3><div class="big">$${fmt(res.newMonthly)}</div>`;
      resultsHTML += `<h3>Monthly Saving</h3><div class="big ${res.monthlySavings > 0 ? 'green' : 'red'}">$${fmt(res.monthlySavings)}</div>`;
      resultsHTML += `<h3>Annual Saving</h3><div class="big ${res.annualSavings > 0 ? 'green' : 'red'}">$${fmt(res.annualSavings)}</div>`;
      resultsHTML += `<h3>Total Interest Saved</h3><div class="big ${res.totalInterestSaved > 0 ? 'green' : 'red'}">$${fmt(res.totalInterestSaved)}</div>`;
      if (res.lmiPremium > 0) {
        resultsHTML += `<h3>Lenders Mortgage Insurance (LMI)</h3><div class="big">~$${fmt(res.lmiPremium)}</div>`;
        resultsHTML += `<h3>Total Refinance Loan Amount</h3><div class="big">$${fmt(res.totalLoanAmount)}</div>`;
        resultsHTML += `<h3>Effective LVR</h3><div class="big">${res.effectiveLVR}%</div>`;
      } else {
        resultsHTML += `<h3>LVR</h3><div class="big">${Math.round(res.baseLVR)}%</div>`;
      }
      resultsHTML += `<h3>Refinance Rate</h3><div class="big">${ctx.interestRatePct}%</div>`;
      resultsHTML += `</div>`;

      // Ensure 2-decimal precision for LVRs in details panel
      const resForDetails = {
        ...res,
        baseLVR: Number(res.baseLVR).toFixed(2),
        effectiveLVR: Number(res.effectiveLVR).toFixed(2)
      };

      renderDetails('home_refinance', { ...ctx, lvr, ...resForDetails });
      window.updateLastCalc({ loanPurpose, baseLVR: res.baseLVR, loanAmount: ctx.currentBalance, interestRate: ctx.interestRate, loanTerm: ctx.loanTerm });
    }
  }

  else if (loanPurpose === "home_upgrade") {
  const ctx = {
    currentBalance: num(document.getElementById('currentBalance')?.value || 0),
    loanAmount: num(document.getElementById('loanAmount')?.value || 0), // NOW: User-entered loan amount
    loanTerm: num(document.getElementById('loanTerm')?.value || 0),
    interestRatePct: (num(document.getElementById('interestRate')?.value || 0)).toFixed(2),
    interestRate: num(document.getElementById('interestRate')?.value || 0) / 100,
    propertyValue: num(document.getElementById('propertyValue')?.value || 0),
    currentRatePct: (num(document.getElementById('currentRate')?.value || 0)).toFixed(2),
    currentRate: num(document.getElementById('currentRate')?.value || 0) / 100
  };

  const res = calcHomeUpgrade(ctx);

  if (res.error === "MAX_LVR_EXCEEDED") {
    resultsHTML += maxLVRErrorMessage;
    hasLVRExceeded = true;
    window.updateLastCalc({ loanPurpose });
  } else {
    // NEW: Heading outside the black box
    resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
    resultsHTML += `<div class="dash-col-content">`;
    // Per spec: Main result is Estimated Funds Available to the Client based on the maximum loan at 95% effective LVR
    resultsHTML += `
      <div style="margin-bottom: 20px;">
        <h3>Estimated Funds Available to the Client</h3>
        <div class="big green">$${fmt(res.fundsAvailableMax)}</div>
      </div>
      <div style="margin-bottom: 20px;">
        <h3>Loan Amount Requested</h3>
        <div class="big">$${fmt(res.requestedBaseLoanAmount)}</div>
      </div>
    `;
    
    if (res.lmiPremium > 0) {
      resultsHTML += `
        <div style="margin-bottom: 20px;">
          <h3>Estimated Lenders Mortgage Insurance (LMI)</h3>
          <div class="big">~$${fmt(res.lmiPremium)}</div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3>Capitalised Loan Amount</h3>
          <div class="big">$${fmt(res.totalLoanAmount)}</div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3>Effective LVR</h3>
          <div class="big">${res.effectiveLVR}%</div>
        </div>
      `;
    }
    
    resultsHTML += `
      <div style="margin-bottom: 20px;">
        <h3>New Monthly Repayment (Estimate)</h3>
        <div class="big green">$${fmt(res.monthlyRepayment)}</div>
      </div>
    `;
    resultsHTML += `</div>`;
    
    // Ensure 2-decimal precision for LVRs in details panel
    const resForDetails = {
      ...res,
      baseLVR: Number(res.baseLVR).toFixed(2),
      effectiveLVR: Number(res.effectiveLVR).toFixed(2)
    };

    renderDetails('home_upgrade', { ...ctx, ...resForDetails });
    window.updateLastCalc({ loanPurpose, baseLVR: res.baseLVR, loanAmount: res.baseLoanAmount, interestRate: ctx.interestRate, loanTerm: ctx.loanTerm });
  }
}

  else if (loanPurpose === "home_equity") {
    const equityAmount = num(document.getElementById('equityAmount')?.value || 0);
    const ctx = {
      currentBalance: num(document.getElementById('currentBalance')?.value || 0),
      equityAmount: equityAmount,
      loanTerm: num(document.getElementById('loanTerm')?.value || 0),
      interestRatePct: (num(document.getElementById('interestRate')?.value || 0)).toFixed(2),
      interestRate: num(document.getElementById('interestRate')?.value || 0) / 100,
      propertyValue: num(document.getElementById('propertyValue')?.value || 0),
      currentRatePct: (num(document.getElementById('currentRate')?.value || 0)).toFixed(2),
      currentRate: num(document.getElementById('currentRate')?.value || 0) / 100
    };

    const res = calcHomeEquityAccess(ctx);

    if (res.error === "MAX_LVR_EXCEEDED") {
      resultsHTML += maxLVRErrorMessage;
      hasLVRExceeded = true;
      window.updateLastCalc({ loanPurpose });
    } else {
      // NEW: Heading outside the black box AND layout per spec
      resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
      resultsHTML += `<div class="dash-col-content">`;
      resultsHTML += `
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
        resultsHTML += `
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
      resultsHTML += `
        <div style="margin-bottom: 20px;">
          <h3>Effective LVR</h3>
          <div class="big">${Number(res.effectiveLVR).toFixed(2)}%</div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3>New Monthly Repayment (Estimate)</h3>
          <div class="big" style="color: orange;">$${fmt(res.monthlyRepayment)}</div>
        </div>
      `;
      resultsHTML += `</div>`;

      // Ensure 2-decimal precision for LVRs in details panel
      const resForDetails = {
        ...res,
        baseLVR: Number(res.baseLVR).toFixed(2),
        effectiveLVR: Number(res.effectiveLVR).toFixed(2)
      };

      // Expose selected purpose label for dynamic summary (if UI consumes it)
      const purposeValue = document.getElementById('equityPrimaryPurpose')?.value || 'other';
      const purposeLabelMap = {
        home_renovation: 'Home Renovation',
        investment: 'Investment',
        debt_consolidation: 'Debt Consolidation',
        other: 'Other'
      };
      const equityPurposeLabel = purposeLabelMap[purposeValue] || 'Other';

      renderDetails('home_equity', { ...ctx, ...resForDetails });
      window.updateLastCalc({ 
        loanPurpose, 
        baseLVR: res.baseLVR, 
        loanAmount: res.baseLoanAmount, 
        interestRate: ctx.interestRate, 
        loanTerm: ctx.loanTerm,
        equityPurposeLabel
      });
    }
  }

  else if (loanPurpose === "home_consolidate") {
    const ctx = {
      currentBalance: num(document.getElementById('currentBalance')?.value || 0),
      loanTerm: num(document.getElementById('loanTerm')?.value || 0),
      interestRatePct: "5.99",
      interestRate: 5.99 / 100,
      propertyValue: num(document.getElementById('propertyValue')?.value || 0),
      currentRatePct: (num(document.getElementById('currentRate')?.value || 0)).toFixed(2),
      currentRate: num(document.getElementById('currentRate')?.value || 0) / 100
    };

    // NEW: Collect dynamic debts from UI (expandable list)
    const debts = [];
    const rows = document.querySelectorAll('#debtsList .debt-row');
    rows.forEach(row => {
      const typeSel = row.querySelector('.debt-type');
      const balEl = row.querySelector('.debt-balance');
      const rateEl = row.querySelector('.debt-rate');
      const monEl = row.querySelector('.debt-monthly');
      const type = typeSel ? typeSel.value : 'other';
      const balance = balEl ? num(balEl.value || 0) : 0;
      const ratePct = rateEl ? parseFloat(rateEl.value || '0') : 0;
      const monthly = monEl ? num(monEl.value || 0) : 0;
      if (balance > 0) {
        debts.push({
          type,
          balance,
          rate: (ratePct || 0) / 100,
          monthly
        });
      }
    });
    ctx.debts = debts;
    ctx.debtsCount = debts.length;

    const res = calcDebtConsolidation(ctx);

    if (res.error === "MAX_LVR_EXCEEDED") {
      resultsHTML += maxLVRErrorMessage;
      hasLVRExceeded = true;
      window.updateLastCalc({ loanPurpose });
    } else {
      // NEW: Heading outside the black box
      resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
      resultsHTML += `<div class="dash-col-content">`;
      resultsHTML += `
        <div style="margin-bottom: 20px;">
          <h3>New Combined Monthly Repayment</h3>
          <div class="big">$${fmt(res.monthlyRepayment)} per Month</div>
        </div>
        <div style="display:flex; gap:24px; flex-wrap:wrap; margin-bottom: 20px;">
          <div>
            <h3>Total of Existing Debts</h3>
            <div class="big">$${fmt(res.totalExistingDebts)}</div>
          </div>
          <div>
            <h3>New Consolidation Loan Amount</h3>
            <div class="big">$${fmt(res.newConsolidationLoanAmount)}</div>
          </div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3>Potential Monthly Savings</h3>
          <div class="big ${res.monthlySavings > 0 ? 'green' : 'red'}">$${fmt(res.monthlySavings)}</div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3>Effective Loan to Value ratio (LVR)</h3>
          <div class="big">${res.effectiveLVR}%</div>
        </div>
      `;

      if (res.lmiPremium > 0) {
        resultsHTML += `
          <div style="margin-bottom: 20px;">
            <h3>Lenders Mortgage Insurance (LMI)</h3>
            <div class="big">~$${fmt(res.lmiPremium)}</div>
          </div>
          <div style="margin-bottom: 20px;">
            <h3>Total Consolidated Loan Amount</h3>
            <div class="big">$${fmt(res.totalLoanAmount)}</div>
          </div>
        `;
      }
      resultsHTML += `</div>`;

      // Ensure 2-decimal precision for LVRs in details panel
      const resForDetails = {
        ...res,
        baseLVR: Number(res.baseLVR).toFixed(2),
        effectiveLVR: Number(res.effectiveLVR).toFixed(2)
      };

      renderDetails('home_consolidate', { ...ctx, ...resForDetails });
      window.updateLastCalc({ loanPurpose, baseLVR: res.baseLVR, loanAmount: res.baseLoanAmount, interestRate: ctx.interestRate, loanTerm: ctx.loanTerm });
    }
  }

  else if (loanPurpose === "commercial_repayment") {
    const ctx = {
      propertyValue: num(document.getElementById('propertyValue')?.value || 0),
      loanAmount: num(document.getElementById('loanAmount')?.value || 0),
      interestRatePct: (num(document.getElementById('interestRate')?.value || 0)).toFixed(2),
      interestRate: num(document.getElementById('interestRate')?.value || 0) / 100,
      loanTerm: num(document.getElementById('loanTerm')?.value || 0),
      repaymentType: document.getElementById('repaymentType')?.value || "pni",
      annualRent: num(document.getElementById('annualRent')?.value || 0),
      annualExpenses: num(document.getElementById('annualExpenses')?.value || 0)
    };

    ctx.monthlyRepayment = (ctx.repaymentType === "io")
      ? calcInterestOnly(ctx.loanAmount, ctx.interestRate)
      : calcMonthlyRepayment(ctx.loanAmount, ctx.interestRate, ctx.loanTerm);
    ctx.lvr = calcLVR(ctx.loanAmount, ctx.propertyValue);

    // NEW: Heading outside the black box
    resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
    resultsHTML += `<div class="dash-col-content">`;
    resultsHTML += `<h3>Monthly Repayment</h3><div class="big">$${fmt(ctx.monthlyRepayment)}</div>`;
    resultsHTML += `<h3>LVR</h3><div class="big">${Math.round(ctx.lvr)}%</div>`;
    resultsHTML += `</div>`;
    renderDetails('commercial_repayment', ctx);
    window.updateLastCalc({ loanPurpose });
  }

  else if (loanPurpose === "commercial_borrowing") {
    const ctx = {
      propertyValue: num(document.getElementById('propertyValue')?.value || 0),
      annualRent: num(document.getElementById('annualRent')?.value || 0),
      annualExpenses: num(document.getElementById('annualExpenses')?.value || 0)
    };

    const res = calcCommercialBorrowingCapacity(ctx);
    // NEW: Heading outside the black box
    resultsHTML += `<div class="dash-col-header">ESTIMATED COMMERCIAL BORROWING CAPACITY</div>`;
    resultsHTML += `<div class="dash-col-content">`;
    resultsHTML += res.capacity > 0
      ? `<div class="big" style="font-size: 24px; margin: 10px 0; color: var(--accent);">$${fmt(res.capacity)}</div>`
      : `<div class="big" style="font-size: 24px; margin: 10px 0; color: var(--danger);">$${fmt(res.capacity)}</div>`;
    resultsHTML += addBorrowingCapacityDisclaimer();
    resultsHTML += `</div>`;

    renderDetails('commercial_borrowing', { 
      ...ctx, 
      noi: res.noi,
      dscr: res.dscr 
    });
    window.updateLastCalc({ loanPurpose });
  }

  else if (loanPurpose === "secured_business") {
    const loanAmount = num(document.getElementById('loanAmount')?.value || 0);
    const loanTerm = num(document.getElementById('loanTerm')?.value || 0);
    const interestRate = num(document.getElementById('interestRate')?.value || 0) / 100;
    const interestRatePct = (num(document.getElementById('interestRate')?.value || 0)).toFixed(2);
    const repaymentType = document.getElementById('repaymentType')?.value || "pni";
    const assetType = document.getElementById('assetType')?.value || "";
    const assetValue = num(document.getElementById('assetValue')?.value || 0);

    let repayment = 0;
    if (repaymentType === "io") {
      repayment = loanAmount * (interestRate / 12);
    } else {
      const r = interestRate / 12;
      const n = loanTerm * 12;
      repayment = interestRate === 0 ? (loanAmount / n) : (loanAmount * r / (1 - Math.pow(1 + r, -n)));
    }

    // NEW: Heading outside the black box
    resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
    resultsHTML += `<div class="dash-col-content">`;
    resultsHTML += `<h3>Monthly Repayment</h3><div class="big">$${fmt(repayment)}</div>`;
    resultsHTML += `</div>`;
    renderDetails('secured_business', {
      loanAmount,
      loanTerm,
      interestRatePct,
      repaymentType,
      assetType,
      assetValue
    });
    window.updateLastCalc({ loanPurpose });
  }

  else if (loanPurpose === "unsecured_business") {
    const loanAmount = num(document.getElementById('loanAmount')?.value || 0);
    const loanTerm = num(document.getElementById('loanTerm')?.value || 0);
    const interestRate = num(document.getElementById('interestRate')?.value || 0) / 100;
    const frequency = document.getElementById('repaymentFrequency')?.value || "monthly";
    const monthly = calcMonthlyRepayment(loanAmount, interestRate, loanTerm);
    let pay = monthly, label = "Monthly";
    if (frequency === "weekly") { pay = monthly * 12 / 52; label = "Weekly"; }
    if (frequency === "fortnightly") { pay = monthly * 12 / 26; label = "Fortnightly"; }
    // NEW: Heading outside the black box
    resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
    resultsHTML += `<div class="dash-col-content">`;
    resultsHTML += `<h3>${label} Repayment</h3><div class="big">$${fmt(pay)}</div>`;
    resultsHTML += `</div>`;
    document.getElementById('details').innerHTML = '';
    window.updateLastCalc({ loanPurpose });
  }

  else if (loanPurpose === "overdraft") {
    const limit = num(document.getElementById('overdraftLimit')?.value || 0);
    const used = num(document.getElementById('amountUsed')?.value || 0);
    const interestRate = num(document.getElementById('interestRate')?.value || 0) / 100;
    const interestRatePct = (num(document.getElementById('interestRate')?.value || 0)).toFixed(2);
    const calcType = document.getElementById('interestCalc')?.value || "monthly";
    const interest = calcType === "monthly" ? (used * interestRate / 12) : (used * interestRate);
    // NEW: Heading outside the black box
    resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
    resultsHTML += `<div class="dash-col-content">`;
    resultsHTML += `<h3>Interest ${calcType === "monthly" ? 'This Month' : 'Per Year'}</h3><div class="big">$${fmt(interest)}</div>`;
    resultsHTML += `</div>`;
    renderDetails('overdraft', { limit, used, interestRatePct });
    window.updateLastCalc({ loanPurpose });
  }

  else if (loanPurpose === "equipment_asset") {
    const assetCost = num(document.getElementById('assetCost')?.value || 0);
    const financeTerm = num(document.getElementById('financeTerm')?.value || 0);
    const interestRate = num(document.getElementById('interestRate')?.value || 0) / 100;
    const interestRatePct = (num(document.getElementById('interestRate')?.value || 0)).toFixed(2);
    const balloonPct = num(document.getElementById('balloonPct')?.value || 0);
    const repayment = calcBalloonRepayment(assetCost, interestRate, financeTerm, balloonPct);
    const balloonAmount = assetCost * (balloonPct / 100);

    // NEW: Heading outside the black box
    resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
    resultsHTML += `<div class="dash-col-content">`;
    resultsHTML += `<h3>Monthly Repayment (with ${balloonPct}% balloon)</h3><div class="big">$${fmt(repayment)}</div>`;
    resultsHTML += `<h3>Balloon Amount</h3><div class="big">$${fmt(balloonAmount)}</div>`;
    resultsHTML += `</div>`;

    renderDetails('equipment_asset', {
      assetCost,
      financeTerm,
      interestRatePct,
      balloonPct,
      balloonAmount
    });
    window.updateLastCalc({ loanPurpose });
  }

  else if (loanPurpose === "invoice_finance") {
    const invoiceValue = num(document.getElementById('invoiceValue')?.value || 0);
    const advanceRate = num(document.getElementById('advanceRate')?.value || 0) / 100;
    const discountFee = num(document.getElementById('discountFee')?.value || 0) / 100;
    const advance = invoiceValue * advanceRate;
    const fee = invoiceValue * discountFee;
    // NEW: Heading outside the black box
    resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
    resultsHTML += `<div class="dash-col-content">`;
    resultsHTML += `<h3>Advance Amount</h3><div class="big">$${fmt(advance)}</div>`;
    resultsHTML += `<h3>Estimated Fee</h3><div class="big">$${fmt(fee)}</div>`;
    resultsHTML += `</div>`;
    renderDetails('invoice_finance', {
      invoiceValue,
      advanceRate: advanceRate * 100,
      discountFee: discountFee * 100
    });
    window.updateLastCalc({ loanPurpose });
  }

  else if (loanPurpose === "smsf_residential") {
    const ctx = {
      propertyValue: num(document.getElementById('propertyValue')?.value || 0),
      depositAmount: num(document.getElementById('depositAmount')?.value || 0),
      interestRate: num(document.getElementById('interestRate')?.value || 0) / 100,
      interestRatePct: (num(document.getElementById('interestRate')?.value || 0)).toFixed(2),
      loanTerm: num(document.getElementById('loanTerm')?.value || 0),
      rentAmount: num(document.getElementById('rentAmount')?.value || 0),
      rentFrequency: document.getElementById('rentFrequency')?.value || "weekly",
      annualSMSFFees: num(document.getElementById('annualSMSFFees')?.value || 0),
      memberContribs: num(document.getElementById('memberContribs')?.value || 0),
      smsfLiquidAssets: num(document.getElementById('smsfLiquidAssets')?.value || 0)
    };

    const res = calcSMSFPurchase(ctx);

    // NEW: Heading outside the black box
    resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
    resultsHTML += `<div class="dash-col-content">`;
    resultsHTML += `<h3>Loan Amount</h3><div class="big">$${fmt(res.loanAmount)}</div>`;
    resultsHTML += `<h3>Monthly Repayment</h3><div class="big">$${fmt(res.monthlyRepayment)}</div>`;
    resultsHTML += `<h3>LVR</h3><div class="big">${Math.round(res.lvr)}%</div>`;
    resultsHTML += `<h3>Annual Net Cash Flow</h3><div class="big ${res.netCashFlow >= 0 ? 'green' : 'red'}">$${fmt(res.netCashFlow)}</div>`;
    resultsHTML += `</div>`;

    renderDetails('smsf_residential', { ...ctx, ...res });
    window.updateLastCalc({ loanPurpose });
  }

  else if (loanPurpose === "smsf_commercial") {
    const ctx = {
      propertyValue: num(document.getElementById('propertyValue')?.value || 0),
      depositAmount : num(document.getElementById('depositAmount')?.value || 0),
      interestRate: num(document.getElementById('interestRate')?.value || 0) / 100,
      interestRatePct: (num(document.getElementById('interestRate')?.value || 0)).toFixed(2),
      loanTerm: num(document.getElementById('loanTerm')?.value || 0),
      rentAmount: num(document.getElementById('rentAmount')?.value || 0),
      rentFrequency: document.getElementById('rentFrequency')?.value || "weekly",
      annualSMSFFees: num(document.getElementById('annualSMSFFees')?.value || 0),
      memberContribs: num(document.getElementById('memberContribs')?.value || 0),
      smsfLiquidAssets: num(document.getElementById('smsfLiquidAssets')?.value || 0)
    };

    const res = calcSMSFPurchase(ctx);

    // NEW: Heading outside the black box
    resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
    resultsHTML += `<div class="dash-col-content">`;
    resultsHTML += `<h3>Loan Amount</h3><div class="big">$${fmt(res.loanAmount)}</div>`;
    resultsHTML += `<h3>Monthly Repayment</h3><div class="big">$${fmt(res.monthlyRepayment)}</div>`;
    resultsHTML += `<h3>LVR</h3><div class="big">${Math.round(res.lvr)}%</div>`;
    resultsHTML += `<h3>Annual Net Cash Flow</h3><div class="big ${res.netCashFlow >= 0 ? 'green' : 'red'}">$${fmt(res.netCashFlow)}</div>`;
    resultsHTML += `</div>`;

    renderDetails('smsf_commercial', { ...ctx, ...res });
    window.updateLastCalc({ loanPurpose });
  }

  else if (loanPurpose === "smsf_refinance") {
    const ctx = {
      propertyValue: num(document.getElementById('propertyValue')?.value || 0),
      loanAmount: num(document.getElementById('loanAmount')?.value || 0),
      currentRate: num(document.getElementById('currentRate')?.value || 0) / 100,
      currentRatePct: (num(document.getElementById('currentRate')?.value || 0)).toFixed(2),
      interestRate: 6.75 / 100,
      interestRatePct: "6.75",
      loanTerm: num(document.getElementById('loanTerm')?.value || 0),
      rentAmount: num(document.getElementById('rentAmount')?.value || 0),
      rentFrequency: document.getElementById('rentFrequency')?.value || "weekly",
      annualSMSFFees: num(document.getElementById('annualSMSFFees')?.value || 0),
      smsfLiquidAssets: num(document.getElementById('smsfLiquidAssets')?.value || 0)
    };

    const res = calcSMSFRefinance(ctx);

    // NEW: Heading outside the black box
    resultsHTML += `<div class="dash-col-header">RESULTS</div>`;
    resultsHTML += `<div class="dash-col-content">`;
    resultsHTML += `<h3>Old Monthly Repayment</h3><div class="big">$${fmt(res.oldMonthly)}</div>`;
    resultsHTML += `<h3>New Monthly Repayment</h3><div class="big">$${fmt(res.newMonthly)}</div>`;
    resultsHTML += `<h3>Monthly Savings</h3><div class="big ${res.monthlySavings >= 0 ? 'green' : 'red'}">$${fmt(res.monthlySavings)}</div>`;
    resultsHTML += `<h3>Annual Savings</h3><div class="big ${res.annualSavings >= 0 ? 'green' : 'red'}">$${fmt(res.annualSavings)}</div>`;
    resultsHTML += `<h3>LVR</h3><div class="big">${Math.round(res.lvr)}%</div>`;
    resultsHTML += `<h3>Refinance Rate</h3><div class="big">${ctx.interestRatePct}%</div>`;
    resultsHTML += `</div>`;

    renderDetails('smsf_refinance', { ...ctx, ...res });
    window.updateLastCalc({ loanPurpose });
  }

  // Write results and Step 3
  const resultsEl = document.getElementById('results');
  resultsEl.innerHTML = resultsHTML;
  
  // Mark that the user has manually calculated at least once (enables auto-recalc within this scenario)
  // Only mark as calculated if this was a manual calculation (not auto-recalc)
  if (!window.isAutoRecalc) {
    window.hasCalculated = true;
  }

  // NEW: Show repayment scenarios section for home loans after successful calculation
  if (isHomeLoan && !hasLVRExceeded) {
    toggleRepaymentScenariosSection(true);
  } else {
    toggleRepaymentScenariosSection(false);
  }

  // Wire up error CTA (Max LVR)
  const errorCta = document.getElementById('maxLVRRequestBtn');
  if (errorCta) {
    errorCta.onclick = () => alert('Lead form coming soon! (We can pre-fill with calculation data here.)');
  }

  // Only inject Step 3 and CTA if there's no LVR exceeded error
  if (!hasLVRExceeded) {
    if (loanPurpose !== "home_borrowing" && loanPurpose !== "commercial_borrowing") {
      renderStep4(loanPurpose);
    }
    
    // Consultation CTA moved to the back panel (results front remains focused on outputs)
    // Back panel contains a dedicated 'Get a Free Consultation' button which is handled by the delegated handler.
    
    const ctaBtn = document.createElement('button');
    ctaBtn.className = 'cta-btn';
    ctaBtn.type = 'button';
    ctaBtn.innerHTML = `<img src="t-removebg-preview.png" alt="" style="width:10px; height:16px; vertical-align:middle;"> ${getCTALabel(loanPurpose)}`;
    ctaBtn.onclick = () => alert('Lead form coming soon! (We can pre-fill with calculation data here.)');
    resultsEl.appendChild(ctaBtn);
  }

  // Refresh summary & disclaimer
  updateSummary();
  document.getElementById('disclaimer').innerText = getDisclaimer(loanPurpose);
});
}
