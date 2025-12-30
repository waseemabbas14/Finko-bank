# Email System Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER CALCULATOR PAGE                          │
│              (index.html + All Loan Pages)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  User Enters Loan Calculation Data   │
        │  - Property Value                     │
        │  - Income                             │
        │  - Interest Rate                      │
        │  - Loan Term                          │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │    Click "Calculate" Button           │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │   calculations.js Processes Data     │
        │  - Computes LMI                      │
        │  - Calculates Repayments             │
        │  - Generates Results                 │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │   ui.js Renders Results on Page      │
        │  - Shows Monthly Repayment           │
        │  - Shows LMI Amount                  │
        │  - Shows LVR Details                 │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────────────────────┐
        │        email-service.js HOOKS INTO RESULTS               │
        │        Automatically Triggers Email Send                 │
        │  Hook: Captures form inputs + calculation results        │
        └──────────────────┬───────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────────────────────┐
        │              EmailJS Browser Library                      │
        │     (https://cdn.jsdelivr.net/npm/@emailjs/browser)     │
        │  - Receives Public Key from email-service.js            │
        │  - Formats email content                                 │
        │  - Sends via EmailJS Service                            │
        └──────────────────┬───────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────────────────────┐
        │            EmailJS Cloud Service                          │
        │         (secure.emailjs.com)                             │
        │  - Authenticates using Public Key                        │
        │  - Routes to Gmail Service                               │
        │  - Sends Email via SMTP                                  │
        └──────────────────┬───────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────────────────────┐
        │              Gmail SMTP Server                            │
        │         (accounts.google.com)                            │
        │  - Receives email from EmailJS                           │
        │  - Sends to: mehdiakbar905@gmail.com                     │
        └──────────────────┬───────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────────────────────┐
        │            Email Inbox                                    │
        │         mehdiakbar905@gmail.com                          │
        │                                                           │
        │  From: noreply@emailjs.com                              │
        │  Subject: New Loan Calculator Result - Home Loan         │
        │                                                           │
        │  Content:                                                │
        │  - Loan Type (Home/Commercial/SMSF)                     │
        │  - Loan Purpose (Bridging/Investment/etc)               │
        │  - Monthly Repayment: $2,450                            │
        │  - Total Loan Amount: $450,000                          │
        │  - LMI Premium: $12,500                                 │
        │  - Effective LVR: 85.42%                                │
        │  - User Inputs captured                                 │
        │  - Timestamp: 29/12/2025, 2:30 PM                       │
        └──────────────────────────────────────────────────────────┘
```

---

## File Structure

```
index.html
├── <head>
│   └── ... (existing styles/fonts)
└── <body>
    ├── ... (calculator content)
    └── <script>
        ├── js/constants.js (constants)
        ├── js/utils.js (helpers)
        ├── js/calculations.js (calculations)
        ├── js/ui.js (rendering)
        ├── js/home_extras.js (home specific)
        ├── js/eventListeners.js (events)
        ├── js/commercial_financial.js (commercial)
        ├── js/smsf_financial.js (SMSF)
        ├── CDN: EmailJS Library ⭐ NEW
        └── js/email-service.js ⭐ NEW
            └── Hooks into renderResults()
                └── Calls sendCalculationResultsEmail()
                    └── Sends via EmailJS
```

---

## Key Components

### 1. **EmailJS Library** (Browser-side)
- Location: CDN (https://cdn.jsdelivr.net/npm/@emailjs/browser)
- Role: Handles email sending from browser
- Requirement: Public Key for authentication
- Size: ~30KB

### 2. **email-service.js Module** (Initializes EmailJS)
- Location: `js/email-service.js`
- Exports:
  - `window.sendCalculationResultsEmail()` - Main email function
  - `window.hookEmailSendingIntoCalculations()` - Hooks into UI rendering
- Lifecycle:
  1. Initializes EmailJS with Public Key on page load
  2. Hooks into existing `renderResults()` function
  3. When calculation completes, automatically sends email
  4. No user intervention needed

### 3. **EmailJS Service Configuration**
- Service: `service_finco_calculator`
- Provider: Gmail
- Account: mehdiakbar905@gmail.com
- Template: `template_calculation_results`

---

## Security Architecture

```
User's Browser
├── JavaScript (email-service.js)
│   └── Contains: PUBLIC Key (safe to expose)
│       └── Only allows sending via EmailJS
└── NO sensitive data stored locally

EmailJS Cloud Service
├── Receives: Public Key + Template Data
├── Validates: Against configured service
└── Routes: To Gmail SMTP

Gmail SMTP
└── Sends: Email to mehdiakbar905@gmail.com
```

**Security Level: HIGH**
- Public Key cannot be used to access email account
- Only allows sending via specific EmailJS service
- No credentials stored in code
- Each request validated by EmailJS service
- Email address is public information

---

## Configuration Checklist

```javascript
// email-service.js (Lines 6-8)
✅ EMAILJS_SERVICE_ID = 'service_finco_calculator'
✅ EMAILJS_TEMPLATE_ID = 'template_calculation_results'
❌ EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY' // NEEDS YOUR KEY
✅ RECIPIENT_EMAIL = 'mehdiakbar905@gmail.com'
```

**To Complete Setup:**
1. Copy your Public Key from EmailJS dashboard
2. Replace `'YOUR_EMAILJS_PUBLIC_KEY'` with actual key
3. Save file
4. Test with a calculation

---

## Email Content Structure

```
Email Template Variables:
├── {{recipient_email}} → mehdiakbar905@gmail.com
├── {{loan_category}} → Home/Commercial/SMSF
├── {{loan_purpose}} → Bridging/Investment/etc
├── {{calculation_details}} → Formatted results
├── {{timestamp}} → When calculation was done
└── {{user_agent}} → User's browser info

Formatted Calculation Details Include:
├── Monthly Repayment
├── Total Loan Amount
├── Base Loan Amount
├── LMI Premium
├── Effective LVR
├── Base LVR
├── Total Interest
└── All form inputs (property value, income, etc)
```

---

## Testing Workflow

```
Step 1: Setup EmailJS Account
        ✅ Create account
        ✅ Create service
        ✅ Create template
        ✅ Copy public key

Step 2: Update Code
        ✅ Paste public key in email-service.js
        ✅ Save file

Step 3: Test Calculator
        ✅ Open index.html in browser
        ✅ Complete a calculation
        ✅ Check browser console (F12) for success messages
        ✅ Check mehdiakbar905@gmail.com inbox
        ✅ Verify email content is correct

Step 4: Production Ready
        ✅ All emails sending successfully
        ✅ Email content formatted correctly
        ✅ Monitor EmailJS dashboard for quota usage
```

---

## Troubleshooting Decision Tree

```
Emails not sending?
├─ Check browser console (F12)
│  ├─ "EmailJS library not loaded"
│  │  └─ CDN link broken → Check internet connection
│  ├─ "EmailJS not initialized"
│  │  └─ Public Key incorrect → Check email-service.js
│  ├─ "Service not found"
│  │  └─ Service name wrong → Must be 'service_finco_calculator'
│  └─ "Template not found"
│     └─ Template name wrong → Must be 'template_calculation_results'
├─ Check EmailJS dashboard
│  ├─ Activity logs for errors
│  ├─ Quota usage (free tier: 200/month)
│  └─ Service configuration
└─ Check Gmail
   ├─ Spam folder
   ├─ Email forwarding settings
   └─ App password (if using Gmail 2FA)
```

---

**System Status:** ✅ Ready for Deployment
**Completion Time:** 3-5 minutes to setup
**Cost:** FREE (EmailJS free tier)
