// ======== CINEMATIC SCROLL PHYSICS SYSTEM v2.1 (MASTER) ========
// Premium parallax + planet motion, tuned for maximum smoothness & performance

let currentScrollY = window.scrollY;
let targetScrollY = window.scrollY;
let animationFrameId = null;

// Throttle heavy planet math
const PHYSICS_INTERVAL_MS = 0; // Run at full framerate for maximum smoothness
let lastPhysicsTime = 0;

// Performance Cache to prevent memory leaks
const physicsCache = {
    elements: null,
    metrics: null
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
    if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(updateCinematicPhysics);
    }
}, { passive: true });

// Debounce resize to avoid browser calculation storms
let resizeTimeout = null;
window.addEventListener("resize", () => {
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
        const cards = document.querySelectorAll(".card, .content-card, .solid-glass"); 

        if (jupiterEl) jupiterEl.style.opacity = "0.6";
        physicsCache.elements = { jupiterEl, saturnEl, quoteSection, librarySection, spaceBg, cards };
    }
    const { jupiterEl, saturnEl, quoteSection, librarySection, spaceBg, cards } = physicsCache.elements;

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

        physicsCache.metrics = { windowHeight, windowWidth, quoteTop, maxScroll, jupiterPath, saturnPath };
    }
    const { windowHeight, windowWidth, quoteTop, maxScroll, jupiterPath, saturnPath } = physicsCache.metrics;
    
    // MOBILE OPTIMIZATION: Stop ALL heavy physics calculations on mobile to prevent lag
    if (windowWidth < 900) {
        animationFrameId = null;
        return;
    }

    // Interpolate scroll value
    currentScrollY = lerp(currentScrollY, targetScrollY, 0.08);

    // ========== BACKGROUND PARALLAX ==========
    if (spaceBg) {
        spaceBg.style.transform = `translate3d(0, -${(currentScrollY * 0.05).toFixed(2)}px, 0)`;
    }

    // ========== CARDS: VERTICAL PARALLAX ==========
    if (cards) {
        cards.forEach((card, index) => {
            if (!card.matches(':hover')) {
                // Staggered movement based on index creates incredible 3D depth
                const cardParallax = (currentScrollY * 0.02) + (index % 2 * 5);
                card.style.transform = `translate3d(0, -${cardParallax.toFixed(2)}px, 0)`;
                card.dataset.currentParallax = -cardParallax; // Store for tilt handoff
            }
        });
    }

    // If on a subpage without planets, continue parallax loop then exit safely
    if (!jupiterEl || !saturnEl) {
        if (Math.abs(targetScrollY - currentScrollY) > 0.5) {
            animationFrameId = requestAnimationFrame(updateCinematicPhysics);
        } else {
            animationFrameId = null;
        }
        return;
    }

    // ACCESSIBILITY: Disable for users who prefer reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
        jupiterEl.style.display = 'none';
        saturnEl.style.display = 'none';
        animationFrameId = null;
        return;
    }

    // ========== JUPITER: SLINGSHOT EXIT ==========
    const jupiterZoneEnd = quoteTop;
    const jupiterProgress = Math.min(Math.max(currentScrollY / jupiterZoneEnd, 0), 1);
    
    const jupiterX = quadraticBezier(jupiterPath.p0.x, jupiterPath.p1.x, jupiterPath.p2.x, jupiterProgress);
    const jupiterY = quadraticBezier(jupiterPath.p0.y, jupiterPath.p1.y, jupiterPath.p2.y, jupiterProgress);

    jupiterEl.style.transform = `translate3d(${jupiterX.toFixed(2)}px, ${jupiterY.toFixed(2)}px, 0) rotate(${jupiterProgress * 45}deg)`;

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
    const saturnScale = 0.9 + 0.3 * Math.sin(saturnProgress * Math.PI);

    saturnEl.style.opacity = (saturnFade * 0.45).toFixed(2);
    saturnEl.style.transform = `translate3d(${saturnX.toFixed(2)}px, ${saturnY.toFixed(2)}px, 0) rotate(${saturnProgress * -30}deg) scale(${saturnScale.toFixed(2)})`;
    
    // Engine Loop
    if (Math.abs(targetScrollY - currentScrollY) > 0.5) {
        animationFrameId = requestAnimationFrame(updateCinematicPhysics);
    } else {
        animationFrameId = null;
    }
}

// ======== 3D CARD TILT EFFECT ========
function initCardTilt() {
    if (window.matchMedia("(hover: none)").matches) return; // Ignore on touch

    const cards = document.querySelectorAll(".card, .content-card, .solid-glass");
    cards.forEach(card => {
        let rect;

        card.addEventListener("mouseenter", () => {
            rect = card.getBoundingClientRect();
            card.style.transition = "transform 0.1s ease-out, box-shadow 0.7s, border-color 0.7s";
        });

        card.addEventListener("mousemove", (e) => {
            if (!rect) rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -5; 
            const rotateY = ((x - centerX) / centerX) * 5;

            // Integrates with parallax floating effect
            const currentParallax = parseFloat(card.dataset.currentParallax || 0);
            card.style.transform = `perspective(1000px) translate3d(0, ${currentParallax}px, 0) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.02)`;
        });

        card.addEventListener("mouseleave", () => {
            card.style.transition = "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
            const currentParallax = parseFloat(card.dataset.currentParallax || 0);
            card.style.transform = `translate3d(0, ${currentParallax}px, 0)`;
        });
    });
}

// ========== GLOBAL INITIALIZATION & MOBILE MENU ==========
document.addEventListener("DOMContentLoaded", () => {
    lastPhysicsTime = 0;
    updateCinematicPhysics(performance.now());
    initCardTilt(); 

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