// constants.js - UPDATED: LVR formatting to 2dp in messages; Bridging summary text retained; Home Upgrade/Equity/Consolidation summaries retained
// - UPDATED Step 3 message for Next Home – Upgrade to the exact provided text

const stateSummaries = {
  NSW: "As a first home buyer in New South Wales, you may be eligible for a $10,000 First Home Owner Grant for new homes, plus potential stamp duty concessions. Eligibility criteria applies.",
  VIC: "As a first home buyer in Victoria, you may be eligible for a $10,000 First Home Owner Grant for new homes, plus potential stamp duty concessions. Eligibility criteria applies.",
  QLD: "As a first home buyer in Queensland, you may be eligible for a $30,000 First Home Owner Grant for new homes, plus potential stamp duty concessions. Eligibility criteria applies.",
  WA: "As a first home buyer in Western Australia, you may be eligible for a $10,000 First Home Owner Grant for new homes, plus potential stamp duty concessions. Eligibility criteria applies.",
  SA: "As a first home buyer in South Australia, you may be eligible for a $15,000 First Home Owner Grant for new homes, plus potential stamp duty concessions. Eligibility criteria applies.",
  TAS: "As a first home buyer in Tasmania, you may be eligible for a $30,000 First Home Owner Grant for new homes, plus potential stamp duty concessions. Eligibility criteria applies.",
  ACT: "As a first home buyer in the Australian Capital Territory, you may be eligible for means-tested stamp duty concessions. Eligibility criteria applies.",
  NT: "As a first home buyer in the Northern Territory, you may be eligible for a $10,000 First Home Owner Grant for new homes, plus potential stamp duty concessions. Eligibility criteria applies."
};

const step4Messages = {
  home_borrowing: "Your Next Step: Get your accurate, personalised number.<br><br> A quick chat with one of our brokers will run precise lender calculations and give you a clear, confident budget.",
  home_repayment: "Let's discuss your eligibility and find a competitive loan tailored for first home buyers.",
  home_refinance: "Let's review your situation to see if refinancing is the right strategy for you.",
  home_upgrade: "Let's explore how to fund your home upgrade while managing your equity and repayments.",
  home_equity: "Let's discuss the best way to access your equity for your financial goals.",
  home_consolidate: "Let's explore how consolidating your debts into your home loan can simplify your finances and potentially save you money.",
  home_bridging: "We'll confirm your peak debt, structure the bridge correctly and align timing between sale and purchase so your move is seamless.",
  home_next_home: "Next-home upgrades face tougher lender rules, and servicing both loans is where most borrowers stumble.<br><br> Finco makes the path clear—modelling costs, timing your sale and purchase, and structuring your application for approval. Let’s build your upgrade plan and move you into your next home with certainty.",
  home_investment: "We'll help structure your investment loan (IO vs P&I), refine the rate and model cash flow and tax impacts for a confident decision.",
  home_equity_release: "We'll confirm accessible equity, ensure the structure is right, and arrange a quick top‑up or pre‑approval for your plans.",
  home_construction: "We'll review your build contract and progress‑payment schedule,<br><br> and arrange an approval specifically tailored for construction.",
  commercial_repayment: "Commercial lending is complex. Unlock the right commercial finance solution with expert guidance.",
  commercial_borrowing: "Get a precise commercial borrowing capacity assessment from our specialist team.",
  secured_business: "Speak with a commercial finance specialist to structure the right secured facility and pricing.",
  unsecured_business: "We'll review turnover, time in business and cash flow to match you with the right unsecured options.",
  overdraft: "We can set the right overdraft limit and pricing based on your working capital needs.",
  equipment_asset: "Compare chattel mortgage vs lease options and set a balloon that fits your cash flow.",
  invoice_finance: "Unlock working capital from your receivables with the right invoice finance facility.",
  smsf_residential: "Review fund liquidity, contributions and LRBA structure with an SMSF lending specialist.",
  smsf_commercial: "Get expert advice on commercial property purchase through your SMSF.",
  smsf_refinance: "Review LVR, trust deed and liquidity to see if refinancing improves outcomes."
};

// LMI Premium Tiers - Progressive linear interpolation
const lmiTiers = [
  { lvrLow: 80.01, lvrHigh: 85.00, rateLow: 1.0, rateHigh: 2.0 },
  { lvrLow: 85.01, lvrHigh: 90.00, rateLow: 2.0, rateHigh: 3.0 },
  { lvrLow: 90.01, lvrHigh: 95.00, rateLow: 3.0, rateHigh: 4.0 }
];

