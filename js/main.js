// WorkforceAP Static Site - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const dropdowns = document.querySelectorAll('.dropdown');
    
    // Toggle mobile menu
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = navMenu.classList.toggle('mobile-open');
            mobileToggle.setAttribute('aria-expanded', isOpen);
            mobileToggle.textContent = isOpen ? '\u2715' : '\u2630';
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });
    }
    
    // Handle dropdowns on mobile - only toggle when clicking the span
    dropdowns.forEach(dropdown => {
        const dropdownSpan = dropdown.querySelector('span');
        if (dropdownSpan) {
            dropdownSpan.addEventListener('click', function(e) {
                if (window.innerWidth <= 900) {
                    e.preventDefault();
                    e.stopPropagation();
                    dropdown.classList.toggle('active');
                }
            });
        }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (navMenu && navMenu.classList.contains('mobile-open')) {
            if (!e.target.closest('.main-nav')) {
                navMenu.classList.remove('mobile-open');
                mobileToggle.setAttribute('aria-expanded', 'false');
                mobileToggle.textContent = '\u2630';
                document.body.style.overflow = '';
            }
        }
    });
    
    // Close menu when clicking a link
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (navMenu) {
                navMenu.classList.remove('mobile-open');
                mobileToggle.setAttribute('aria-expanded', 'false');
                mobileToggle.textContent = '\u2630';
                document.body.style.overflow = '';
            }
        });
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
