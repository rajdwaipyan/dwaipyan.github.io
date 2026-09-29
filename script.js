(() => {

  const body = document.body;

  const topbar =
    document.getElementById("topbar");

  const menuButton =
    document.getElementById("menu-button");

  const menuOverlay =
    document.getElementById("menu-overlay");

  const cursor =
    document.querySelector(".cursor");

  const canvas =
    document.getElementById("motion-canvas");

  const ctx =
    canvas?.getContext("2d");

  const reduced =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  const finePointer =
    window.matchMedia(
      "(hover:hover) and (pointer:fine)"
    ).matches;


  /* =========================================================
     HEADER
  ========================================================== */

  const onScroll = () => {

    topbar?.classList.toggle(
      "scrolled",
      window.scrollY > 20
    );

  };

  window.addEventListener(
    "scroll",
    onScroll,
    { passive:true }
  );

  onScroll();


  /* =========================================================
     MENU
  ========================================================== */

  const setMenu = (open) => {

    menuOverlay?.classList.toggle(
      "open",
      open
    );

    menuOverlay?.setAttribute(
      "aria-hidden",
      String(!open)
    );

    menuButton?.setAttribute(
      "aria-expanded",
      String(open)
    );

    body.classList.toggle(
      "menu-open",
      open
    );

    const label =
      menuButton?.querySelector("span");

    if (label) {
      label.textContent =
        open ? "CLOSE" : "MENU";
    }

  };


  menuButton?.addEventListener(
    "click",
    () => {

      setMenu(
        !menuOverlay?.classList.contains(
          "open"
        )
      );

    }
  );


  document
    .querySelectorAll("[data-menu-link]")
    .forEach((link) => {

      link.addEventListener(
        "click",
        () => setMenu(false)
      );

    });


  window.addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Escape") {
        setMenu(false);
      }

    }
  );


  /* =========================================================
     REVEAL
  ========================================================== */

  const revealEls =
    document.querySelectorAll(
      ".reveal, [data-reveal-text]"
    );


  if (
    "IntersectionObserver" in window &&
    !reduced
  ) {

    const observer =
      new IntersectionObserver(
        (entries) => {

          entries.forEach((entry) => {

            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add("in");

            observer.unobserve(
              entry.target
            );

          });

        },
        {
          threshold:.14
        }
      );


    revealEls.forEach((element) => {

      observer.observe(element);

    });

  } else {

    revealEls.forEach((element) => {

      element.classList.add("in");

    });

  }


  /* =========================================================
     CURSOR
  ========================================================== */

  if (finePointer) {

    window.addEventListener(
      "pointermove",
      (event) => {

        if (cursor) {

          cursor.style.left =
            `${event.clientX}px`;

          cursor.style.top =
            `${event.clientY}px`;

        }

        document.documentElement.style
          .setProperty(
            "--mx",
            `${event.clientX}px`
          );

        document.documentElement.style
          .setProperty(
            "--my",
            `${event.clientY}px`
          );

      },
      {
        passive:true
      }
    );


    document
      .querySelectorAll(
        "a,button,.project,.service-v3-card"
      )
      .forEach((element) => {

        element.addEventListener(
          "mouseenter",
          () => {

            cursor?.classList.add(
              "active"
            );

          }
        );


        element.addEventListener(
          "mouseleave",
          () => {

            cursor?.classList.remove(
              "active"
            );

            cursor
              ?.querySelector("span")
              ?.replaceChildren(
                document.createTextNode(
                  "VIEW"
                )
              );

          }
        );

      });


    document
      .querySelectorAll(".project")
      .forEach((project) => {

        project.addEventListener(
          "mouseenter",
          () => {

            const label =
              project.dataset.label ||
              "VIEW";

            cursor
              ?.querySelector("span")
              ?.replaceChildren(
                document.createTextNode(
                  label
                )
              );

          }
        );

      });


    /* =======================================================
       MAGNETIC ELEMENTS
    ======================================================= */

    if (!reduced) {

      document
        .querySelectorAll(".magnetic")
        .forEach((element) => {

          element.addEventListener(
            "pointermove",
            (event) => {

              const rect =
                element.getBoundingClientRect();

              const x =
                (
                  (event.clientX - rect.left) /
                  rect.width -
                  .5
                ) * 10;

              const y =
                (
                  (event.clientY - rect.top) /
                  rect.height -
                  .5
                ) * 10;

              element.style.transform =
                `translate(${x}px,${y}px)`;

            }
          );


          element.addEventListener(
            "pointerleave",
            () => {

              element.style.transform =
                "";

            }
          );

        });

    }

  }


  /* =========================================================
     HERO PORTRAIT
  ========================================================== */

  const heroPortrait =
    document.getElementById(
      "hero-portrait"
    );

  if (
    heroPortrait &&
    finePointer &&
    !reduced
  ) {

    heroPortrait.addEventListener(
      "pointermove",
      (event) => {

        const rect =
          heroPortrait.getBoundingClientRect();

        const x =
          (
            (event.clientX - rect.left) /
            rect.width -
            .5
          );

        const y =
          (
            (event.clientY - rect.top) /
            rect.height -
            .5
          );


        heroPortrait.style.setProperty(
          "--portrait-x",
          `${x * 14}px`
        );

        heroPortrait.style.setProperty(
          "--portrait-y",
          `${y * 14}px`
        );


        const image =
          heroPortrait.querySelector(
            ".portrait-image-frame > img"
          );

        const offset =
          heroPortrait.querySelector(
            ".portrait-offset-image"
          );


        if (image) {

          image.style.transform =
            `scale(1.075) translate(
              ${x * -10}px,
              ${y * -10}px
            )`;

        }


        if (offset) {

          offset.style.transform =
            `translate(
              ${9 + x * 12}px,
              ${-6 + y * 10}px
            )`;

        }

      },
      {
        passive:true
      }
    );


    heroPortrait.addEventListener(
      "pointerleave",
      () => {

        heroPortrait.style.setProperty(
          "--portrait-x",
          "0px"
        );

        heroPortrait.style.setProperty(
          "--portrait-y",
          "0px"
        );


        const image =
          heroPortrait.querySelector(
            ".portrait-image-frame > img"
          );

        const offset =
          heroPortrait.querySelector(
            ".portrait-offset-image"
          );


        if (image) {

          image.style.transform =
            "scale(1.035)";

        }


        if (offset) {

          offset.style.transform =
            "translate(9px,-6px)";

        }

      }
    );

  }


  /* =========================================================
     HERO SCROLL PARALLAX
  ========================================================== */

  const heroSection =
    document.getElementById(
      "hero"
    );

  if (
    heroSection &&
    heroPortrait &&
    !reduced
  ) {

    let heroTicking = false;


    const updateHeroParallax = () => {

      const rect =
        heroSection.getBoundingClientRect();


      const progress =
        Math.max(
          -.18,
          Math.min(
            .18,
            rect.top /
            window.innerHeight
          )
        );


      const parallax =
        progress * -55;


      heroPortrait.style.setProperty(
        "--portrait-scroll",
        `${parallax}px`
      );


      heroTicking = false;

    };


    window.addEventListener(
      "scroll",
      () => {

        if (heroTicking) {
          return;
        }

        heroTicking = true;

        requestAnimationFrame(
          updateHeroParallax
        );

      },
      {
        passive:true
      }
    );

  }


  /* =========================================================
     SERVICES INTERACTION
  ========================================================== */

  const serviceItems =
    document.querySelectorAll(
      ".interactive-service"
    );


  if (
    serviceItems.length &&
    finePointer &&
    !reduced
  ) {

    serviceItems.forEach((service) => {

      const visual =
        service.querySelector(
          ".service-v3-visual"
        );


      if (!visual) {
        return;
      }


      service.addEventListener(
        "pointermove",
        (event) => {

          const rect =
            service.getBoundingClientRect();


          const x =
            (
              (event.clientX - rect.left) /
              rect.width -
              .5
            );

          const y =
            (
              (event.clientY - rect.top) /
              rect.height -
              .5
            );


          visual.style.setProperty(
            "--service-x",
            `${x * 10}px`
          );

          visual.style.setProperty(
            "--service-y",
            `${y * 10}px`
          );

        },
        {
          passive:true
        }
      );


      service.addEventListener(
        "pointerleave",
        () => {

          visual.style.setProperty(
            "--service-x",
            "0px"
          );

          visual.style.setProperty(
            "--service-y",
            "0px"
          );

        }
      );


      service.addEventListener(
        "mouseenter",
        () => {

          service.classList.add(
            "is-active"
          );

        }
      );


      service.addEventListener(
        "mouseleave",
        () => {

          service.classList.remove(
            "is-active"
          );

        }
      );

    });

  }


  /* =========================================================
     CANVAS MOTION FIELD
  ========================================================== */

  if (
    !canvas ||
    !ctx ||
    reduced
  ) {
    return;
  }


  let w = 0;
  let h = 0;
  let dpr = 1;

  let blobs = [];


  const resize = () => {

    dpr =
      Math.min(
        2,
        window.devicePixelRatio || 1
      );

    w = window.innerWidth;
    h = window.innerHeight;


    canvas.width =
      w * dpr;

    canvas.height =
      h * dpr;


    canvas.style.width =
      `${w}px`;

    canvas.style.height =
      `${h}px`;


    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );


    blobs =
      Array.from(
        { length:5 },
        (_, index) => ({

          x:
            w *
            (
              .08 +
              index * .2
            ),

          y:
            h *
            (
              .18 +
              (index % 2) *
              .48
            ),

          r:
            160 +
            Math.random() * 180,

          phase:
            Math.random() *
            Math.PI *
            2,

          speed:
            .00015 +
            Math.random() *
            .00018

        })
      );

  };


  const draw = (time) => {

    ctx.clearRect(
      0,
      0,
      w,
      h
    );


    blobs.forEach(
      (blob,index) => {

        const x =
          blob.x +
          Math.sin(
            time *
              blob.speed +
              blob.phase
          ) *
          85;


        const y =
          blob.y +
          Math.cos(
            time *
              blob.speed *
              1.25 +
              blob.phase
          ) *
          60;


        const gradient =
          ctx.createRadialGradient(
            x,
            y,
            0,
            x,
            y,
            blob.r
          );


        const colour =
          index % 2 === 0
            ? "215,255,63"
            : "132,108,255";


        gradient.addColorStop(
          0,
          `rgba(${colour},.045)`
        );


        gradient.addColorStop(
          .42,
          `rgba(${colour},.018)`
        );


        gradient.addColorStop(
          1,
          "rgba(255,255,255,0)"
        );


        ctx.fillStyle =
          gradient;


        ctx.beginPath();

        ctx.arc(
          x,
          y,
          blob.r,
          0,
          Math.PI * 2
        );

        ctx.fill();

      }
    );


    /* contour lines */

    ctx.lineWidth = .55;


    for (
      let band = 0;
      band < 6;
      band++
    ) {

      ctx.beginPath();


      for (
        let x = -30;
        x <= w + 30;
        x += 18
      ) {

        const y =
          h *
          (
            .08 +
            band * .17
          ) +
          Math.sin(
            x * .008 +
            time * .00022 +
            band * .9
          ) *
          (
            18 +
            band * 2
          );


        if (x === -30) {
          ctx.moveTo(
            x,
            y
          );
        } else {
          ctx.lineTo(
            x,
            y
          );
        }

      }


      ctx.strokeStyle =
        band % 2 === 0
          ? "rgba(17,17,17,.018)"
          : "rgba(132,108,255,.018)";


      ctx.stroke();

    }


    requestAnimationFrame(
      draw
    );

  };


  window.addEventListener(
    "resize",
    resize,
    {
      passive:true
    }
  );


  resize();

  requestAnimationFrame(
    draw
  );

})();
