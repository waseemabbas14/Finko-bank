// calculations.js
// calculations.js - UPDATED: Enforce 2dp on all LVR outputs to fix UI panel decimals
// - Base LVR, Effective LVR and LMI Rate are returned as 2-decimal strings across all flows

// Basic utility functions
function num(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).toString().replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

// Currency/whole number formatting used by UI rendering (kept unchanged)
function fmt(n, d = 0) {
  return Math.round(Number(n)).toLocaleString(undefined, { 
    minimumFractionDigits: d, 
    maximumFractionDigits: d 
  });
}

// Helper: format a percentage to 2 decimal places as a string
function to2dpString(n) {
  const x = Number(n);
  if (!isFinite(x)) return '0.00';
  return x.toFixed(2);
}

// LMI Calculation Function
function calculateLMI(propertyValue, baseLoanAmount) {
  const lvr = (baseLoanAmount / propertyValue) * 100;
  
  // No LMI if LVR <= 80%
  if (lvr <= 80) {
    return {
      lmiPremium: 0,
      totalLoanAmount: baseLoanAmount,
      effectiveLVR: to2dpString(lvr),
      baseLVR: to2dpString(lvr),
      lmiRate: to2dpString(0),
      requiresLMI: false
    };
  }
  
  // Find the appropriate tier
  let tier = null;
  for (const t of lmiTiers) {
    if (lvr >= t.lvrLow && lvr <= t.lvrHigh) {
      tier = t;
      break;
    }
  }
  
  if (!tier) {
    // LVR exceeds 95%
    return {
      lmiPremium: 0,
      totalLoanAmount: baseLoanAmount,
      effectiveLVR: to2dpString(lvr),
      baseLVR: to2dpString(lvr),
      lmiRate: to2dpString(0),
      error: "LVR_EXCEEDED",
      requiresLMI: true
    };
  }
  
  // Calculate LMI rate using linear interpolation
  const lmiRateRaw = tier.rateLow + 
    ((lvr - tier.lvrLow) / (tier.lvrHigh - tier.lvrLow)) * 
    (tier.rateHigh - tier.rateLow);
  
  // Calculate LMI premium
  const lmiPremium = baseLoanAmount * (lmiRateRaw / 100);
  
  // Calculate total loan amount with capitalized LMI
  const totalLoanAmount = baseLoanAmount + lmiPremium;
  
  // Calculate effective LVR
  const effectiveLVRRaw = (totalLoanAmount / propertyValue) * 100;
  
  return {
    lmiPremium: Math.round(lmiPremium),
    totalLoanAmount: Math.round(totalLoanAmount),
    effectiveLVR: to2dpString(effectiveLVRRaw),
    baseLVR: to2dpString(lvr),
    lmiRate: to2dpString(lmiRateRaw),
    requiresLMI: true
  };
}

// Find max base loan such that effective LVR (including capitalised LMI) <= target (default 95%)
function findMaxBaseLoanForEffectiveLVR(propertyValue, targetEffLVR = 95) {
  if (!propertyValue || propertyValue <= 0) return 0;
  let lo = 0, hi = propertyValue * (targetEffLVR / 100); // initial bound
  let best = 0;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const res = calculateLMI(propertyValue, mid);
    if (res.error === "LVR_EXCEEDED") {
      // Base LVR > 95, too high
      hi = mid;
      continue;
    }
    if (Number(res.effectiveLVR) <= targetEffLVR) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.floor(best);
}

// Check if LVR exceeds maximum allowed (95% including LMI)
function checkMaxLVR(propertyValue, baseLoanAmount) {
  const lmiResult = calculateLMI(propertyValue, baseLoanAmount);
  return Number(lmiResult.effectiveLVR) > 95;
}

// Convert rent amount based on frequency
function convertRentToAnnual(amount, frequency) {
  const rentAmount = num(amount);
  switch (frequency) {
    case 'weekly':
      return rentAmount * 52;
    case 'monthly':
      return rentAmount * 12;
    case 'yearly':
      return rentAmount;
    default:
      return rentAmount;
  }
}

// Repayments
function calcMonthlyRepayment(P, annualRate, years) {
  const r = annualRate / 12;
  const n = years * 12;
  if (annualRate === 0) return P / n;
  return P * r / (1 - Math.pow(1 + r, -n));
}

