// ======== CINEMATIC SCROLL PHYSICS SYSTEM v2.1 (MASTER) ========
// Premium parallax + planet motion, tuned for maximum smoothness & performance

let currentScrollY = window.scrollY;
let targetScrollY = window.scrollY;
let lastScrollY = currentScrollY;
let animationFrameId = null;

// Throttle heavy planet math
const PHYSICS_INTERVAL_MS = 0; // Run at full framerate for maximum smoothness
let lastPhysicsTime = 0;

// Performance Cache to prevent memory leaks
const physicsCache = {
    elements: null,
    metrics: null,
    sidebar: null,
    progressBar: null
};

// Smooth linear interpolation (Lerp)
function lerp(start, end, progress) {
    return start + (end - start) * Math.min(Math.max(progress, 0), 1);
}

// Helper for quadratic bezier curves (for smooth, cinematic paths)
function quadraticBezier(p0, p1, p2, t) {
    const oneMinusT = 1 - t;
    return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * t * p1 + t * t * p2;
}

// Track scroll position (Passive flag makes native scrolling much faster)
window.addEventListener("scroll", () => {
    targetScrollY = window.scrollY;
    updateReadingProgress();
    if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(updateCinematicPhysics);
    }
    updateSidebarActiveState();
}, { passive: true });

// Debounce resize to avoid browser calculation storms
let resizeTimeout = null;
let lastWindowWidth = window.innerWidth;

window.addEventListener("resize", () => {
    if (window.innerWidth === lastWindowWidth) return; // Ignore vertical-only resize (mobile URL bar)
    lastWindowWidth = window.innerWidth;

    physicsCache.metrics = null; // Drop cached metrics immediately
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        resizeTimeout = null;
        if (animationFrameId === null) {
            animationFrameId = requestAnimationFrame(updateCinematicPhysics);
        }
    }, 150);
});

