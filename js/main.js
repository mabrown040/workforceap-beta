document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const dropdowns = document.querySelectorAll('.dropdown');
    
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = navMenu.classList.toggle('mobile-open');
            mobileToggle.setAttribute('aria-expanded', isOpen);
            mobileToggle.textContent = isOpen ? '\u2715' : '\u2630';
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });
    }
    
    dropdowns.forEach(dropdown => {
        const dropdownSpan = dropdown.querySelector('span');
        if (dropdownSpan) {
            dropdownSpan.addEventListener('click', function(e) {
                if (window.innerWidth <= 900) {
                    e.preventDefault();
                    e.stopPropagation();
                    dropdowns.forEach(d => {
                        if (d !== dropdown) d.classList.remove('active');
                    });
                    dropdown.classList.toggle('active');
                }
            });
        }
    });
    
    document.addEventListener('click', function(e) {
        if (navMenu && navMenu.classList.contains('mobile-open')) {
            if (!e.target.closest('.main-nav')) {
                navMenu.classList.remove('mobile-open');
                if (mobileToggle) {
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    mobileToggle.textContent = '\u2630';
                }
                document.body.style.overflow = '';
            }
        }
    });
    
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (navMenu) {
                navMenu.classList.remove('mobile-open');
                if (mobileToggle) {
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    mobileToggle.textContent = '\u2630';
                }
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
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    
    // --- ENHANCED SCROLL-TRIGGERED ANIMATIONS ---
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -80px 0px',
        threshold: 0.08
    };
    
    const animateObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var delay = entry.target.dataset.delay || 0;
                setTimeout(function() {
                    entry.target.classList.add('visible');
                }, delay);
                animateObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Add scroll animations to major content elements
    var animatableSelectors = [
        '.animate-on-scroll',
        '.program-card',
        '.mv-card',
        '.value-card',
        '.track',
        '.career-track',
        '.testimonial-card',
        '.stat-card',
        '.faq-item',
        '.leader-card',
        '.contact-item',
        '.process-step',
        '.vm-content',
        '.vm-image',
        '.about-content',
        '.programs-preview',
        '.photo-highlight-content'
    ];
    
    var allAnimatable = document.querySelectorAll(animatableSelectors.join(','));
    allAnimatable.forEach(function(el, index) {
        if (!el.classList.contains('animate-on-scroll')) {
            el.classList.add('animate-on-scroll');
        }
        el.dataset.delay = Math.min(index % 6, 5) * 80;
        animateObserver.observe(el);
    });
    
    // Also animate section headers
    document.querySelectorAll('.section-label, .section-title, .section-subtitle, .overline').forEach(function(el) {
        if (!el.classList.contains('animate-on-scroll') && !el.closest('.animate-on-scroll')) {
            el.classList.add('animate-on-scroll');
            el.dataset.delay = 0;
            animateObserver.observe(el);
        }
    });
    
    // --- GLASS NAV ON SCROLL ---
    var nav = document.querySelector('.main-nav');
    if (nav) {
        var lastScroll = 0;
        var scrollThreshold = 60;
        window.addEventListener('scroll', function() {
            var currentScroll = window.pageYOffset;
            if (currentScroll > scrollThreshold) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            lastScroll = currentScroll;
        }, { passive: true });
        
        if (window.pageYOffset > scrollThreshold) {
            nav.classList.add('scrolled');
        }
    }
    
    // --- ENHANCED COUNTER ANIMATION ---
    function animateCounter(element, target, suffix, duration) {
        var start = 0;
        var startTime = null;
        
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 4);
            var current = Math.round(eased * target);
            element.textContent = current + (suffix || '');
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                element.textContent = target + (suffix || '');
            }
        }
        requestAnimationFrame(step);
    }
    
    var counterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var el = entry.target;
                var text = el.textContent.trim();
                var suffix = text.replace(/[0-9,]/g, '');
                var num = parseInt(text.replace(/[^0-9]/g, ''));
                if (!isNaN(num) && num > 0 && num < 10000) {
                    el.textContent = '0' + suffix;
                    setTimeout(function() {
                        animateCounter(el, num, suffix, 1800);
                    }, 200);
                }
                counterObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    
    document.querySelectorAll('.stat-number, .impact-number, .stat-num').forEach(function(el) {
        counterObserver.observe(el);
    });

    // --- PROGRAM FILTER CHIPS ---
    var filterChips = document.querySelectorAll('.filter-chip[data-filter]');
    var programCards = document.querySelectorAll('.program-card[data-category]');
    if (filterChips.length && programCards.length) {
        filterChips.forEach(function(chip) {
            chip.addEventListener('click', function() {
                filterChips.forEach(function(c) { c.classList.remove('active'); });
                chip.classList.add('active');
                var filter = chip.getAttribute('data-filter');
                programCards.forEach(function(card) {
                    if (filter === 'all' || card.getAttribute('data-category') === filter) {
                        card.style.display = '';
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        requestAnimationFrame(function() {
                            requestAnimationFrame(function() {
                                card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                                card.style.opacity = '1';
                                card.style.transform = 'translateY(0)';
                            });
                        });
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(10px)';
                        setTimeout(function() { card.style.display = 'none'; }, 300);
                    }
                });
            });
        });
    }

    // --- FAQ CATEGORY FILTERS ---
    var faqFilters = document.querySelectorAll('.faq-filter[data-category]');
    var faqItems = document.querySelectorAll('.faq-item[data-category]');
    if (faqFilters.length && faqItems.length) {
        faqFilters.forEach(function(btn) {
            btn.addEventListener('click', function() {
                faqFilters.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var cat = btn.getAttribute('data-category');
                faqItems.forEach(function(item) {
                    item.style.display = (cat === 'all' || item.getAttribute('data-category') === cat) ? '' : 'none';
                });
            });
        });
    }

    // --- REVEAL CLASS SUPPORT ---
    document.querySelectorAll('.reveal').forEach(function(el) {
        if (!el.classList.contains('animate-on-scroll')) {
            el.classList.add('animate-on-scroll');
            animateObserver.observe(el);
        }
    });

    // --- PARALLAX FOR PHOTO HIGHLIGHT ---
    var photoHighlights = document.querySelectorAll('.photo-highlight-bg');
    if (photoHighlights.length) {
        window.addEventListener('scroll', function() {
            var scrolled = window.pageYOffset;
            photoHighlights.forEach(function(bg) {
                var parent = bg.parentElement;
                var parentTop = parent.offsetTop;
                var parentHeight = parent.offsetHeight;
                if (scrolled + window.innerHeight > parentTop && scrolled < parentTop + parentHeight) {
                    var yPos = (scrolled - parentTop) * 0.2;
                    bg.style.transform = 'translateY(' + yPos + 'px) scale(1.08)';
                }
            });
        }, { passive: true });
    }
    
    // --- SMOOTH HOVER TILT FOR CARDS (subtle) ---
    document.querySelectorAll('.program-card, .mv-card, .value-card, .track').forEach(function(card) {
        card.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    });
    
    // --- LAZY IMAGE LOADING WITH SMOOTH FADE ---
    var lazyImages = document.querySelectorAll('img[loading="lazy"]');
    lazyImages.forEach(function(img) {
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.style.opacity = '0';
            img.addEventListener('load', function() {
                img.style.transition = 'opacity 0.5s ease';
                img.style.opacity = '1';
                img.classList.add('loaded');
            });
            img.addEventListener('error', function() {
                img.style.opacity = '1';
                img.classList.add('loaded');
            });
        }
    });
});

// Backup scroll reveal for elements that might load late
document.addEventListener('DOMContentLoaded', function() {
    var reveals = document.querySelectorAll('.reveal, .animate-on-scroll');
    
    var revealOnScroll = function() {
        reveals.forEach(function(element) {
            var windowHeight = window.innerHeight;
            var elementTop = element.getBoundingClientRect().top;
            var revealPoint = 120;
            
            if (elementTop < windowHeight - revealPoint) {
                element.classList.add('visible');
            }
        });
    };
    
    window.addEventListener('scroll', revealOnScroll, { passive: true });
    revealOnScroll();
});