function calcInterestOnly(P, annualRate) {
  return P * (annualRate / 12);
}

function calcLVR(loan, value) {
  return (!loan || !value) ? 0 : (loan / value) * 100;
}

function paymentToLoanAmount(monthlyPayment, annualRate, years) {
  if (monthlyPayment <= 0 || annualRate <= 0 || years <= 0) return 0;
  
  const r = annualRate / 12;
  const n = years * 12;
  
  if (r === 0) return monthlyPayment * n;
  
  const denominator = 1 - Math.pow(1 + r, -n);
  if (denominator <= 0) return 0;
  
  return monthlyPayment * (1 - Math.pow(1 + r, -n)) / r;
}

// Government charges by state (Transfer Fee + Mortgage Registration Fee)
const governmentCharges = {
  NSW: 1200,
  VIC: 1500,
  QLD: 1400,
  WA: 1300,
  SA: 1350,
  TAS: 1250,
  ACT: 1100,
  NT: 1200
};

// Conveyancer fees (fixed)
const CONVEYANCER_FEES = 3000;

// Stamp duty calculations by state
function calcStampDutyVIC(price, isFirstHomeBuyer, propertyUse) {
  let duty = 0;
  if (price <= 25000) duty = price * 0.014;
  else if (price <= 130000) duty = 350 + (price - 25000) * 0.024;
  else if (price <= 960000) duty = 2870 + (price - 130000) * 0.06;
  else duty = price * 0.055;

  if (isFirstHomeBuyer && propertyUse === "residential") {
    if (price <= 600000) return 0;
    if (price <= 750000) {
      const factor = (price - 600000) / 150000;
      return duty * factor;
    }
  }
  return Math.round(duty);
}

function calcStampDuty(state, price, isFirstHomeBuyer, propertyType = '', propertyUse = '') {
  if (!price) return 0;
  
  // First home buyer exemptions
  if (isFirstHomeBuyer && propertyUse === "residential") {
    switch (state) {
      case "NSW":
        if (propertyType === "newly_constructed" && price <= 800000) return 0;
        break;
      case "VIC":
        if (price <= 600000) return 0;
        break;
      case "QLD":
        if (price <= 500000) return 0;
        break;
      case "WA":
        if (price <= 430000) return 0;
        break;
      case "SA":
        if (price <= 300000) return 0;
        break;
      case "TAS":
        if (price <= 400000) return 0;
        break;
      case "ACT":
        return 0;
      case "NT":
        if (price <= 350000) return 0;
        break;
    }
  }

  // Standard stamp duty calculations
  let duty = 0;
  switch (state) {
    case "NSW":
      duty = price * 0.045;
      break;
    case "VIC":
      duty = calcStampDutyVIC(price, isFirstHomeBuyer, propertyUse);
      break;
    case "QLD":
      duty = price * 0.035;
      break;
    case "WA":
      duty = price * 0.047;
      break;
    case "SA":
      duty = price * 0.045;
      break;
    case "TAS":
      duty = price * 0.0425;
      break;
    case "ACT":
      duty = price * 0.042;
      break;
    case "NT":
      duty = price * 0.049;
      break;
    default:
      duty = 0;
  }
  
  return Math.round(duty);
}

// Calculate total property cost and settlement funds
function calcSettlementFunds(state, propertyValue, loanAmount, depositAmount, isFirstHomeBuyer, propertyType, propertyUse) {
  const stampDuty = calcStampDuty(state, propertyValue, isFirstHomeBuyer, propertyType, propertyUse);
  const govtCharges = governmentCharges[state] || 1200;
  const totalPropertyCost = propertyValue + stampDuty + govtCharges + CONVEYANCER_FEES;
  const cashRequired = depositAmount + stampDuty + govtCharges + CONVEYANCER_FEES;
  
  return {
    totalPropertyCost: Math.round(totalPropertyCost),
    stampDuty,
    govtCharges,
    conveyancerFees: CONVEYANCER_FEES,
    cashRequired: Math.round(cashRequired),
    settlementFunds: Math.round(cashRequired)
  };
}

// Balloon repayment
function calcBalloonRepayment(P, annualRate, years, balloonPct) {
  const n = years * 12;
  const r = annualRate / 12;
  const B = P * (balloonPct / 100);
  if (annualRate === 0) return (P - B) / n;
  return ((P - (B / Math.pow(1 + r, n))) * r) / (1 - Math.pow(1 + r, -n));
}

