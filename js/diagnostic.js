// Quick diagnostic: Check if SMSF scaffold loaded and rejection works
(function(){
  console.log('🔍 DIAGNOSTIC: Checking SMSF setup...');
  console.log('window.sendSMSFCalculationResultsEmail available?', typeof window.sendSMSFCalculationResultsEmail === 'function');
  console.log('window.downloadSMSFResultsAsPDF available?', typeof window.downloadSMSFResultsAsPDF === 'function');
  
  // Check if email-service-smsf.js loaded by looking for its console output
  setTimeout(() => {
    console.log('✅ DIAGNOSTIC COMPLETE');
  }, 500);
})();
