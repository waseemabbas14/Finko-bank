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

  // Close menu when link is clicked
  const navLinks = document.querySelectorAll('.nav-link');
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
