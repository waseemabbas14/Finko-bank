# Finco Capital - Project Structure

## Overview
Your calculator project has been reorganized into a **modular structure** for better maintainability, scalability, and clean code organization.

---

## 📁 Directory Structure

```
calculator-with-modules/
├── index.html                      # Main entry point
├── assests/                        # Static assets (images, icons)
├── css/
│   └── calnew.css                 # Main stylesheet
├── js/
│   ├── constants.js               # Global constants & configurations
│   ├── utils.js                   # Utility helper functions
│   ├── calculations.js            # Core calculation logic (LMI, repayments)
│   ├── ui.js                      # UI rendering & DOM manipulation
│   ├── home_extras.js             # Home loan specific features
│   ├── eventListeners.js          # Event handlers & interactions
│   ├── commercial_financial.js    # Commercial loan financial calculations
│   └── smsf_financial.js          # SMSF loan financial calculations
├── pages/                          # HTML pages (loan type pages)
│   ├── banks-info.html
│   ├── commercial-loan.html
│   ├── home-*.html                # Various home loan pages
│   ├── smsf-loan.html
│   └── ... (other specialized pages)
├── commercial-pages/              # Commercial page components
├── home-pages/                    # Home loan page components
├── smsf-pages/                    # SMSF page components
└── home/                          # Home related resources
```

---

## 🔧 Module Descriptions

### **js/ (JavaScript Modules)**

| Module | Purpose | Exports |
|--------|---------|---------|
| `constants.js` | Global constants, LMI rates, configurations | Config objects, rates lookup |
| `utils.js` | Reusable utility functions | number formatting, parsing helpers |
| `calculations.js` | Core financial calculations | LMI, repayments, loan scenarios |
| `ui.js` | DOM rendering & visual updates | DOM update functions, formatters |
| `home_extras.js` | Home loan specific logic | Home loan calculations, state-based rules |
| `eventListeners.js` | Event handling & user interactions | Event setup & handlers |
| `commercial_financial.js` | Commercial loan analysis | Commercial loan calculations |
| `smsf_financial.js` | SMSF loan analysis | SMSF calculations |

### **css/ (Stylesheets)**
- `calnew.css` - Main stylesheet for all pages

### **pages/ (HTML Pages)**
- Individual loan product pages (organized by loan type)
- Can be served dynamically or as static pages

---

## 🚀 Load Order (Important!)

The scripts load in this specific order (see `index.html`):
```html
<script src="js/constants.js" defer></script>      <!-- 1. Constants first -->
<script src="js/utils.js" defer></script>          <!-- 2. Utilities -->
<script src="js/calculations.js" defer></script>   <!-- 3. Calculations -->
<script src="js/ui.js" defer></script>             <!-- 4. UI rendering -->
<script src="js/home_extras.js" defer></script>    <!-- 5. Home loan features -->
<script src="js/eventListeners.js" defer></script> <!-- 6. Event setup -->
<script src="js/commercial_financial.js" defer></script> <!-- 7. Commercial -->
<script src="js/smsf_financial.js" defer></script>      <!-- 8. SMSF -->
```

**⚠️ Do NOT change this order!** Each module depends on previous ones.

---

## 📋 Benefits of This Structure

✅ **Modularity** - Each module has a single responsibility  
✅ **Maintainability** - Easier to find and update code  
✅ **Scalability** - Easy to add new loan types  
✅ **Separation of Concerns** - Logic, UI, and styling are separate  
✅ **Code Reusability** - Shared utilities in one place  
✅ **Better Performance** - Only load what's needed  

---

## 🔗 File References

All file paths have been updated in `index.html`:
- CSS: `href="css/calnew.css"`
- JS: `src="js/[filename].js"`

If you add new modules, update the script tags accordingly.

---

## 🛠️ Adding New Features

### To add a new loan type module:
1. Create new file in `js/` (e.g., `js/new_loan_type.js`)
2. Add to `index.html` after the relevant module:
   ```html
   <script src="js/new_loan_type.js" defer></script>
   ```
3. Create HTML pages in `pages/` if needed

### To add new styles:
1. Add to `css/calnew.css` OR
2. Create a new CSS file in `css/` and link it in `index.html`:
   ```html
   <link rel="stylesheet" href="css/new_styles.css" />
   ```

---

## 📝 Notes

- Images are stored in `assests/` (note the spelling - keep it as is)
- The `home/`, `commercial-pages/`, `home-pages/`, and `smsf-pages/` directories contain page-specific components
- All path references in JavaScript assume files are in their organized locations
- The project uses `defer` attribute on scripts for optimal loading

---

**Last Updated:** December 24, 2025  
**Structure Version:** 2.0 (Modular)
