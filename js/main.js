// WorkforceAP Static Site - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    function normalizeProgramCategory(label) {
        const value = label.toLowerCase().trim();
        if (!value || value.includes('all program')) return 'all';
        if (value.includes('digital literacy')) return 'digital-literacy';
        if (value.includes('ai')) return 'ai-software';
        if (value.includes('cloud') || value.includes('data')) return 'cloud-data';
        if (value.includes('cyber') || value.includes('it')) return 'it-cyber';
        if (value.includes('business')) return 'business';
        if (value.includes('health')) return 'healthcare';
        if (value.includes('manufacturing')) return 'manufacturing';
        return value.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function revealLazyImages() {
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');

        lazyImages.forEach(function(img) {
            const markLoaded = function() {
                img.classList.add('loaded');
            };

            if (img.complete) {
                markLoaded();
                return;
            }

            img.addEventListener('load', markLoaded, { once: true });
            img.addEventListener('error', markLoaded, { once: true });
        });
    }

    function setupProgramFilters() {
        const cards = Array.from(document.querySelectorAll('.program-card'));
        if (!cards.length) return;

        const filterBar = document.querySelector('.content-section .container > div');
        if (!filterBar) return;

        const filterChips = Array.from(filterBar.children).filter(function(child) {
            return child.tagName === 'SPAN';
        });

        if (!filterChips.length) return;

        filterBar.classList.add('program-filter-bar');

        cards.forEach(function(card) {
            const categoryBadge = card.querySelector('div span');
            const categoryLabel = categoryBadge ? categoryBadge.textContent : '';
            card.dataset.category = normalizeProgramCategory(categoryLabel);
        });

        function applyFilter(filterValue) {
            filterChips.forEach(function(chip) {
                const isActive = chip.dataset.filter === filterValue;
                chip.classList.toggle('active', isActive);
                chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });

            cards.forEach(function(card) {
                const isVisible = filterValue === 'all' || card.dataset.category === filterValue;
                card.classList.toggle('is-hidden', !isVisible);
            });
        }

        filterChips.forEach(function(chip) {
            const label = chip.textContent.replace(/\(\d+\)/, '').trim();
            chip.classList.add('program-filter-chip');
            chip.dataset.filter = normalizeProgramCategory(label);
            chip.setAttribute('role', 'button');
            chip.setAttribute('tabindex', '0');

            chip.addEventListener('click', function() {
                applyFilter(chip.dataset.filter);
            });

            chip.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    applyFilter(chip.dataset.filter);
                }
            });
        });

        applyFilter('all');
    }

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

    revealLazyImages();
    setupProgramFilters();
});
