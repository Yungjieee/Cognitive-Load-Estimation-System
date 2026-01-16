// ================================
// CLES Website JavaScript
// ================================

// ========== DOM Elements ==========
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');
const watchVideoBtn = document.getElementById('watchVideoBtn');
const videoModal = document.getElementById('videoModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalVideo = document.getElementById('modalVideo');
const tabBtns = document.querySelectorAll('.tab-btn');
const faqItems = document.querySelectorAll('.faq-item');
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

// ========== Navbar Scroll Effect ==========
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add scrolled class for shadow effect
    if (currentScroll > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// ========== Mobile Navigation Toggle ==========
navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// ========== Smooth Scroll & Active Nav Link ==========
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('.section, .hero');

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (window.pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ========== Video Modal ==========
watchVideoBtn.addEventListener('click', () => {
    videoModal.classList.add('active');
    modalVideo.play();
});

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

function closeModal() {
    videoModal.classList.remove('active');
    modalVideo.pause();
    modalVideo.currentTime = 0;
}

// Close modal with ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal.classList.contains('active')) {
        closeModal();
    }
});

// ========== Use Cases Tabs ==========
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');

        // Remove active class from all buttons and panels
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Add active class to clicked button and corresponding panel
        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

// ========== FAQ Accordion ==========
faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close all FAQ items
        faqItems.forEach(faq => faq.classList.remove('active'));

        // Open clicked item if it wasn't active
        if (!isActive) {
            item.classList.add('active');
        }
    });
});

// ========== Contact Form ==========
contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Get form values
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        organization: document.getElementById('organization').value,
        sector: document.getElementById('sector').value,
        message: document.getElementById('message').value
    };

    // Simulate form submission (replace with actual API call)
    console.log('Form submitted:', formData);

    // Show success message
    contactForm.style.display = 'none';
    formSuccess.classList.add('active');

    // Reset form after 3 seconds
    setTimeout(() => {
        contactForm.reset();
        contactForm.style.display = 'block';
        formSuccess.classList.remove('active');
    }, 5000);
});

// ========== Intersection Observer for Animations ==========
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('aos-animate');
        }
    });
}, observerOptions);

// Observe all elements with data-aos attribute
document.querySelectorAll('[data-aos]').forEach(el => {
    observer.observe(el);
});

// ========== Video Play on Scroll (Timeline Videos) ==========
const timelineVideos = document.querySelectorAll('.timeline-item video');

const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const video = entry.target;

        if (entry.isIntersecting) {
            // Autoplay when in view (muted)
            video.muted = true;
            video.play().catch(e => console.log('Autoplay prevented:', e));
        } else {
            // Pause when out of view
            video.pause();
        }
    });
}, {
    threshold: 0.5
});

timelineVideos.forEach(video => {
    videoObserver.observe(video);

    // Unmute when user clicks play
    video.addEventListener('play', () => {
        if (video.muted && !video.hasAttribute('data-user-interaction')) {
            // First autoplay - keep muted
            return;
        }
        video.muted = false;
    });

    video.addEventListener('click', () => {
        video.setAttribute('data-user-interaction', 'true');
    });
});

// ========== Animated Counter (Stats) ==========
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16); // 60fps

    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = Math.round(target);
            clearInterval(timer);
        } else {
            element.textContent = Math.round(start);
        }
    }, 16);
}

// Observe stat numbers for counter animation
const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
            const target = parseInt(entry.target.getAttribute('data-count'));
            animateCounter(entry.target, target);
            entry.target.classList.add('counted');
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(el => {
    statObserver.observe(el);
});

// ========== Parallax Effect for Hero ==========
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroVideo = document.querySelector('.hero-video');

    if (heroVideo && scrolled < window.innerHeight) {
        heroVideo.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// ========== Lazy Load Videos ==========
const lazyVideos = document.querySelectorAll('video[data-src]');

const lazyVideoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const video = entry.target;
            video.src = video.getAttribute('data-src');
            video.load();
            video.removeAttribute('data-src');
            lazyVideoObserver.unobserve(video);
        }
    });
});

lazyVideos.forEach(video => {
    lazyVideoObserver.observe(video);
});

// ========== Back to Top Button (Optional) ==========
const createBackToTop = () => {
    const btn = document.createElement('button');
    btn.id = 'backToTop';
    btn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
    `;
    btn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #A855F7 0%, #EC4899 100%);
        color: white;
        border: none;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3);
        transition: all 0.3s;
        z-index: 999;
    `;

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-4px)';
        btn.style.boxShadow = '0 8px 30px rgba(168, 85, 247, 0.4)';
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 4px 20px rgba(168, 85, 247, 0.3)';
    });

    document.body.appendChild(btn);

    // Show/hide based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 500) {
            btn.style.display = 'flex';
        } else {
            btn.style.display = 'none';
        }
    });
};

// Initialize back to top button
createBackToTop();

// ========== Form Validation ==========
const inputs = document.querySelectorAll('.form-group input, .form-group textarea, .form-group select');

inputs.forEach(input => {
    input.addEventListener('blur', () => {
        if (input.value.trim() === '' && input.hasAttribute('required')) {
            input.style.borderColor = '#DC2626';
        } else {
            input.style.borderColor = '';
        }
    });

    input.addEventListener('focus', () => {
        input.style.borderColor = '#A855F7';
    });
});

// Email validation
const emailInput = document.getElementById('email');
emailInput.addEventListener('blur', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value)) {
        emailInput.style.borderColor = '#DC2626';
    }
});

// ========== Prevent Default Form Submission ==========
// This is already handled above, but adding as safety
document.querySelectorAll('form').forEach(form => {
    if (form.id !== 'contactForm') {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    }
});