// Home Borrowing capacity
function calcHomeBorrowingCapacity(input) {
  console.log('=== HOME BORROWING CAPACITY CALCULATION ===');
  
  // Industry standard assessment rate: 5.5% (conservative stress test rate)
  // This aligns with major Australian banks' serviceability assessment practices
  const assessmentRate = 0.055;
  const termYears = 30;

  const gross = num(input.grossIncome) || 0;
  const other = num(input.otherIncome) || 0;
  const livingExpenses = num(input.livingExpenses) || 0;
  const homeLoanReps = num(input.homeLoanReps) || 0;
  const otherLoanReps = num(input.otherLoanReps) || 0;
  const cardLimits = num(input.cardLimits) || 0;
  const otherCommitments = num(input.otherCommitments) || 0;

  console.log('Input values:', { gross, other, livingExpenses, homeLoanReps, otherLoanReps, cardLimits, otherCommitments });

  let shadedGross = gross;
  const employmentType = input.employmentType || 'payg';
  
  if (employmentType === 'self') {
    shadedGross = gross * 0.90;
    console.log('Self-employed shading applied: 90%');
  } else if (employmentType === 'mixed') {
    shadedGross = gross * 0.95;
    console.log('Mixed employment shading applied: 95%');
  } else {
    console.log('PAYG - no shading applied: 100%');
  }

  console.log('Shaded gross income:', shadedGross);

  const grossMonthlyIncome = (shadedGross + (other * 0.80)) / 12;
  console.log('Gross monthly income:', grossMonthlyIncome);

  const creditCardCommitment = cardLimits * 0.04;
  const monthlyCommitments = 
    Math.max(livingExpenses, 0) +
    homeLoanReps +
    otherLoanReps +
    creditCardCommitment +
    otherCommitments;

  console.log('Monthly commitments:', monthlyCommitments);
  console.log('Credit card commitment (4% of limits):', creditCardCommitment);

  const netMonthlySurplus = Math.max(0, grossMonthlyIncome - monthlyCommitments);
  console.log('Net monthly surplus:', netMonthlySurplus);
  console.log('Assessment rate:', assessmentRate);

  let capacity = 0;
  if (netMonthlySurplus > 0 && assessmentRate > 0) {
    capacity = paymentToLoanAmount(netMonthlySurplus, assessmentRate, termYears);
    console.log('Calculated capacity:', capacity);
  } else {
    console.log('No capacity - net monthly surplus is zero or negative');
  }

  console.log('Final borrowing capacity:', capacity);
  console.log('=== END CALCULATION ===');

  return { 
    capacity: Math.round(capacity),
    assessmentRate, 
    termYears,
    monthlyCommitments: Math.round(monthlyCommitments),
    grossMonthlyIncome: Math.round(grossMonthlyIncome),
    netMonthlySurplus: Math.round(netMonthlySurplus)
  };
}

// Home Purchase with LMI Calculation
function calcHomePurchaseWithLMI(ctx) {
  const baseLoanAmount = ctx.loanAmount;
  
  if (checkMaxLVR(ctx.propertyValue, baseLoanAmount)) {
    return { error: "MAX_LVR_EXCEEDED" };
  }
  
  const lmiResult = calculateLMI(ctx.propertyValue, baseLoanAmount);
  
  if (lmiResult.error === "LVR_EXCEEDED") {
    return { error: "MAX_LVR_EXCEEDED" };
  }
  
  const totalLoanAmount = lmiResult.totalLoanAmount;
  const monthlyRepayment = calcMonthlyRepayment(totalLoanAmount, ctx.interestRate, ctx.loanTerm);
  
  const settlement = calcSettlementFunds(
    ctx.state, 
    ctx.propertyValue, 
    baseLoanAmount, 
    ctx.depositAmount, 
    ctx.firstHomeBuyer, 
    ctx.propertyType, 
    ctx.propertyUse
  );
  
  return {
    baseLoanAmount: Math.round(baseLoanAmount),
    totalLoanAmount: Math.round(totalLoanAmount),
    monthlyRepayment: Math.round(monthlyRepayment),
    effectiveLVR: lmiResult.effectiveLVR, // 2dp string
    baseLVR: lmiResult.baseLVR,           // 2dp string
    lmiPremium: lmiResult.lmiPremium,
    lmiRate: lmiResult.lmiRate,           // 2dp string
    requiresLMI: lmiResult.requiresLMI,
    cashRequired: settlement.cashRequired,
    totalPropertyCost: settlement.totalPropertyCost,
    stampDuty: settlement.stampDuty,
    govtCharges: settlement.govtCharges,
    conveyancerFees: settlement.conveyancerFees
  };
}

