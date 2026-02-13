window.addEventListener("scroll", () => {
    const scrollPx = window.scrollY;
    
    // Target the Library Section to find the "stop" point
    const librarySection = document.querySelector('.library');
    if(!librarySection) return; // Guard clause

    const libraryTop = librarySection.offsetTop;
    // We want them to stop at the vertical center of the library area
    const libraryCenter = libraryTop + (librarySection.offsetHeight / 2);
    
    const jupiter = document.querySelector(".jupiter");
    const saturn = document.querySelector(".saturn");

    // Calculate progress relative to the library section "stop point"
    let progress = scrollPx / libraryCenter;
    if (progress > 1) progress = 1; // This "Clamps" the movement

    // --- JUPITER LOGIC ---
    // Start: Half-off screen (-250px) -> End: Right side of cards
    // Using innerWidth * 0.7 to park it on the right side of the landscape cards
    let jupX = -250 + (progress * (window.innerWidth * 0.7 + 250));
    let jupY = 20 + (progress * 45); 
    let jupOp = 0.5 + (progress * 0.3); // Fades from 0.5 to 0.8

    // Apply Jupiter styles
    jupiter.style.transform = `translateX(${jupX}px)`;
    jupiter.style.top = `${jupY}%`;
    jupiter.style.opacity = jupOp;

    // --- SATURN LOGIC ---
    // Starts appearing after 40% of the way to the library
    if (progress > 0.4) {
        let satProg = (progress - 0.4) / 0.6;
        // Glides in from off-screen left to park next to cards
        let satX = -300 + (satProg * 400); 
        
        saturn.style.transform = `translateX(${satX}px)`;
        saturn.style.top = `65%`;
        saturn.style.opacity = satProg * 0.7;
    } else {
        saturn.style.opacity = 0;
    }
});

// MOBILE MENU TOGGLE
document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.querySelector(".menu-toggle");
    const ribbon = document.querySelector(".ribbon");

    if(toggle) {
        toggle.addEventListener("click", () => {
            ribbon.classList.toggle("menu-open");
        });
    }
});
