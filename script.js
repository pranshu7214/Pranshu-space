// ======== CINEMATIC SCROLL PHYSICS SYSTEM v2.0 ========
// Premium parallax + planet motion

let currentScrollY = window.scrollY;
let targetScrollY = window.scrollY;
let animationFrameId = null;

// Performance Cache
const physicsCache = {
    elements: null,
    metrics: null
};

// Smooth linear interpolation
function lerp(start, end, progress) {
    return start + (end - start) * Math.min(Math.max(progress, 0), 1);
}

// Helper for quadratic bezier curves (for smooth, curved paths)
function quadraticBezier(p0, p1, p2, t) {
    const oneMinusT = 1 - t;
    return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * t * p1 + t * t * p2;
}

// Track scroll position (passive for better scroll performance)
window.addEventListener("scroll", () => {
    targetScrollY = window.scrollY;
    if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(updateCinematicPhysics);
    }
}, { passive: true });

// Debounce resize to avoid recalc storms
let resizeTimeout = null;
window.addEventListener("resize", () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        physicsCache.metrics = null;
        resizeTimeout = null;
        if (animationFrameId === null) {
            animationFrameId = requestAnimationFrame(updateCinematicPhysics);
        }
    }, 150);
});

function updateCinematicPhysics() {
    // 1. Initialize Elements Cache (Run once)
    if (!physicsCache.elements) {
        const jupiterEl = document.querySelector(".jupiter");
        const saturnEl = document.querySelector(".saturn");
        const quoteSection = document.getElementById("quote-section");
        const librarySection = document.getElementById("library-section");
        const essayCard = document.querySelector(".earth-theme");
        const footer = document.querySelector("footer");
        const spaceBg = document.querySelector(".space-bg");

        if (jupiterEl) jupiterEl.style.opacity = "0.6";
        physicsCache.elements = { jupiterEl, saturnEl, quoteSection, librarySection, essayCard, footer, spaceBg };
    }
    const { jupiterEl, saturnEl, quoteSection, librarySection, essayCard, footer, spaceBg } = physicsCache.elements;

    // 2. Initialize Metrics Cache (Run on load & resize)
    if (!physicsCache.metrics) {
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        const quoteTop = quoteSection ? quoteSection.offsetTop : 0;
        const quoteHeight = quoteSection ? quoteSection.offsetHeight : 0;
        
        const libraryTop = librarySection ? librarySection.offsetTop : 0;
        const essayCardTop = essayCard ? essayCard.offsetTop : 0;
        const essayCardHeight = essayCard ? essayCard.offsetHeight : 200;
        const essayCardCenter = essayCardTop + essayCardHeight / 2;
        
        const footerTop = footer ? footer.offsetTop : document.body.offsetHeight;
        const maxScroll = Math.max(document.documentElement.scrollHeight - windowHeight, 1);
        
        // Pre-calculate paths to avoid object creation every frame
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

        physicsCache.metrics = { windowHeight, windowWidth, quoteTop, quoteHeight, libraryTop, essayCardCenter, footerTop, maxScroll, jupiterPath, saturnPath };
    }
    const { windowHeight, windowWidth, quoteTop, quoteHeight, libraryTop, essayCardCenter, footerTop, maxScroll, jupiterPath, saturnPath } = physicsCache.metrics;
    
    // MOBILE OPTIMIZATION: Stop physics calculations on mobile to prevent lag
    if (windowWidth < 900) {
        animationFrameId = null;
        return;
    }

    // Smooth out the scroll value (Linear Interpolation)
    currentScrollY = lerp(currentScrollY, targetScrollY, 0.12);

    const parallaxY = currentScrollY * 0.05;
    if (spaceBg) spaceBg.style.transform = `translate3d(0, -${parallaxY.toFixed(2)}px, 0)`;

    // If we are on a subpage (no planets), just keep the loop running for parallax and exit
    if (!jupiterEl || !saturnEl || !quoteSection) {
        if (Math.abs(targetScrollY - currentScrollY) > 0.5) animationFrameId = requestAnimationFrame(updateCinematicPhysics);
        else animationFrameId = null;
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

    // ========== JUPITER: SLINGSHOT EXIT (LEFT -> DOWN -> UP-RIGHT) ==========
    // Active from Start -> Quote Section. Exits exactly as Saturn enters.
    const jupiterZoneEnd = quoteTop;
    const jupiterProgress = Math.min(Math.max(currentScrollY / jupiterZoneEnd, 0), 1);
    
    const jupiterX = quadraticBezier(jupiterPath.p0.x, jupiterPath.p1.x, jupiterPath.p2.x, jupiterProgress);
    const jupiterY = quadraticBezier(jupiterPath.p0.y, jupiterPath.p1.y, jupiterPath.p2.y, jupiterProgress);

    // Removed repetitive filter assignment
    jupiterEl.style.transform = `translate3d(${jupiterX.toFixed(2)}px, ${jupiterY.toFixed(2)}px, 0) rotate(${jupiterProgress * 45}deg)`;

    // ========== SATURN: CURVED PATH (RIGHT -> DIP -> LEFT & UP) ==========
    // Starts at Quote, dips behind cards, moves Left & Upwards
    const saturnZoneStart = quoteTop; // Animation starts when quote section is at the top
    const saturnZoneEnd = maxScroll;
    const saturnZoneHeight = Math.max(saturnZoneEnd - saturnZoneStart, 1);

    let saturnProgress = 0;
    if (currentScrollY >= saturnZoneStart) {
        saturnProgress = Math.min(Math.max((currentScrollY - saturnZoneStart) / saturnZoneHeight, 0), 1);
    }

    const saturnX = quadraticBezier(saturnPath.p0.x, saturnPath.p1.x, saturnPath.p2.x, saturnProgress);
    const saturnY = quadraticBezier(saturnPath.p0.y, saturnPath.p1.y, saturnPath.p2.y, saturnProgress);

    // Fade in Saturn as it enters the zone
    const saturnFade = Math.min(saturnProgress * 4, 1); // Quick fade in

    // Extra: Scale effect to simulate 3D depth (larger when lower/closer)
    const saturnScale = 0.9 + 0.3 * Math.sin(saturnProgress * Math.PI);

    saturnEl.style.opacity = (saturnFade * 0.45).toFixed(2);
    // Removed dynamic blur
    saturnEl.style.transform = `translate3d(${saturnX.toFixed(2)}px, ${saturnY.toFixed(2)}px, 0) rotate(${saturnProgress * -30}deg) scale(${saturnScale.toFixed(2)})`;
    
    if (Math.abs(targetScrollY - currentScrollY) > 0.5) {
        animationFrameId = requestAnimationFrame(updateCinematicPhysics);
    } else {
        animationFrameId = null;
    }
}

// ========== MOBILE MENU TOGGLE ==========
document.addEventListener("DOMContentLoaded", () => {
    updateCinematicPhysics();

    const toggle = document.querySelector(".menu-toggle");
    const mobileMenu = document.getElementById("mobileMenu");

    if (toggle) {
        toggle.addEventListener("click", () => {
            const isFlex = mobileMenu.style.display === "flex";
            mobileMenu.style.display = isFlex ? "none" : "flex";
        });
    }
});