function updateCinematicPhysics(now) {
    now = now || performance.now();
    const elapsed = now - lastPhysicsTime;
    const shouldRunHeavyStep = elapsed >= PHYSICS_INTERVAL_MS || lastPhysicsTime === 0;
    if (shouldRunHeavyStep) lastPhysicsTime = now;

    // 1. Initialize Elements Cache (Runs only once)
    if (!physicsCache.elements) {
        const jupiterEl = document.querySelector(".jupiter");
        const saturnEl = document.querySelector(".saturn");
        const quoteSection = document.getElementById("quote-section") || document.querySelector(".page-intro");
        const librarySection = document.getElementById("library-section") || document.querySelector(".content-grid");
        const spaceBg = document.querySelector(".space-bg");
        const cards = document.querySelectorAll(".card:not(.card-simple), .content-card:not(.card-simple), .solid-glass:not(.card-simple)"); 
        const progressBar = document.getElementById('reading-progress');

        if (jupiterEl) {
            jupiterEl.style.transition = "opacity 1.5s ease-out";
            requestAnimationFrame(() => jupiterEl.style.opacity = "0.4");
        }
        physicsCache.elements = { jupiterEl, saturnEl, quoteSection, librarySection, spaceBg, cards, progressBar };
    }
    const { jupiterEl, saturnEl, quoteSection, librarySection, spaceBg, cards, progressBar } = physicsCache.elements;

    // 2. Initialize Metrics Cache (Runs on load & resize)
    if (!physicsCache.metrics) {
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        const quoteTop = quoteSection ? quoteSection.offsetTop : windowHeight * 1.2;
        const maxScroll = Math.max(document.documentElement.scrollHeight - windowHeight, 1);
        
        // Pre-calculate celestial paths to avoid heavy math every single frame
        const jupiterPath = {
            p0: { x: -200, y: windowHeight * 0.1 },
            p1: { x: windowWidth * 0.4, y: windowHeight * 1.0 },
            p2: { x: windowWidth + 200, y: -200 }
        };

        const saturnPath = {
            p0: { x: windowWidth + 100, y: windowHeight * 0.2 },
            p1: { x: windowWidth * 0.5, y: windowHeight * 0.9 },
            p2: { x: -250, y: windowHeight * 0.15 }
        };

// Pre-calculate card positions for visibility check (Optimization)
        const cardMetrics = [];
        if (cards) {
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                cardMetrics.push({
                    el: card,
                    top: rect.top + scrollTop,
                    height: rect.height
                });
            });
        }

        physicsCache.metrics = { windowHeight, windowWidth, quoteTop, maxScroll, jupiterPath, saturnPath, cardMetrics };
        }
    const { windowHeight, windowWidth, quoteTop, maxScroll, jupiterPath, saturnPath, cardMetrics } = physicsCache.metrics;
    
    // ========== READING PROGRESS (Efficient Loop Update) ==========
    if (progressBar && maxScroll > 0) {
        const scrollPercent = (currentScrollY / maxScroll) * 100;
        progressBar.style.width = `${scrollPercent}%`;
    }

    // MOBILE OPTIMIZATION: Stop ALL heavy physics calculations on mobile to prevent lag
    if (windowWidth < 900) {
        animationFrameId = null;
        return;
    }

    // Interpolate scroll value
    currentScrollY = lerp(currentScrollY, targetScrollY, 0.1);

    // Optimization: Only update scroll-dependent elements if scroll changed
    const isScrolling = Math.abs(currentScrollY - lastScrollY) > 0.01;

    // ========== BACKGROUND PARALLAX ==========
    if (spaceBg && isScrolling) {
        if (spaceBg.classList.contains('long-read-bg')) {
            // Slower speed for long reads, no clamp needed due to larger CSS buffer
            const parallaxY = currentScrollY * 0.01;
            spaceBg.style.transform = `translate3d(0, -${parallaxY.toFixed(2)}px, 0)`;
        } else {
            // Original logic with clamp for shorter pages
            const maxParallax = windowHeight * 0.10;
            const parallaxY = Math.min(currentScrollY * 0.02, maxParallax);
            spaceBg.style.transform = `translate3d(0, -${parallaxY.toFixed(2)}px, 0)`;
        }
    }

    // ========== CARDS: VERTICAL PARALLAX ==========
    if (cardMetrics && isScrolling) {
        const viewTop = currentScrollY;
        const viewBottom = currentScrollY + windowHeight;
        const buffer = 200; // Render slightly outside viewport

        cardMetrics.forEach((metric, index) => {
            // Only animate if visible in viewport
            if (metric.top < viewBottom + buffer && metric.top + metric.height > viewTop - buffer) {
                const card = metric.el;
                if (!card.isHovered) {
                    // Staggered movement based on index creates incredible 3D depth
                    const cardParallax = (currentScrollY * 0.02) + (index % 2 * 5);
                    card.style.transform = `translate3d(0, -${cardParallax.toFixed(2)}px, 0)`;
                    card.dataset.currentParallax = -cardParallax; // Store for tilt handoff
                }
            }
        });
    }

    lastScrollY = currentScrollY;

    // ACCESSIBILITY: Disable for users who prefer reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
        jupiterEl.style.display = 'none';
        saturnEl.style.display = 'none';
        animationFrameId = null;
        return;
    }

    // Only run planet math if the elements exist
    if (jupiterEl && saturnEl) {
        // ========== JUPITER: SLINGSHOT EXIT ==========
        const jupiterZoneEnd = quoteTop;
        const jupiterProgress = Math.min(Math.max(currentScrollY / jupiterZoneEnd, 0), 1);
        
        const jupiterX = quadraticBezier(jupiterPath.p0.x, jupiterPath.p1.x, jupiterPath.p2.x, jupiterProgress);
        const jupiterY = quadraticBezier(jupiterPath.p0.y, jupiterPath.p1.y, jupiterPath.p2.y, jupiterProgress);
    
        const jupiterRotation = (now * 0.005) % 360;
        const jupiterScale = 0.9 + 0.25 * Math.sin(jupiterProgress * Math.PI); // Restricted zoom
        jupiterEl.style.transform = `translate3d(${jupiterX.toFixed(2)}px, ${jupiterY.toFixed(2)}px, 0) rotate(${jupiterRotation.toFixed(2)}deg) scale(${jupiterScale.toFixed(2)})`;
    
        // ========== SATURN: CURVED PATH ==========
        const saturnZoneStart = quoteTop; 
        const saturnZoneEnd = maxScroll;
        const saturnZoneHeight = Math.max(saturnZoneEnd - saturnZoneStart, 1);
    
        let saturnProgress = 0;
        if (currentScrollY >= saturnZoneStart) {
            saturnProgress = Math.min(Math.max((currentScrollY - saturnZoneStart) / saturnZoneHeight, 0), 1);
        }
    
        const saturnX = quadraticBezier(saturnPath.p0.x, saturnPath.p1.x, saturnPath.p2.x, saturnProgress);
        const saturnY = quadraticBezier(saturnPath.p0.y, saturnPath.p1.y, saturnPath.p2.y, saturnProgress);
    
        const saturnFade = Math.min(saturnProgress * 4, 1); 
        const saturnRotation = -(now * 0.005) % 360; // Rotate opposite direction
        const saturnScale = 0.9 + 0.25 * Math.sin(saturnProgress * Math.PI); // Zoom in/out effect
    
        saturnEl.style.opacity = (saturnFade * 0.4).toFixed(2); // Match Jupiter opacity
        saturnEl.style.transform = `translate3d(${saturnX.toFixed(2)}px, ${saturnY.toFixed(2)}px, 0) rotate(${saturnRotation.toFixed(2)}deg) scale(${saturnScale.toFixed(2)})`;
    }

    // Engine Loop
    animationFrameId = requestAnimationFrame(updateCinematicPhysics);
}

