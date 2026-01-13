// Ensure SMSF scaffold waits for email-service.js to be fully initialized before registering handlers
(function(){
  const maxWait = 50; // 5 seconds max
  let attempts = 0;
  
  function checkAndInitSMSF() {
    attempts++;
    
    // Check if email-service.js has initialized the rejection logic
    if (typeof window.sendCalculationResultsEmail === 'function' && typeof window.sendSMSFCalculationResultsEmail === 'function') {
      console.log('✅ [INIT] SMSF scaffold ready — both send functions available');
      return true;
    }
    
    if (attempts < maxWait) {
      setTimeout(checkAndInitSMSF, 100);
      return false;
    }
    
    console.warn('⚠️ [INIT] Timeout waiting for email-service.js initialization');
    return false;
  }
  
  // Start the check
  checkAndInitSMSF();
})();
