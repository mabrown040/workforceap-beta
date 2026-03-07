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
    
    // Scroll-triggered animations
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1
    };
    
    const animateObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry, index) {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(function() {
                    entry.target.classList.add('visible');
                }, delay);
                animateObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.animate-on-scroll').forEach(function(el, index) {
        el.dataset.delay = Math.min(index % 4, 3) * 100;
        animateObserver.observe(el);
    });
    
    // Lazy image loading with fade-in
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    lazyImages.forEach(function(img) {
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', function() {
                img.classList.add('loaded');
            });
            img.addEventListener('error', function() {
                img.classList.add('loaded');
            });
        }
    });
    
    // Navbar background on scroll
    const nav = document.querySelector('.main-nav');
    if (nav) {
        var lastScroll = 0;
        window.addEventListener('scroll', function() {
            var currentScroll = window.pageYOffset;
            if (currentScroll > 100) {
                nav.style.boxShadow = '0 2px 20px rgba(0,0,0,0.3)';
            } else {
                nav.style.boxShadow = 'none';
            }
            lastScroll = currentScroll;
        }, { passive: true });
    }
    
    // Counter animation for stat numbers
    function animateCounter(element, target, duration) {
        var start = 0;
        var startTime = null;
        var isNumber = !isNaN(target);
        
        if (!isNumber) return;
        
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(eased * target);
            element.textContent = current;
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                element.textContent = target;
            }
        }
        requestAnimationFrame(step);
    }
    
    var counterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var el = entry.target;
                var text = el.textContent.trim();
                var num = parseInt(text.replace(/[^0-9]/g, ''));
                if (!isNaN(num) && num > 0 && num < 1000) {
                    animateCounter(el, num, 1500);
                }
                counterObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    
    document.querySelectorAll('.stat-number[data-count], .impact-number').forEach(function(el) {
        counterObserver.observe(el);
    });

    // Parallax for photo highlight
    var photoHighlight = document.querySelector('.photo-highlight-bg');
    if (photoHighlight) {
        window.addEventListener('scroll', function() {
            var scrolled = window.pageYOffset;
            var parent = photoHighlight.parentElement;
            var parentTop = parent.offsetTop;
            var parentHeight = parent.offsetHeight;
            if (scrolled + window.innerHeight > parentTop && scrolled < parentTop + parentHeight) {
                var yPos = (scrolled - parentTop) * 0.3;
                photoHighlight.style.transform = 'translateY(' + yPos + 'px) scale(1.1)';
            }
        }, { passive: true });
    }
});