// ======== 3D CARD TILT EFFECT ========
function initCardTilt() {
    if (window.matchMedia("(hover: none)").matches) return; // Ignore on touch

    const cards = document.querySelectorAll(".card:not(.card-simple), .content-card:not(.card-simple), .solid-glass:not(.card-simple)");
    cards.forEach(card => {
        let rect;
        let ticking = false; // Throttling flag for performance

        card.addEventListener("mouseenter", () => {
            card.isHovered = true;
            rect = card.getBoundingClientRect();
            card.style.transition = "transform 0.1s ease-out, height 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.7s, border-color 0.7s";
        });

        card.addEventListener("mousemove", (e) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    // Optimization: Use cached rect from mouseenter to avoid layout thrashing
                    if (!rect) rect = card.getBoundingClientRect();
                    
                    // Calculate relative position for Glow & Tilt
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    // Update CSS variables for the Glow Effect
                    card.style.setProperty("--mouse-x", `${x}px`);
                    card.style.setProperty("--mouse-y", `${y}px`);

                    // Tilt Logic
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const rotateX = ((y - centerY) / centerY) * -5; 
                    const rotateY = ((x - centerX) / centerX) * 5;

                    const currentParallax = parseFloat(card.dataset.currentParallax || 0);
                    card.style.transform = `perspective(1000px) translate3d(0, ${currentParallax}px, 0) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.02)`;
                    
                    ticking = false;
                });
                ticking = true;
            }
        });

        card.addEventListener("mouseleave", () => {
            card.isHovered = false;
            card.style.transition = "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), height 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.7s, border-color 0.7s";
            const currentParallax = parseFloat(card.dataset.currentParallax || 0);
            card.style.transform = `translate3d(0, ${currentParallax}px, 0)`;
        });
    });
}

// ======== SIDEBAR SCROLL SPY ========
function updateSidebarActiveState() {
    if (!physicsCache.sidebar) {
        physicsCache.sidebar = {
            sections: document.querySelectorAll('.reading-text h3[id], .reading-text h2[id]'),
            links: document.querySelectorAll('.sidebar-list a')
        };
    }
    const { sections, links } = physicsCache.sidebar;

    if (sections.length === 0) return;

    let currentSectionId = '';

    sections.forEach(section => {
        if (section.getBoundingClientRect().top < 200) { 
            currentSectionId = section.getAttribute('id');
        }
    });

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            link.classList.remove('active-link');
            if (currentSectionId && href === '#' + currentSectionId) {
                link.classList.add('active-link');
            }
        }
    });
}

