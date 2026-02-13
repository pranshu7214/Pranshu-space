document.addEventListener("DOMContentLoaded", () => {
    const jupiter = document.querySelector(".jupiter");
    const saturn = document.querySelector(".saturn");
    
    // Sections to track
    const body = document.body;
    
    window.addEventListener("scroll", () => {
      // Calculate how far down we are (0 to 1)
      const html = document.documentElement;
      const scrollTotal = html.scrollHeight - html.clientHeight;
      const scrollPx = window.scrollY;
      const progress = scrollPx / scrollTotal;
  
      // --- JUPITER ANIMATION (The Arc) ---
      // 1. Starts Left (-20%)
      // 2. Middle of page: Moves to center/bottom
      // 3. End of page: Moves to Right (85%)
      
      // X Axis: Move from -10% to 85%
      const jupX = -10 + (progress * 95); 
      
      // Y Axis: Move down, but slower than scroll to create parallax
      const jupY = 10 + (progress * 80); 
  
      // Opacity Logic
      let jupOp = 0.2; // Base opacity
      if(progress > 0.2 && progress < 0.6) {
          jupOp = 0.6; // Brightest in the middle (Quote section)
      } else if (progress > 0.8) {
          jupOp = 0.4; // Fades slightly at end
      }
      
      // Apply Jupiter
      jupiter.style.left = `${jupX}%`;
      jupiter.style.top = `${jupY}%`;
      jupiter.style.opacity = jupOp;
  
      // --- SATURN ANIMATION ---
      // Starts invisible. Appears only after 50% scroll.
      // Sits on the LEFT side of the library.
      
      let satOp = 0;
      let satX = -20;
      
      if(progress > 0.4) {
        // Fade in quickly between 40% and 60% scroll
        satOp = (progress - 0.4) * 3; 
        satOp = Math.min(satOp, 0.8); // Cap opacity
        
        // Slide in from left
        satX = 5 + ((progress - 0.4) * 10); // Ends up around 10-15% left
      }
  
      // Apply Saturn
      saturn.style.left = `${satX}%`;
      saturn.style.top = `60%`; // Stays vertically grounded in library section
      saturn.style.opacity = satOp;
    });
  
    // Mobile Menu
    const toggle = document.querySelector(".menu-toggle");
    const menu = document.querySelector("#mobileMenu");
    toggle.addEventListener("click", () => {
        menu.style.display = menu.style.display === "flex" ? "none" : "flex";
        menu.style.position = "absolute";
        menu.style.top = "90px";
        menu.style.left = "0";
        menu.style.width = "100%";
        menu.style.background = "rgba(0,0,0,0.9)";
        menu.style.flexDirection = "column";
        menu.style.padding = "2rem";
    });
  });
