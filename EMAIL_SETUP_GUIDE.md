# 📧 Email Notification Setup Guide

## Overview
The calculator now automatically sends calculation results to **mehdiakbar905@gmail.com** whenever a user completes a calculation.

This is implemented using **EmailJS**, which allows sending emails directly from the frontend without needing a backend server.

---

## 🚀 Setup Instructions

### Step 1: Create EmailJS Account
1. Go to https://www.emailjs.com/
2. Click **Sign Up** and create a free account
3. Verify your email

### Step 2: Create Email Service
1. In EmailJS dashboard, go to **Email Services**
2. Click **Add Service**
3. Select **Gmail** (or your email provider)
4. Name it: `service_finco_calculator`
5. Connect your Gmail account:
   - Use **mehdiakbar905@gmail.com**
   - You may need to generate an App Password if using Gmail
6. Click **Create Service**

### Step 3: Create Email Template
1. Go to **Email Templates** in the dashboard
2. Click **Create New Template**
3. Name it: `template_calculation_results`
4. Use this template structure:

```
To Email: {{recipient_email}}
Subject: New Loan Calculator Result - {{loan_category}} ({{loan_purpose}})

From: Calculator System
Message:

Dear Admin,

A new calculation has been completed on the Finco Capital Loan Calculator.

--- CALCULATION DETAILS ---
Loan Type: {{loan_category}}
Loan Purpose: {{loan_purpose}}
Timestamp: {{timestamp}}

{{calculation_details}}

--- SYSTEM INFO ---
User Agent: {{user_agent}}

---
This is an automated notification from the Finco Capital Calculator System.
```

5. Click **Save**

### Step 4: Get Your Public Key
1. Go to **Account** settings in EmailJS
2. Find your **Public Key**
3. Copy it

### Step 5: Update Configuration
1. Open `js/email-service.js`
2. Find this line (around line 12):
   ```javascript
   const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';
   ```
3. Replace `'YOUR_EMAILJS_PUBLIC_KEY'` with your actual public key:
   ```javascript
   const EMAILJS_PUBLIC_KEY = 'abc123xyz456...'; // Your actual key
   ```

### Step 6: Test It
1. Open the calculator (index.html) in your browser
2. Complete a calculation (any loan type)
3. Check mehdiakbar905@gmail.com for the email
4. If you don't receive it, check:
   - EmailJS dashboard for error logs
   - Browser console (F12) for JavaScript errors
   - Spam/trash folder in Gmail

---

## 📝 What Gets Sent

Each email includes:
- ✅ Loan category (Home/Commercial/SMSF)
- ✅ Loan purpose (Bridging/Investment/etc)
- ✅ Calculation results (monthly repayment, loan amount, LMI, etc)
- ✅ User inputs (property value, income, rates, etc)
- ✅ Timestamp of calculation
- ✅ User's browser info

---

## 🔧 Configuration Details

| Item | Value |
|------|-------|
| Email Service ID | `service_finco_calculator` |
| Template ID | `template_calculation_results` |
| Recipient Email | `mehdiakbar905@gmail.com` |
| Public Key | *(Get from your EmailJS account)* |

---

## 📧 Gmail Setup (if using Gmail)

If using Gmail as your email service:

### Generate App Password (Required for Gmail)
1. Go to https://myaccount.google.com/
2. Click **Security** on the left
3. Enable **2-Step Verification** if not already enabled
4. Go back to Security → **App passwords**
5. Select **Mail** and **Windows Computer** (or your device)
6. Gmail will generate a 16-character password
7. Use this password in EmailJS instead of your Gmail password

---

## 🛠️ Troubleshooting

### Issue: Emails not being sent
**Solution:** 
- Check browser console (F12 → Console tab) for errors
- Verify Public Key is correct in `js/email-service.js`
- Ensure EmailJS service and template names match exactly

### Issue: "Service not found" error
**Solution:**
- Make sure service name is exactly: `service_finco_calculator`
- Make sure template name is exactly: `template_calculation_results`

### Issue: Quota exceeded
**Solution:**
- EmailJS free tier allows 200 emails/month
- Check your usage in EmailJS dashboard
- Upgrade plan if needed

### Issue: Email received but formatting looks broken
**Solution:**
- Update the template in EmailJS dashboard with the provided template above
- Test again with a new calculation

---

## 📊 Rate Limits & Costs

**Free Tier (EmailJS):**
- 200 emails per month
- Unlimited templates
- Unlimited contacts

**Upgrade Required When:**
- You exceed 200 emails/month
- You need higher reliability SLA

---

## 🔐 Security Notes

- Your Public Key is safe to expose (it's meant to be public)
- Your Service ID and Template ID are public information
- Only the recipient email is visible in emails sent
- No user passwords or sensitive data is sent

---

## 📞 Support

If you need help:
1. Check EmailJS docs: https://www.emailjs.com/docs/
2. Review your EmailJS dashboard for error logs
3. Check browser console for JavaScript errors (F12)
4. Verify all configuration values are correct

---

## ✅ Verification Checklist

- [ ] EmailJS account created
- [ ] Email service added (named `service_finco_calculator`)
- [ ] Email template created (named `template_calculation_results`)
- [ ] Public Key copied to `js/email-service.js`
- [ ] Test calculation completed
- [ ] Email received in mehdiakbar905@gmail.com
- [ ] Email formatting looks correct

---

**Last Updated:** December 29, 2025