// Home Upgrade Calculation - Include max facility up to 95% effective LVR
function calcHomeUpgrade(ctx) {
  const baseLoanAmount = ctx.loanAmount || 0;

  // Compute maximum base loan at 95% effective LVR
  const maxBaseLoan = findMaxBaseLoanForEffectiveLVR(ctx.propertyValue, 95);

  // Check if requested base exceeds max LVR
  if (baseLoanAmount > 0 && checkMaxLVR(ctx.propertyValue, baseLoanAmount)) {
    return { error: "MAX_LVR_EXCEEDED" };
  }
  
  // If no requested loan, assume max facility
  const useBaseLoan = baseLoanAmount > 0 ? baseLoanAmount : maxBaseLoan;

  const lmiResult = calculateLMI(ctx.propertyValue, useBaseLoan);
  if (lmiResult.error === "LVR_EXCEEDED") {
    return { error: "MAX_LVR_EXCEEDED" };
  }
  
  const totalLoanAmount = lmiResult.totalLoanAmount;
  const monthlyRepayment = calcMonthlyRepayment(totalLoanAmount, ctx.interestRate, ctx.loanTerm);
  
  // Funds available
  const fundsAvailableRequested = Math.max(0, (baseLoanAmount || 0) - ctx.currentBalance);
  const fundsAvailableAtMax = Math.max(0, maxBaseLoan - ctx.currentBalance);
  
  return {
    baseLoanAmount: Math.round(useBaseLoan),
    requestedBaseLoanAmount: Math.round(baseLoanAmount || 0),
    totalLoanAmount: Math.round(totalLoanAmount),
    monthlyRepayment: Math.round(monthlyRepayment),
    effectiveLVR: lmiResult.effectiveLVR, // 2dp string
    baseLVR: to2dpString((useBaseLoan / ctx.propertyValue) * 100), // 2dp string
    lmiPremium: lmiResult.lmiPremium,
    lmiRate: lmiResult.lmiRate, // 2dp string
    requiresLMI: lmiResult.requiresLMI,
    fundsAvailable: Math.round(fundsAvailableRequested),
    fundsAvailableMax: Math.round(fundsAvailableAtMax),
    currentBalance: Math.round(ctx.currentBalance)
  };
}

// Home Equity Access Calculation - include max accessible funds
function calcHomeEquityAccess(ctx) {
  const requestedBaseLoan = ctx.currentBalance + ctx.equityAmount;

  // Max base loan at 95% effective LVR
  const maxBaseLoan = findMaxBaseLoanForEffectiveLVR(ctx.propertyValue, 95);
  const maxAccessible = Math.max(0, maxBaseLoan - ctx.currentBalance);

  if (checkMaxLVR(ctx.propertyValue, requestedBaseLoan)) {
    return { error: "MAX_LVR_EXCEEDED", maxAccessible: Math.round(maxAccessible) };
  }
  
  const lmiResult = calculateLMI(ctx.propertyValue, requestedBaseLoan);
  if (lmiResult.error === "LVR_EXCEEDED") {
    return { error: "MAX_LVR_EXCEEDED", maxAccessible: Math.round(maxAccessible) };
  }
  
  const totalLoanAmount = lmiResult.totalLoanAmount;
  const monthlyRepayment = calcMonthlyRepayment(totalLoanAmount, ctx.interestRate, ctx.loanTerm);
  
  return {
    baseLoanAmount: Math.round(requestedBaseLoan),
    totalLoanAmount: Math.round(totalLoanAmount),
    monthlyRepayment: Math.round(monthlyRepayment),
    effectiveLVR: lmiResult.effectiveLVR, // 2dp string
    baseLVR: lmiResult.baseLVR,           // 2dp string
    lmiPremium: lmiResult.lmiPremium,
    lmiRate: lmiResult.lmiRate,           // 2dp string
    requiresLMI: lmiResult.requiresLMI,
    maxAccessible: Math.round(maxAccessible)
  };
}