// ========== GLOBAL INITIALIZATION & MOBILE MENU ==========
document.addEventListener("DOMContentLoaded", () => {
    lastPhysicsTime = 0;
    updateCinematicPhysics(performance.now());
    initCardTilt(); 
    updateSidebarActiveState();
    setupArchiveComingSoon(); // Initialize Archive Toggle
    initReadingFeatures(); // Initialize Reading Time & Share
    initBackToTop(); // Initialize Back to Top button

    const toggle = document.querySelector(".menu-toggle");
    const mobileMenu = document.getElementById("mobileMenu");

    if (toggle && mobileMenu) {
        toggle.addEventListener("click", (e) => {
            e.stopPropagation(); 
            const isFlex = mobileMenu.style.display === "flex";
            mobileMenu.style.display = isFlex ? "none" : "flex";
        });

        document.addEventListener("click", (e) => {
            if (mobileMenu.style.display === "flex" && !mobileMenu.contains(e.target)) {
                mobileMenu.style.display = "none";
            }
        });

        mobileMenu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                mobileMenu.style.display = "none";
            });
        });
    }
});

// ========== CONTENT PROTECTION ==========
// Deters casual highlight-and-copy behavior
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// ======== READING PROGRESS ========
function updateReadingProgress() {
    // Use cached element if available, otherwise query
    const progressBar = (physicsCache.elements && physicsCache.elements.progressBar) 
        ? physicsCache.elements.progressBar 
        : document.getElementById('reading-progress');

    if (progressBar) {
        let maxScroll;
        // Use cached metrics if available
        if (physicsCache.metrics && physicsCache.metrics.maxScroll) {
            maxScroll = physicsCache.metrics.maxScroll;
        } else {
            maxScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        }

        if (maxScroll > 0) {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollPercent = (scrollTop / maxScroll) * 100;
            progressBar.style.width = `${scrollPercent}%`;
        }
    }
}

// ======== ARCHIVE COMING SOON TOGGLE ========
function setupArchiveComingSoon() {
    const archiveSection = document.querySelector('.content-archive');
    if (!archiveSection) return;

    // 1. Enable Coming Soon Mode (Hides cards via CSS class)
    archiveSection.classList.add('coming-soon-mode');

    // 2. Create UI Elements (Arrow & Message)
    const container = document.createElement('div');
    container.className = 'archive-toggle-container';

    const btn = document.createElement('button');
    btn.className = 'archive-toggle-btn';
    btn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
    btn.setAttribute('aria-label', 'Show Status');

    const msg = document.createElement('div');
    msg.className = 'archive-message';
    msg.innerHTML = '<p>Coming Soon</p>';

    // 3. Assemble and Inject
    container.appendChild(btn);
    container.appendChild(msg);
    archiveSection.appendChild(container);

    // 4. Interaction Logic
    btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        msg.classList.toggle('visible');
    });
}

// ======== READING FEATURES (Time & Share) ========
function initReadingFeatures() {
    // 1. Calculate Reading Time
    const articleText = document.querySelector('.reading-text');
    const timeDisplay = document.getElementById('sidebar-reading-time');
    
    if (articleText && timeDisplay) {
        const text = articleText.innerText;
        const wpm = 200; // Average reading speed
        const words = text.trim().split(/\s+/).length;
        const time = Math.ceil(words / wpm);
        timeDisplay.innerHTML = `<i class="fa-regular fa-clock"></i> ${time} min read`;
    }

    // 2. Share Button Logic
    const shareBtn = document.getElementById('sidebar-share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href).then(() => {
                const originalHTML = shareBtn.innerHTML;
                shareBtn.innerHTML = '<i class="fa-solid fa-check"></i> Link Copied';
                shareBtn.classList.add('copied');
                setTimeout(() => {
                    shareBtn.innerHTML = originalHTML;
                    shareBtn.classList.remove('copied');
                }, 2000);
            });
        });
    }
}

// ======== BACK TO TOP BUTTON ========
function initBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');

    if (!backToTopBtn) return; // Only run on pages where the button exists

    window.addEventListener('scroll', () => {
        if (window.scrollY > window.innerHeight / 2) { // Show after half a screen scroll
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    }, { passive: true });

    backToTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}