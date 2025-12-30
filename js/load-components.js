/**
 * Load Header aur Footer dynamically on pages
 * Har page mein isi function ko call kren
 */

// Helper function: fix relative paths in loaded HTML based on current page location
function fixPathsInHTML(html, isSubfolder) {
  if (!isSubfolder) {
    // For index.html (root level), keep paths as is or change ../ to ./
    return html.replace(/\.\.\//g, './');
  }
  // For pages in subfolders, paths stay as ../
  return html;
}

// Navbar/Header ko load krey
function loadHeader(containerId = 'header-container') {
  // Check if current page is in a subfolder
  const isSubfolder = window.location.pathname.includes('/main-pages/') || 
                      window.location.pathname.includes('/pages/') ||
                      window.location.pathname.includes('/commercial-pages/') ||
                      window.location.pathname.includes('/smsf-pages/');
  
  const basePath = isSubfolder ? '../' : './';
  
  fetch(basePath + 'navbar-only.html')
    .then(response => response.text())
    .then(html => {
      // Fix paths in the loaded HTML
      html = fixPathsInHTML(html, isSubfolder);
      
      const container = document.getElementById(containerId) || document.body.insertAdjacentElement('afterbegin', document.createElement('div'));
      if (!document.getElementById(containerId)) {
        container.id = containerId;
      }
      container.innerHTML = html;
      
      // Header ke scripts ko initialize krey
      initializeHeaderFunctionality();
      // If available, attach dropdown click/touch handlers (for mobile) added by eventListeners.js
      if (typeof initNavbarDropdowns === 'function') initNavbarDropdowns();
      // Prevent tapping the dropdown toggle from immediately closing the mobile menu
      // and attach mobile click/touch handlers that toggle the dropdown menu.
      try {
        const dropdownToggles = (container || document).querySelectorAll('.dropdown-toggle');
        dropdownToggles.forEach(btn => {
          btn.addEventListener('click', function (e) {
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) return; // let desktop clicks be ignored (hover handles it)
            try { e.preventDefault(); } catch (err) {}
            try { e.stopPropagation(); } catch (err) {}
            const menu = btn.nextElementSibling;
            if (!menu) return;
            const isActive = menu.classList.contains('active');
            if (!isActive) {
              // close other dropdowns
              document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('active'));
              menu.classList.add('active');
              btn.setAttribute('aria-expanded', 'true');
            } else {
              menu.classList.remove('active');
              btn.setAttribute('aria-expanded', 'false');
            }
          }, { passive: false });

          // Handle touchstart for responsiveness on some devices
          btn.addEventListener('touchstart', function (e) {
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) return;
            try { e.preventDefault(); } catch (err) {}
            try { e.stopPropagation(); } catch (err) {}
            const menu = btn.nextElementSibling;
            if (!menu) return;
            const isActive = menu.classList.contains('active');
            if (!isActive) {
              document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('active'));
              menu.classList.add('active');
              btn.setAttribute('aria-expanded', 'true');
            } else {
              menu.classList.remove('active');
              btn.setAttribute('aria-expanded', 'false');
            }
          }, { passive: false });
        });
      } catch (err) { /* ignore if header markup not present */ }
    })
    .catch(error => console.error('Error loading header:', error));
}

// Footer ko load krey
function loadFooter(containerId = 'footer-container') {
  const isSubfolder = window.location.pathname.includes('/main-pages/') || 
                      window.location.pathname.includes('/pages/') ||
                      window.location.pathname.includes('/commercial-pages/') ||
                      window.location.pathname.includes('/smsf-pages/');
  
  const basePath = isSubfolder ? '../' : './';
  
  fetch(basePath + 'footer-only.html')
    .then(response => response.text())
    .then(html => {
      // Fix paths in the loaded HTML
      html = fixPathsInHTML(html, isSubfolder);
      
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
      }
      container.innerHTML = html;
    })
    .catch(error => console.error('Error loading footer:', error));
}

// Header functionality (hamburger menu, dropdowns etc)
function initializeHeaderFunctionality() {
  const hamburger = document.getElementById('hamburger');
  const navbar = document.getElementById('navbar');

  if (hamburger) {
    hamburger.addEventListener('click', function () {
      navbar.classList.toggle('active');
      hamburger.classList.toggle('active');
    });
  }

  // Close menu when link is clicked (ignore clicks on dropdown toggles)
  const navLinks = document.querySelectorAll('.nav-link:not(.dropdown-toggle)');
  navLinks.forEach(link => {
    link.addEventListener('click', function () {
      if (navbar) {
        navbar.classList.remove('active');
      }
      if (hamburger) {
        hamburger.classList.remove('active');
      }
    });
  });
}

// Page load par automatically header aur footer load kr
document.addEventListener('DOMContentLoaded', function () {
  // Agar page mein header-container div nahi ho to automatically create kr
  if (!document.getElementById('header-container')) {
    const headerDiv = document.createElement('div');
    headerDiv.id = 'header-container';
    document.body.insertBefore(headerDiv, document.body.firstChild);
  }
  
  loadHeader('header-container');
  loadFooter('footer-container');
});