// Debt Consolidation Calculation - supports dynamic debts list
function calcDebtConsolidation(ctx) {
  // Backward compatibility with old fields
  let debts = Array.isArray(ctx.debts) ? ctx.debts : [
    { type: 'Personal Loan', balance: ctx.personalLoanAmount || 0, rate: (ctx.personalLoanRate || 12) / 100, monthly: 0 },
    { type: 'Credit Card', balance: ctx.creditCardBalance || 0, rate: (ctx.creditCardRate || 19) / 100, monthly: 0 },
    { type: 'Other', balance: ctx.otherLoansAmount || 0, rate: 0.10, monthly: 0 }
  ].filter(d => d.balance > 0);

  const totalExistingDebts = debts.reduce((s, d) => s + num(d.balance), 0);

  // Estimate current monthly repayment if not provided
  function estimateMonthly(d) {
    const bal = num(d.balance);
    const r = (d.rate || 0.12);
    if (d.monthly && d.monthly > 0) return d.monthly;
    if ((d.type || '').toLowerCase().includes('credit')) {
      return Math.max(0, Math.round(bal * r / 12)); // approx interest-only
    }
    // 5-year amortised for PL/Car/Other
    return Math.round(calcMonthlyRepayment(bal, r, 5));
  }
  const currentTotalMonthlyDebt = debts.reduce((s, d) => s + estimateMonthly(d), 0);

  const totalConsolidatedLoanAmount = ctx.currentBalance + totalExistingDebts;
  
  if (checkMaxLVR(ctx.propertyValue, totalConsolidatedLoanAmount)) {
    return { error: "MAX_LVR_EXCEEDED", totalExistingDebts: Math.round(totalExistingDebts) };
  }
  
  const lmiResult = calculateLMI(ctx.propertyValue, totalConsolidatedLoanAmount);
  if (lmiResult.error === "LVR_EXCEEDED") {
    return { error: "MAX_LVR_EXCEEDED", totalExistingDebts: Math.round(totalExistingDebts) };
  }
  
  const totalLoanAmount = lmiResult.totalLoanAmount;
  const monthlyRepayment = calcMonthlyRepayment(totalLoanAmount, ctx.interestRate, ctx.loanTerm);
  const monthlySavings = currentTotalMonthlyDebt - monthlyRepayment;
  
  return {
    baseLoanAmount: Math.round(totalConsolidatedLoanAmount),
    totalLoanAmount: Math.round(totalLoanAmount),
    monthlyRepayment: Math.round(monthlyRepayment),
    effectiveLVR: lmiResult.effectiveLVR, // 2dp string
    baseLVR: lmiResult.baseLVR,           // 2dp string
    lmiPremium: lmiResult.lmiPremium,
    lmiRate: lmiResult.lmiRate,           // 2dp string
    requiresLMI: lmiResult.requiresLMI,
    currentTotalMonthlyDebt: Math.round(currentTotalMonthlyDebt),
    monthlySavings: Math.round(monthlySavings),
    totalDebtConsolidated: Math.round(totalExistingDebts),
    totalExistingDebts: Math.round(totalExistingDebts),
    newConsolidationLoanAmount: Math.round(totalConsolidatedLoanAmount)
  };
}

// Commercial Borrowing Capacity
function calcCommercialBorrowingCapacity(ctx) {
  const VACANCY = 0.08, MAX_LVR = 0.65, ASSESS_RATE = 0.095, TERM = 25;
  
  const NOI = Math.max(0, ctx.annualRent * (1 - VACANCY) - ctx.annualExpenses);
  const maxAnnualDebtService = NOI / 1.3;
  const maxLoanByServiceability = paymentToLoanAmount(maxAnnualDebtService / 12, ASSESS_RATE, TERM);
  const maxLoanByLVR = ctx.propertyValue * MAX_LVR;
  const capacity = Math.min(maxLoanByServiceability, maxLoanByLVR);
  const dscr = NOI > 0 ? (NOI / (maxAnnualDebtService || 1)) : 0;
  
  return {
    capacity: Math.round(capacity),
    noi: Math.round(NOI),
    dscr: Math.round(dscr)
  };
}

