# 🚀 Quick Email Setup (3 Minutes)

## The Fastest Way to Setup Email Notifications

### 1️⃣ Create EmailJS Account (2 min)
- Go to https://www.emailjs.com/
- Sign up with any email
- Verify your email

### 2️⃣ Setup in EmailJS Dashboard (1 min)
```
Email Services → Add Service → Gmail
Service Name: service_finco_calculator
Connect Gmail: mehdiakbar905@gmail.com
```

### 3️⃣ Create Template
```
Email Templates → Create New Template
Template Name: template_calculation_results
```

Paste this template:
```
To Email: {{recipient_email}}
Subject: New Loan Calculation - {{loan_category}}

---CALCULATION DETAILS---
Type: {{loan_category}}
Purpose: {{loan_purpose}}
Time: {{timestamp}}

{{calculation_details}}

---SYSTEM---
Agent: {{user_agent}}
```

### 4️⃣ Get Your Public Key
```
Account → Copy "Public Key" value
```

### 5️⃣ Update the Code
Open: `js/email-service.js`

Line 11-12, change:
```javascript
const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';
```

To:
```javascript
const EMAILJS_PUBLIC_KEY = 'YOUR_ACTUAL_KEY_HERE';
```

---

## ✅ Done!

Test it:
1. Refresh calculator page
2. Do a calculation
3. Check mehdiakbar905@gmail.com inbox

---

## 📱 What Emails Look Like

```
TO: mehdiakbar905@gmail.com
FROM: Calculator System
SUBJECT: New Loan Calculation - Home Loan

---CALCULATION DETAILS---
Type: Home Loan
Purpose: Debt Consolidation
Time: 29/12/2025, 2:30:45 PM

Monthly Repayment: $2,450
Total Loan Amount: $450,000
LMI Premium: $12,500
Effective LVR: 85.42%

--- USER INPUTS ---
Property Value: 500000
Loan Amount: 425000
Interest Rate: 6.5%
Loan Term: 25

---SYSTEM---
Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...
```

---

## 🆘 If It Doesn't Work

1. **Open Browser Console** (F12 → Console)
2. **Do a calculation**
3. **Look for error messages**
4. **Common issues:**
   - Wrong Public Key format
   - Service name doesn't match exactly
   - Template name doesn't match exactly

---

## 📞 More Help

Full guide: `EMAIL_SETUP_GUIDE.md`
EmailJS Docs: https://www.emailjs.com/docs/

---

**Time to setup: 3-5 minutes** ⏱️
