# EmailJS Configuration - Copy & Paste Template

## Step-by-Step Configuration

### 1. After Getting Your Public Key from EmailJS

Open `js/email-service.js` and find line 12:

```javascript
const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';
```

### 2. Copy Your Public Key

From EmailJS Dashboard → Account → Copy the "Public Key" value

It will look something like:
```
abc123def456ghi789jkl012mno345pqr
```

### 3. Replace in Code

Change this:
```javascript
const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';
```

To this (with YOUR actual key):
```javascript
const EMAILJS_PUBLIC_KEY = 'abc123def456ghi789jkl012mno345pqr';
```

---

## Configuration Variables Reference

**File:** `js/email-service.js`

| Variable | Value | Can Change | Notes |
|----------|-------|-----------|-------|
| `EMAILJS_SERVICE_ID` | `service_finco_calculator` | ❌ No | Must match EmailJS service |
| `EMAILJS_TEMPLATE_ID` | `template_calculation_results` | ❌ No | Must match EmailJS template |
| `EMAILJS_PUBLIC_KEY` | YOUR KEY HERE | ✅ Yes | Get from EmailJS account |
| `RECIPIENT_EMAIL` | `mehdiakbar905@gmail.com` | ✅ Yes | Can change recipient |
| `AUTO_SEND_EMAIL_ON_CALC` | `false` | ✅ Yes | If `true`, an email is automatically sent after each calculation. Default: `false` — recommend leaving `false` so emails are only sent when the user clicks "Send Results to Email". |

---

## Testing Checklist

After configuration, verify:

- [ ] Open browser Developer Tools (F12)
- [ ] Navigate to Console tab
- [ ] Reload page (F5)
- [ ] Look for message: `✓ EmailJS initialized successfully`
- [ ] Complete a loan calculation
- [ ] Look for message: `✓ Calculation results sent successfully`
- [ ] Check mehdiakbar905@gmail.com inbox
- [ ] Verify email contains calculation results

---

## Common Public Key Formats

### EmailJS Public Key
- Length: 30-40 characters
- Contains: Alphanumeric (a-z, 0-9)
- Example: `abc123def456ghi789jkl012mno345pqr`
- ✅ This is safe to put in code (it's meant to be public)

### Where to Find It
1. Login to https://www.emailjs.com/
2. Click your profile → Account
3. Look for "Public Key" section
4. Click "Copy" button
5. Paste into `js/email-service.js`

---

## Changing the Recipient Email

**If you want emails sent to a different address:**

Open `js/email-service.js` line 8:

```javascript
const RECIPIENT_EMAIL = 'mehdiakbar905@gmail.com';
```

Change to:

```javascript
const RECIPIENT_EMAIL = 'newemail@example.com';
```

---

## EmailJS Service/Template Requirements

### Email Service (Must be named exactly)
```
Service Name: service_finco_calculator
Service Type: Gmail (or your email provider)
Email Account: mehdiakbar905@gmail.com (or your account)
Status: Connected ✓
```

### Email Template (Must be named exactly)
```
Template Name: template_calculation_results
Service: service_finco_calculator
Variables Supported:
  - {{recipient_email}}
  - {{loan_category}}
  - {{loan_purpose}}
  - {{calculation_details}}
  - {{timestamp}}
  - {{user_agent}}
```

---

## Advanced: Custom Configuration

### Option A: Environment Variables
If you want to avoid hardcoding the key:

```javascript
// Get from localStorage (user sets once)
const EMAILJS_PUBLIC_KEY = localStorage.getItem('emailjs_public_key') || 'YOUR_EMAILJS_PUBLIC_KEY';
```

Then store via:
```javascript
localStorage.setItem('emailjs_public_key', 'your_actual_key');
```

### Option B: Admin Panel
Create an admin page to set configuration:

```html
<input type="password" id="emailjs_key" placeholder="Enter EmailJS Public Key">
<button onclick="saveConfig()">Save Configuration</button>
```

### Option C: Config File
Create `config.json`:

```json
{
  "emailjs": {
    "publicKey": "your_key_here",
    "serviceId": "service_finco_calculator",
    "templateId": "template_calculation_results",
    "recipientEmail": "mehdiakbar905@gmail.com"
  }
}
```

Then load in `email-service.js`:
```javascript
fetch('config.json')
  .then(r => r.json())
  .then(config => {
    EMAILJS_PUBLIC_KEY = config.emailjs.publicKey;
  });
```

---

## Monitoring Email Sending

### Console Messages

After configuration, you'll see:

**On page load:**
```
✓ EmailJS initialized successfully
```

**During calculation:**
```
✓ Calculation results sent successfully to mehdiakbar905@gmail.com
```

**If there's an error:**
```
Error sending calculation results: [error details]
```

### EmailJS Dashboard Monitoring

1. Go to https://www.emailjs.com/
2. Dashboard → Activity
3. See all emails sent with:
   - Timestamp
   - Template used
   - Status (Success/Failed)
   - Error details (if any)

### Gmail Monitoring

1. Login to mehdiakbar905@gmail.com
2. Check inbox for emails from `noreply@emailjs.com`
3. Subject pattern: `New Loan Calculator Result - [Loan Type]`

---

## Reset / Troubleshooting

### To Reset Configuration
1. Clear browser cache (Ctrl+Shift+Delete)
2. Reload page (F5)
3. Check console for initialization message
4. Try another calculation

### To Verify Public Key is Correct
In browser console (F12 → Console), type:
```javascript
console.log(window.sendCalculationResultsEmail);
```

Should show: `ƒ (calculationData, loanCategory, loanPurpose, formInputs)`

If it shows `undefined`, then `email-service.js` failed to load.

### To Debug Email Sending
In browser console, add this before doing a calculation:
```javascript
// Enable debug logging
window.DEBUG_EMAIL = true;
```

Then complete a calculation and watch console for detailed logging.

---

## Summary

**Minimum steps:**
1. Get Public Key from EmailJS
2. Copy key to `js/email-service.js` line 12
3. Save file
4. Test

**That's it!** ✅

---

**Version:** 1.0
**Last Updated:** December 29, 2025
