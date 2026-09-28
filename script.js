(() => {
  const body = document.body;
  const header = document.getElementById('header');
  const nav = document.getElementById('nav');
  const menuBtn = document.getElementById('menuBtn');
  const themeBtn = document.getElementById('themeBtn');
  const backTop = document.getElementById('backTop');
  const cursor = document.querySelector('.cursor');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================
     THEME
  ========================= */
  const savedTheme = localStorage.getItem('dm-theme');

  if (savedTheme === 'light') {
    body.classList.add('light');
  }

  themeBtn?.addEventListener('click', () => {
    body.classList.toggle('light');

    localStorage.setItem(
      'dm-theme',
      body.classList.contains('light') ? 'light' : 'dark'
    );
  });

  /* =========================
     MOBILE NAVIGATION
  ========================= */
  menuBtn?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  nav?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      menuBtn?.setAttribute('aria-expanded', 'false');
    });
  });

  /* =========================
     SCROLL STATE
  ========================= */
  const onScroll = () => {
    if (header) {
      header.classList.toggle('scrolled', window.scrollY > 30);
    }

    if (backTop) {
      backTop.classList.toggle('show', window.scrollY > 700);
    }

    let current = 'home';

    document
      .querySelectorAll('main section[id]')
      .forEach((section) => {
        if (window.scrollY >= section.offsetTop - 160) {
          current = section.id;
        }
      });

    nav?.querySelectorAll('a').forEach((a) => {
      a.classList.toggle(
        'active',
        a.getAttribute('href') === `#${current}`
      );
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* =========================
     BACK TO TOP
  ========================= */
  backTop?.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  });

  /* =========================
     REVEAL ON SCROLL
  ========================= */
  const revealEls = document.querySelectorAll('.reveal');

  if (
    'IntersectionObserver' in window &&
    !reducedMotion
  ) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const delay = Number(
            entry.target.dataset.delay || 0
          );

          setTimeout(() => {
            entry.target.classList.add('in');
          }, delay);

          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12
      }
    );

    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* =========================
     COUNTER ANIMATION
  ========================= */
  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target;
          const target = Number(el.dataset.count || 0);

          if (reducedMotion) {
            el.textContent = target;
            counterObserver.unobserve(el);
            return;
          }

          const start = 0;
          const duration = 1200;
          const t0 = performance.now();

          const tick = (now) => {
            const progress = Math.min(
              1,
              (now - t0) / duration
            );

            const eased =
              1 - Math.pow(1 - progress, 3);

            el.textContent = Math.round(
              start + (target - start) * eased
            );

            if (progress < 1) {
              requestAnimationFrame(tick);
            }
          };

          requestAnimationFrame(tick);

          counterObserver.unobserve(el);
        });
      },
      {
        threshold: 0.8
      }
    );

    document
      .querySelectorAll('[data-count]')
      .forEach((el) => counterObserver.observe(el));
  }

  /* =========================
     CURSOR + POINTER GLOW
  ========================= */
  const finePointer = window.matchMedia(
    '(hover:hover) and (pointer:fine)'
  ).matches;

  if (finePointer) {
    window.addEventListener(
      'pointermove',
      (e) => {
        document.documentElement.style.setProperty(
          '--mx',
          `${e.clientX}px`
        );

        document.documentElement.style.setProperty(
          '--my',
          `${e.clientY}px`
        );

        if (cursor) {
          cursor.style.left = `${e.clientX}px`;
          cursor.style.top = `${e.clientY}px`;
        }
      },
      { passive: true }
    );

    document
      .querySelectorAll('a, button, .tilt-card')
      .forEach((el) => {
        el.addEventListener('mouseenter', () => {
          cursor?.classList.add('active');
        });

        el.addEventListener('mouseleave', () => {
          cursor?.classList.remove('active');
        });
      });

    /* =========================
       3D TILT CARDS
    ========================= */
    if (!reducedMotion) {
      document
        .querySelectorAll('.tilt-card')
        .forEach((card) => {
          card.addEventListener('pointermove', (e) => {
            const rect = card.getBoundingClientRect();

            const x =
              (e.clientX - rect.left) /
                rect.width -
              0.5;

            const y =
              (e.clientY - rect.top) /
                rect.height -
              0.5;

            card.style.transform =
              `perspective(900px) ` +
              `rotateX(${(-y * 4).toFixed(2)}deg) ` +
              `rotateY(${(x * 5).toFixed(2)}deg) ` +
              `translateY(-4px)`;
          });

          card.addEventListener('pointerleave', () => {
            card.style.transform = '';
          });
        });
    }
  }

  /* =========================
     CONTACT FORM
     ========================= */
  document
    .getElementById('contactForm')
    ?.addEventListener('submit', (e) => {
      e.preventDefault();

      const name =
        document.getElementById('name')?.value.trim() || '';

      const email =
        document.getElementById('email')?.value.trim() || '';

      const topic =
        document.getElementById('topic')?.value || '';

      const message =
        document.getElementById('message')?.value.trim() || '';

      const subject = encodeURIComponent(
        `${topic} — project enquiry from ${name}`
      );

      const bodyText = encodeURIComponent(
        `Hi Dwaipyan,\n\n` +
        `Name: ${name}\n` +
        `Email: ${email}\n` +
        `Project: ${topic}\n\n` +
        `${message}\n\n` +
        `Sent from your portfolio.`
      );

      window.location.href =
        `mailto:rajdwaipayan@gmail.com?subject=${subject}&body=${bodyText}`;

      const note = document.getElementById('formNote');

      if (note) {
        note.textContent =
          'Your email app should open with the message ready to send.';
      }
    });

  /* =========================
     INTERACTIVE BACKGROUND
  ========================= */
  const canvas = document.getElementById('scene');
  const ctx = canvas?.getContext('2d');

  if (!canvas || !ctx || reducedMotion) {
    return;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let points = [];

  const mouse = {
    x: -9999,
    y: -9999
  };

  /* =========================
     CANVAS RESIZE
  ========================= */
  const resize = () => {
    dpr = Math.min(
      2,
      window.devicePixelRatio || 1
    );

    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    const count = Math.min(
      95,
      Math.max(
        38,
        Math.floor(width / 14)
      )
    );

    points = Array.from(
      { length: count },
      () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.35
      })
    );
  };

  /* =========================
     CANVAS ANIMATION
  ========================= */
  const loop = () => {
    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    /* Points */
    for (const p of points) {
      p.x += p.vx;
      p.y += p.vy;

      if (
        p.x < -20 ||
        p.x > width + 20
      ) {
        p.vx *= -1;
      }

      if (
        p.y < -20 ||
        p.y > height + 20
      ) {
        p.vy *= -1;
      }

      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.hypot(dx, dy);

      if (
        dist < 140 &&
        dist > 0
      ) {
        p.x += (dx / dist) * 0.35;
        p.y += (dy / dist) * 0.35;
      }

      ctx.beginPath();

      ctx.arc(
        p.x,
        p.y,
        p.r,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        'rgba(199,255,61,.42)';

      ctx.fill();
    }

    /* Connections */
    for (
      let i = 0;
      i < points.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < points.length;
        j++
      ) {
        const a = points[i];
        const b = points[j];

        const dx = a.x - b.x;
        const dy = a.y - b.y;

        const dist = Math.hypot(
          dx,
          dy
        );

        if (dist < 105) {
          ctx.strokeStyle =
            `rgba(124,92,255,${(1 - dist / 105) * 0.16})`;

          ctx.lineWidth = 0.7;

          ctx.beginPath();

          ctx.moveTo(
            a.x,
            a.y
          );

          ctx.lineTo(
            b.x,
            b.y
          );

          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(loop);
  };

  /* =========================
     EVENTS
  ========================= */
  window.addEventListener(
    'resize',
    resize,
    { passive: true }
  );

  window.addEventListener(
    'pointermove',
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    },
    { passive: true }
  );

  /* =========================
     START
  ========================= */
  resize();
  loop();
})();