// SMSF Calculations
function calcSMSFPurchase(ctx) {
  const loanAmount = ctx.propertyValue - ctx.depositAmount;
  const monthlyRepayment = calcMonthlyRepayment(loanAmount, ctx.interestRate, ctx.loanTerm);
  const annualRent = convertRentToAnnual(ctx.rentAmount, ctx.rentFrequency);
  const netCashFlow = (annualRent + (ctx.memberContribs || 0)) - (monthlyRepayment * 12 + (ctx.annualSMSFFees || 0));
  const lvr = calcLVR(loanAmount, ctx.propertyValue);
  
  return {
    loanAmount: Math.round(loanAmount),
    monthlyRepayment: Math.round(monthlyRepayment),
    annualRent: Math.round(annualRent),
    netCashFlow: Math.round(netCashFlow),
    lvr: Math.round(lvr) // integers are fine (max 2 dp requirement still met)
  };
}

function calcSMSFRefinance(ctx) {
  const oldMonthly = calcMonthlyRepayment(ctx.loanAmount, ctx.currentRate, ctx.loanTerm);
  const newMonthly = calcMonthlyRepayment(ctx.loanAmount, ctx.interestRate, ctx.loanTerm);
  const monthlySavings = oldMonthly - newMonthly;
  const annualSavings = monthlySavings * 12;
  const lvr = calcLVR(ctx.loanAmount, ctx.propertyValue);
  const annualRent = convertRentToAnnual(ctx.rentAmount, ctx.rentFrequency);
  
  return {
    oldMonthly: Math.round(oldMonthly),
    newMonthly: Math.round(newMonthly),
    monthlySavings: Math.round(monthlySavings),
    annualSavings: Math.round(annualSavings),
    lvr: Math.round(lvr),
    annualRent: Math.round(annualRent)
  };
}

// Commercial Property DSCR Calculation
function calcCommercialDSCR(annualRent, annualExpenses, loanAmount, interestRate, loanTerm, repaymentType = "pni") {
  const VACANCY = 0.08;
  const NOI = Math.max(0, annualRent * (1 - VACANCY) - annualExpenses);
  
  let annualDebtService;
  if (repaymentType === "io") {
    annualDebtService = loanAmount * interestRate;
  } else {
    const monthlyRepayment = calcMonthlyRepayment(loanAmount, interestRate, loanTerm);
    annualDebtService = monthlyRepayment * 12;
  }
  
  const dscr = annualDebtService > 0 ? (NOI / annualDebtService) : 0;
  
  return {
    dscr: Math.round(dscr),
    noi: Math.round(NOI),
    annualDebtService: Math.round(annualDebtService)
  };
}

// Equipment Finance with Balloon Calculation
function calcEquipmentFinance(assetCost, interestRate, financeTerm, balloonPct) {
  const balloonAmount = assetCost * (balloonPct / 100);
  const monthlyRepayment = calcBalloonRepayment(assetCost, interestRate, financeTerm, balloonPct);
  const totalPayable = (monthlyRepayment * financeTerm * 12) + balloonAmount;
  const totalInterest = totalPayable - assetCost;
  
  return {
    balloonAmount: Math.round(balloonAmount),
    monthlyRepayment: Math.round(monthlyRepayment),
    totalPayable: Math.round(totalPayable),
    totalInterest: Math.round(totalInterest)
  };
}

// Invoice Finance Calculation
function calcInvoiceFinance(invoiceValue, advanceRate, discountFee) {
  const advanceAmount = invoiceValue * advanceRate;
  const feeAmount = invoiceValue * discountFee;
  const netAmount = advanceAmount - feeAmount;
  
  return {
    advanceAmount: Math.round(advanceAmount),
    feeAmount: Math.round(feeAmount),
    netAmount: Math.round(netAmount)
  };
}

// Business Overdraft Calculation
function calcOverdraftInterest(limit, amountUsed, interestRate, calculationType = "monthly") {
  let interest;
  if (calculationType === "monthly") {
    interest = amountUsed * (interestRate / 12);
  } else {
    interest = amountUsed * interestRate;
  }
  
  return {
    interest: Math.round(interest),
    utilizationRate: Math.round(limit > 0 ? (amountUsed / limit) * 100 : 0)
  };
}