// Maximum LVR Error Message WITH CTA
const maxLVRErrorMessage = `
  <div style="text-align: left; padding: 24px 20px; background: #0b0d12; border-radius: 12px; border: 1px solid var(--danger);">
    <h2 style="color: var(--danger); margin-bottom: 12px; font-size: 20px;">Maximum LVR Exceeded</h2>
    <p style="color: var(--muted); margin-bottom: 16px; line-height: 1.5;">
      Our panel of lenders generally has a maximum Loan-to-Value Ratio (LVR) of 95% for residential properties.<br>
      Based on your inputs, your scenario exceeds this threshold. While this may limit your options through our standard online service, alternative solutions may be available for your specific circumstances.
    </p>
    <p style="color: var(--ink); font-weight: 600; margin-bottom: 16px;">Let's Explore Your Options</p>
    <p style="color: var(--muted); line-height: 1.5; margin-bottom: 18px;">
      Every situation is unique. Please contact us for a personalised consultation. Our brokers can assess your individual case and discuss potential alternatives that may be suitable for you.
    </p>
    <button type="button" class="cta-btn request-callback" id="maxLVRRequestBtn">Request a Call-back</button>
  </div>
`;

// Refinance Summary Message - UPDATED: force 2dp percent
const refinanceSummaryMessage = (lvr) => {
  const lvrNum = Number(lvr);
  const lvrStr = isNaN(lvrNum) ? '' : lvrNum.toFixed(2);
  return `
    <div style="margin-top: 0; padding: 16px; background: #0b0d12; border-radius: 10px; border-left: 4px solid var(--accent);">
      <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.6;">
        You are exploring a refinance with a high Loan-to-Value Ratio (LVR) of <strong>${lvrStr}%</strong>. It's important to know that Lenders Mortgage Insurance (LMI) is tied to the original loan and does not transfer to a new lender.
      </p>
      <p style="margin: 0 0 6px 0; font-size: 13px; line-height: 1.6; font-weight: 700; color: var(--accent);">
        Key Consideration for You:
      </p>
      <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.6;">
        If your property's value has not increased enough to bring your LVR below 80%, a new LMI premium will likely be payable to the new lender. This cost can often be capitalised into the new loan.
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 1.6;">
        A key part of our assessment will be obtaining a current valuation to see if we can eliminate this cost for you. The potential for a new LMI premium is a crucial factor in determining the overall savings and feasibility of your refinance.
      </p>
    </div>
  `;
};

// LMI Summary Messages for Home Repayment - UPDATED: display LVR with 2dp
const lmiSummaryMessages = {
  above80: (state, lvr) => {
    const stateNames = {
      NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland", WA: "Western Australia",
      SA: "South Australia", TAS: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory"
    };
    const stateName = stateNames[state] || state;
    const lvrStr = Number(lvr).toFixed(2);
    return `
      <div class="lmi-summary">
        <p>You are calculating repayments for a residential property purchase in ${stateName}. Your scenario has an <strong>${lvrStr}% Loan to Value Ratio (LVR)</strong>. At this level, Lenders Mortgage Insurance (LMI) is typically required by lenders. To give you a complete picture, we have included an estimate of the LMI cost in your repayment results.</p>
      </div>
    `;
  },
  
  below80: (state, lvr) => {
    const stateNames = {
      NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland", WA: "Western Australia",
      SA: "South Australia", TAS: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory"
    };
    const stateName = stateNames[state] || state;
    const lvrStr = Number(lvr).toFixed(2);
    return `
      <div class="lmi-summary">
        <p>You are calculating repayments for a residential property purchase in the state of ${stateName}. This includes estimated Lenders Mortgage Insurance (LMI) costs if your Loan to Value Ratio (LVR) exceeds 80%. Based on your scenario with a <strong>${lvrStr}% LVR</strong>, LMI does not apply and no cost has been added to your calculation.</p>
      </div>
    `;
  }
};

