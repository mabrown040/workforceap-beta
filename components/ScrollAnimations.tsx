'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const animatableSelectors = [
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
  '.photo-highlight-content',
];

function animateCounter(element: HTMLElement, target: number, suffix: string, duration: number) {
  let startTime: number | null = null;
  function step(timestamp: number) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const current = Math.round(eased * target);
    element.textContent = current + (suffix || '');
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = target + (suffix || '');
    }
  }
  requestAnimationFrame(step);
}

export default function ScrollAnimations() {
  const pathname = usePathname();

  useEffect(() => {
    const animateObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = Number((entry.target as HTMLElement).dataset.delay) || 0;
            setTimeout(() => entry.target.classList.add('visible'), delay);
            animateObserver.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px 0px -80px 0px', threshold: 0.08 }
    );

    const selectorList = animatableSelectors.join(',');

    const observeAnimatable = (el: Element, index: number) => {
      if (!el.classList.contains('animate-on-scroll')) {
        el.classList.add('animate-on-scroll');
      }
      const htmlEl = el as HTMLElement;
      if (!htmlEl.dataset.delay) {
        htmlEl.dataset.delay = String(Math.min(index % 6, 5) * 80);
      }
      if (!el.classList.contains('visible')) {
        animateObserver.observe(el);
      }
    };

    const allAnimatable = document.querySelectorAll(selectorList);
    allAnimatable.forEach((el, index) => observeAnimatable(el, index));

    document.querySelectorAll('.section-label, .section-title, .section-subtitle, .overline').forEach((el) => {
      if (!el.classList.contains('animate-on-scroll') && !el.closest('.animate-on-scroll')) {
        el.classList.add('animate-on-scroll');
        (el as HTMLElement).dataset.delay = '0';
        animateObserver.observe(el);
      }
    });

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const text = el.textContent?.trim() || '';
            const suffix = text.replace(/[0-9,]/g, '');
            const num = parseInt(text.replace(/[^0-9]/g, ''));
            if (!isNaN(num) && num > 0 && num < 10000) {
              el.textContent = '0' + suffix;
              setTimeout(() => animateCounter(el, num, suffix, 1800), 200);
            }
            counterObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );

    document.querySelectorAll('.stat-number, .impact-number, .stat-num').forEach((el) => {
      const raw = el.textContent?.trim() || '';
      if (/[–\-/]/.test(raw.replace(/[^–\-/]/g, '')) && /\d.*[–\-/].*\d/.test(raw)) return;
      counterObserver.observe(el);
    });

    const photoHighlights = document.querySelectorAll<HTMLElement>('.photo-highlight-bg');
    const onScroll = () => {
      const scrolled = window.pageYOffset;
      photoHighlights.forEach((bg) => {
        const parent = bg.parentElement;
        if (!parent) return;
        const parentTop = parent.offsetTop;
        const parentHeight = parent.offsetHeight;
        if (scrolled + window.innerHeight > parentTop && scrolled < parentTop + parentHeight) {
          const yPos = (scrolled - parentTop) * 0.2;
          bg.style.transform = `translateY(${yPos}px) scale(1.08)`;
        }
      });
    };

    if (photoHighlights.length) {
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    document.querySelectorAll('.reveal').forEach((el) => {
      if (!el.classList.contains('animate-on-scroll')) {
        el.classList.add('animate-on-scroll');
        animateObserver.observe(el);
      }
    });

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;

          if (node.matches(selectorList)) {
            observeAnimatable(node, 0);
          }

          node.querySelectorAll(selectorList).forEach((el, index) => {
            observeAnimatable(el, index);
          });

          node.querySelectorAll('.section-label, .section-title, .section-subtitle, .overline').forEach((el) => {
            if (!el.classList.contains('animate-on-scroll') && !el.closest('.animate-on-scroll')) {
              el.classList.add('animate-on-scroll');
              (el as HTMLElement).dataset.delay = '0';
              animateObserver.observe(el);
            }
          });
        });
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      animateObserver.disconnect();
      counterObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [pathname]);

  return null;
}