// Secured Business Loan Calculation
function calcSecuredBusinessLoan(loanAmount, interestRate, loanTerm, repaymentType = "pni") {
  let monthlyRepayment;
  if (repaymentType === "io") {
    monthlyRepayment = calcInterestOnly(loanAmount, interestRate);
  } else {
    monthlyRepayment = calcMonthlyRepayment(loanAmount, interestRate, loanTerm);
  }
  
  const totalRepayments = monthlyRepayment * loanTerm * 12;
  const totalInterest = totalRepayments - loanAmount;
  
  return {
    monthlyRepayment: Math.round(monthlyRepayment),
    totalRepayments: Math.round(totalRepayments),
    totalInterest: Math.round(totalInterest)
  };
}

// Unsecured Business Loan Calculation
function calcUnsecuredBusinessLoan(loanAmount, interestRate, loanTerm, frequency = "monthly") {
  const monthlyRepayment = calcMonthlyRepayment(loanAmount, interestRate, loanTerm);
  
  let repaymentAmount = monthlyRepayment;
  let repaymentLabel = "Monthly";
  
  if (frequency === "weekly") {
    repaymentAmount = monthlyRepayment * 12 / 52;
    repaymentLabel = "Weekly";
  } else if (frequency === "fortnightly") {
    repaymentAmount = monthlyRepayment * 12 / 26;
    repaymentLabel = "Fortnightly";
  }
  
  const totalRepayments = repaymentAmount * loanTerm * (frequency === "weekly" ? 52 : frequency === "fortnightly" ? 26 : 12);
  const totalInterest = totalRepayments - loanAmount;
  
  return {
    repaymentAmount: Math.round(repaymentAmount),
    repaymentLabel,
    totalRepayments: Math.round(totalRepayments),
    totalInterest: Math.round(totalInterest)
  };
}

// Property Purchase Total Cost Calculation
function calcPropertyPurchaseTotalCost(state, propertyValue, isFirstHomeBuyer, propertyType, propertyUse) {
  const stampDuty = calcStampDuty(state, propertyValue, isFirstHomeBuyer, propertyType, propertyUse);
  const govtCharges = governmentCharges[state] || 1200;
  const totalPropertyCost = propertyValue + stampDuty + govtCharges + CONVEYANCER_FEES;
  
  return {
    totalPropertyCost: Math.round(totalPropertyCost),
    stampDuty,
    govtCharges,
    conveyancerFees: CONVEYANCER_FEES
  };
}

// Refinance Savings Calculation
function calcRefinanceSavings(currentBalance, currentRate, currentYears, newRate, newTerm, propertyValue = 0) {
  const oldMonthly = calcMonthlyRepayment(currentBalance, currentRate, currentYears);
  
  let newLoanAmount = currentBalance;
  let lmiResult = { 
    lmiPremium: 0, 
    totalLoanAmount: currentBalance, 
    effectiveLVR: to2dpString(0), 
    baseLVR: to2dpString(0),
    requiresLMI: false 
  };
  
  if (propertyValue > 0) {
    lmiResult = calculateLMI(propertyValue, currentBalance);
    
    if (lmiResult.error === "LVR_EXCEEDED") {
      return { error: "MAX_LVR_EXCEEDED" };
    }
    
    newLoanAmount = lmiResult.totalLoanAmount;
  }
  
  const newMonthly = calcMonthlyRepayment(newLoanAmount, newRate, newTerm);
  
  const monthlySavings = oldMonthly - newMonthly;
  const annualSavings = monthlySavings * 12;
  
  const oldTotalInterest = (oldMonthly * currentYears * 12) - currentBalance;
  const newTotalInterest = (newMonthly * newTerm * 12) - newLoanAmount;
  const totalInterestSaved = oldTotalInterest - newTotalInterest;
  
  return {
    oldMonthly: Math.round(oldMonthly),
    newMonthly: Math.round(newMonthly),
    monthlySavings: Math.round(monthlySavings),
    annualSavings: Math.round(annualSavings),
    totalInterestSaved: Math.round(totalInterestSaved),
    lmiPremium: lmiResult.lmiPremium,
    totalLoanAmount: Math.round(newLoanAmount),
    effectiveLVR: lmiResult.effectiveLVR, // 2dp string
    baseLVR: lmiResult.baseLVR,           // 2dp string
    requiresLMI: lmiResult.requiresLMI
  };
}

