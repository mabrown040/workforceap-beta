// WorkforceAP Static Site — Main JavaScript

document.addEventListener('DOMContentLoaded', function () {

    /* =============================================
       MOBILE NAVIGATION
       ============================================= */
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const navMenu      = document.querySelector('.nav-menu');
    const dropdowns    = document.querySelectorAll('.dropdown');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            const isOpen = navMenu.classList.toggle('mobile-open');
            mobileToggle.setAttribute('aria-expanded', isOpen);
            mobileToggle.textContent = isOpen ? '\u2715' : '\u2630';
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });
    }

    // Mobile: tap dropdown span to expand sub-menu
    dropdowns.forEach(function (dropdown) {
        const span = dropdown.querySelector('span');
        if (span) {
            span.addEventListener('click', function (e) {
                if (window.innerWidth <= 900) {
                    e.preventDefault();
                    e.stopPropagation();
                    dropdown.classList.toggle('active');
                }
            });
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
        if (navMenu && navMenu.classList.contains('mobile-open')) {
            if (!e.target.closest('.main-nav')) {
                closeMenu();
            }
        }
    });

    // Close menu when clicking a nav link
    document.querySelectorAll('.nav-menu a').forEach(function (link) {
        link.addEventListener('click', function () {
            if (navMenu) closeMenu();
        });
    });

    function closeMenu() {
        if (!navMenu) return;
        navMenu.classList.remove('mobile-open');
        if (mobileToggle) {
            mobileToggle.setAttribute('aria-expanded', 'false');
            mobileToggle.textContent = '\u2630';
        }
        document.body.style.overflow = '';
    }

    /* =============================================
       SMOOTH SCROLL
       ============================================= */
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    /* =============================================
       SCROLL REVEAL ANIMATION
       ============================================= */
    const revealElements = document.querySelectorAll('.reveal');

    if (revealElements.length > 0 && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        revealElements.forEach(function (el) {
            revealObserver.observe(el);
        });
    } else {
        // Fallback: make everything visible immediately
        revealElements.forEach(function (el) {
            el.classList.add('visible');
        });
    }

    /* =============================================
       COUNTER ANIMATION (Stats Bar)
       ============================================= */
    function animateCounter(el, target, duration, suffix) {
        const start = performance.now();
        const isNumber = !isNaN(parseFloat(target));
        if (!isNumber) return; // Skip non-numeric like "No Cost"

        const numTarget = parseFloat(target);
        const decimals  = (target.toString().indexOf('.') >= 0)
            ? target.toString().split('.')[1].length : 0;

        function step(now) {
            const elapsed  = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const value  = (numTarget * eased).toFixed(decimals);
            el.textContent = value + suffix;
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    const statNumbers = document.querySelectorAll('.stat-number[data-count]');
    if (statNumbers.length > 0 && 'IntersectionObserver' in window) {
        const counterObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    const el     = entry.target;
                    const target = el.getAttribute('data-count');
                    const suffix = el.getAttribute('data-suffix') || '';
                    animateCounter(el, target, 1600, suffix);
                    counterObserver.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        statNumbers.forEach(function (el) {
            counterObserver.observe(el);
        });
    }

    /* =============================================
       IMAGE FADE-IN (for .img-fade class)
       ============================================= */
    const fadeImages = document.querySelectorAll('img.img-fade');
    if (fadeImages.length > 0) {
        if ('IntersectionObserver' in window) {
            const imgObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.complete) {
                            img.classList.add('loaded');
                        } else {
                            img.addEventListener('load', function () {
                                img.classList.add('loaded');
                            });
                            img.addEventListener('error', function () {
                                img.classList.add('loaded'); // show broken img icon
                            });
                        }
                        imgObserver.unobserve(img);
                    }
                });
            }, { rootMargin: '200px 0px' });

            fadeImages.forEach(function (img) {
                imgObserver.observe(img);
            });
        } else {
            fadeImages.forEach(function (img) {
                img.classList.add('loaded');
            });
        }
    }

    /* =============================================
       STICKY NAV SCROLL STYLE
       ============================================= */
    const mainNav = document.querySelector('.main-nav');
    if (mainNav) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 60) {
                mainNav.style.boxShadow = '0 2px 20px rgba(0,0,0,0.25)';
            } else {
                mainNav.style.boxShadow = '';
            }
        }, { passive: true });
    }

    /* =============================================
       PROGRAM FILTER CHIPS (Programs Page)
       ============================================= */
    const filterChips = document.querySelectorAll('.filter-chip[data-filter]');
    const programCards = document.querySelectorAll('.program-card[data-category]');

    if (filterChips.length && programCards.length) {
        filterChips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                const filter = chip.getAttribute('data-filter');
                programCards.forEach(function (card) {
                    if (filter === 'all') {
                        card.style.display = '';
                    } else {
                        card.style.display = card.getAttribute('data-category') === filter ? '' : 'none';
                    }
                });
            });
        });
    }

    /* =============================================
       FAQ CATEGORY FILTERS
       ============================================= */
    const faqFilters = document.querySelectorAll('.faq-filter[data-category]');
    const faqItems   = document.querySelectorAll('.faq-item[data-category]');

    if (faqFilters.length && faqItems.length) {
        faqFilters.forEach(function (btn) {
            btn.addEventListener('click', function () {
                faqFilters.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const cat = btn.getAttribute('data-category');
                faqItems.forEach(function (item) {
                    item.style.display = (cat === 'all' || item.getAttribute('data-category') === cat)
                        ? '' : 'none';
                });
            });
        });
    }
});