// ========== Console Welcome Message ==========
console.log('%cCLES - Cognitive Load Estimation System', 'font-size: 20px; font-weight: bold; background: linear-gradient(135deg, #A855F7 0%, #EC4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;');
console.log('%cWelcome to our website! 🧠', 'font-size: 14px; color: #A855F7;');
console.log('%cInterested in the technology? Contact us for more information.', 'font-size: 12px; color: #6B7280;');

// ========== Performance Monitoring (Optional) ==========
if ('performance' in window) {
    window.addEventListener('load', () => {
        const perfData = window.performance.timing;
        const loadTime = perfData.loadEventEnd - perfData.navigationStart;
        console.log(`Page load time: ${loadTime}ms`);
    });
}

// ========== Progressive Enhancement for Reduced Motion ==========
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (prefersReducedMotion.matches) {
    // Disable animations for users who prefer reduced motion
    document.querySelectorAll('[data-aos]').forEach(el => {
        el.removeAttribute('data-aos');
    });
}

// ========== Dynamic Year in Footer ==========
const yearElements = document.querySelectorAll('[data-year]');
yearElements.forEach(el => {
    el.textContent = new Date().getFullYear();
});

// ========== Keyboard Navigation Enhancement ==========
document.addEventListener('keydown', (e) => {
    // Navigate through FAQ with arrow keys when focused
    if (document.activeElement.classList.contains('faq-question')) {
        const currentItem = document.activeElement.closest('.faq-item');
        const allItems = Array.from(faqItems);
        const currentIndex = allItems.indexOf(currentItem);

        if (e.key === 'ArrowDown' && currentIndex < allItems.length - 1) {
            e.preventDefault();
            allItems[currentIndex + 1].querySelector('.faq-question').focus();
        } else if (e.key === 'ArrowUp' && currentIndex > 0) {
            e.preventDefault();
            allItems[currentIndex - 1].querySelector('.faq-question').focus();
        }
    }
});

// ========== Service Worker Registration (Optional - for PWA) ==========
if ('serviceWorker' in navigator) {
    // Uncomment to enable service worker
    // window.addEventListener('load', () => {
    //     navigator.serviceWorker.register('/sw.js')
    //         .then(reg => console.log('Service Worker registered'))
    //         .catch(err => console.log('Service Worker registration failed'));
    // });
}

// ========== Initialize Tooltips (if using) ==========
const initTooltips = () => {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');

    tooltipElements.forEach(el => {
        el.addEventListener('mouseenter', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = el.getAttribute('data-tooltip');
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(31, 41, 55, 0.95);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
                pointer-events: none;
                z-index: 9999;
                white-space: nowrap;
            `;

            document.body.appendChild(tooltip);

            const rect = el.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';

            el._tooltip = tooltip;
        });

        el.addEventListener('mouseleave', () => {
            if (el._tooltip) {
                el._tooltip.remove();
                delete el._tooltip;
            }
        });
    });
};

// Initialize tooltips
initTooltips();

// ========== Analytics Event Tracking (if using GA/Analytics) ==========
const trackEvent = (category, action, label) => {
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            'event_category': category,
            'event_label': label
        });
    }
    console.log(`Event tracked: ${category} - ${action} - ${label}`);
};

// Track button clicks
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const label = btn.textContent.trim();
        trackEvent('Button', 'Click', label);
    });
});

// Track video interactions
document.querySelectorAll('video').forEach(video => {
    video.addEventListener('play', () => {
        trackEvent('Video', 'Play', video.src);
    });
});

// Track tab switches
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        trackEvent('Tab', 'Switch', btn.getAttribute('data-tab'));
    });
});

// Track form submission
if (contactForm) {
    contactForm.addEventListener('submit', () => {
        trackEvent('Form', 'Submit', 'Contact Form');
    });
}

// ========== Utility Functions ==========
// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Apply throttle to scroll handlers for better performance
const throttledScroll = throttle(() => {
    // Any heavy scroll calculations go here
}, 100);

window.addEventListener('scroll', throttledScroll);

// ========== Error Handling ==========
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // Could send to error tracking service here
});

// ========== Copy to Clipboard (for code snippets if any) ==========
const copyButtons = document.querySelectorAll('[data-copy]');

copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-copy');
        navigator.clipboard.writeText(text).then(() => {
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    });
});

// ========== Image Lazy Loading (native) ==========
if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.src = img.dataset.src;
    });
} else {
    // Fallback for older browsers
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
    document.body.appendChild(script);
}

// ========== Floating Particles in Hero Section ==========
const createFloatingParticles = () => {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    // Create particles container
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';

    // Insert after gradient overlay
    const gradientOverlay = hero.querySelector('.gradient-overlay');
    if (gradientOverlay) {
        gradientOverlay.insertAdjacentElement('afterend', particlesContainer);
    } else {
        hero.querySelector('.hero-background').appendChild(particlesContainer);
    }

    // Generate 30 particles
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        // Random size between 4px and 12px
        const size = Math.random() * 8 + 4;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        // Random horizontal position
        particle.style.left = `${Math.random() * 100}%`;

        // Random animation duration between 10s and 25s
        const duration = Math.random() * 15 + 10;
        particle.style.animationDuration = `${duration}s`;

        // Random animation delay for staggered effect
        const delay = Math.random() * 5;
        particle.style.animationDelay = `${delay}s`;

        particlesContainer.appendChild(particle);
    }
};

// Initialize particles after DOM is loaded
createFloatingParticles();

// ========== Hero Title Animation on Load ==========
window.addEventListener('load', () => {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        heroTitle.style.animation = 'fade-in-up 1.2s ease-out both';
    }
});

console.log('✅ CLES Website initialized successfully!');
