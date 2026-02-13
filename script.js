window.addEventListener("scroll", () => {
    const scrollPx = window.scrollY;
    const winH = window.innerHeight;
    const docH = document.documentElement.scrollHeight;
    const progress = scrollPx / (docH - winH);

    const jupiter = document.querySelector(".jupiter");
    const saturn = document.querySelector(".saturn");

    // --- JUPITER ARC ---
    // Start Left -> Settle Right (80%)
    let jupX = -10 + (progress * 110); 
    if (jupX > 80) jupX = 80; 

    let jupY = 15 + (progress * 50); 
    let jupOp = progress < 0.1 ? progress * 5 : 0.8;

    jupiter.style.left = `${jupX}%`;
    jupiter.style.top = `${jupY}%`;
    jupiter.style.opacity = jupOp;

    // --- SATURN ARC ---
    // Appears after Quote -> Settle Left (10%)
    if (progress > 0.4) {
        let satProg = (progress - 0.4) / 0.6; 
        let satX = -20 + (satProg * 40); 
        if (satX > 10) satX = 10; 

        saturn.style.left = `${satX}%`;
        saturn.style.top = `70%`;
        saturn.style.opacity = Math.min(satProg * 2, 0.7);
    } else {
        saturn.style.opacity = 0;
    }
});

// MOBILE MENU TOGGLE
document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.querySelector(".menu-toggle");
    const ribbon = document.querySelector(".ribbon");

    toggle.addEventListener("click", () => {
        ribbon.classList.toggle("menu-open");
    });
});