// Home Loan Disclaimer with LMI
const homeLoanDisclaimer = `Disclaimer: The results from this calculator, including the estimated Lenders Mortgage Insurance (LMI) premium, are provided for illustrative purposes only. They are based on the information you have supplied and should not be considered financial advice or a pre-approval.

Please note:
• The final LMI premium is determined by the lender and their insurer after a full assessment of your application, the specific property, and the final loan details.
• Your actual borrowing capacity, loan repayments, and all associated costs may differ.`;

// Summary descriptions for loan purposes
const summaryDescriptions = {
  home_borrowing: "Based on your income and commitments, this provides a conservative estimate of your borrowing power.",
  home_repayment: "You are calculating repayments for a residential property purchase. This includes estimated LMI costs if your LVR exceeds 80%.",
  home_refinance: "You are exploring your options to refinance your current home loan. Based on your details, switching to a new loan could potentially save you money.",
  home_upgrade: "You’re planning to upgrade your home and need extra funds for renovations or improvements. This calculator shows an estimate of how this might affect your LVR and any LMI that could apply.\n\nPlease<br><br> note: The results are estimates only and do not constitute an approval. If you proceed with a full application, the lender will usually order a valuation, and the assessed property value may differ from the amount you have entered here.",
  home_equity: "You’re planning to access the equity in your property for your financial goals. This calculator shows an estimate of how this might affect your LVR and any LMI that could apply.\n\nPlease<br><br> note: The results are estimates only and do not constitute an approval. If you proceed with a full application, the lender will usually order a valuation, and the assessed property value may differ from the amount you have entered here.",
  home_consolidate: "You are exploring consolidating your personal debts into your home loan. This can simplify your finances by having one monthly payment and potentially lower your overall interest costs.\nPlease<br><br> note: This calculator provides estimates only. When a full application is submitted, the lender would normally undertake a property valuation, and the value of the property may well be different to the one you have provided here. Please be aware that if your loan-to-value ratio (LVR) exceeds 80%, Lenders Mortgage Insurance (LMI) may be applicable.",
  home_bridging: "You are estimating a bridging finance scenario where you buy your new property before selling your current one. This calculator provides an indicative overview using the Peak Debt approach, combining your existing loan,<br><br> proposed new loan, and estimated purchase costs. We also include a general allowance for holding costs and show projected repayments on either interest-only or principal & interest during the bridging period. Final figures may vary, as the lender will complete a full assessment and arrange an independent property valuation when you proceed with a formal application.",
  home_next_home: "You are planning your next home move. We offset sale proceeds and cash savings against the new purchase and costs to estimate the new loan and repayments.",
  home_investment: "You are assessing an investment property. We estimate loan size, repayments, rental yield, first‑year cash flow and the potential tax effect of negative gearing.",
  home_equity_release: "You are exploring an equity top‑up against your existing property. We show current equity, a conservative accessible amount and the repayment impact.",
  home_construction: "You are assessing a construction project with progressive drawdowns. We estimate repayments during the build (interest‑only on drawn balance) and after completion (P&I).",
  commercial_repayment: "You are calculating repayments for a commercial property loan. Commercial loans typically have different assessment criteria and rates compared to residential loans.",
  commercial_borrowing: "You are assessing your borrowing capacity for a commercial property investment. DSCR and LVR are key in the lender's assessment.",
  secured_business: "You are exploring a secured business loan. Secured loans use collateral (e.g., property/equipment) and can offer sharper pricing and longer terms.",
  unsecured_business: "You are exploring an unsecured business loan with faster access and flexible terms. Lenders assess turnover, time in business, and cash flow.",
  overdraft: "You are looking at a business overdraft for working capital flexibility. Interest is charged on the amount you use, not the full limit.",
  equipment_asset: "You are financing equipment/assets. Repayments can be tailored and a balloon can help manage cash flow and end-of-term options.",
  invoice_finance: "You are using your invoices to unlock working capital. An advance is paid now and a discount/fee is deducted when your debtor pays. <br><br>The discount fee (or service fee) in invoice financing can be charged either at the time of the initial advance or upon final settlement, depending on the lender's specific policy.",
  smsf_residential: "You are considering an SMSF residential property purchase via an LRBA structure. LVR and liquidity settings apply and rent/contributions drive cash flow.",
  smsf_commercial: "You are considering an SMSF commercial property purchase via an LRBA structure. LVR and liquidity settings apply and rent/contributions drive cash flow.",
  smsf_refinance: "You are exploring refinancing options for your SMSF property loan to potentially secure better rates and improve cash flow."
};
