(() => {
  const body = document.body;
  const topbar = document.getElementById('topbar');
  const menuButton = document.getElementById('menu-button');
  const menuOverlay = document.getElementById('menu-overlay');
  const cursor = document.querySelector('.cursor');
  const canvas = document.getElementById('motion-canvas');
  const ctx = canvas?.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  // Header.
  const onScroll = () => {
    topbar?.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Menu overlay.
  const setMenu = (open) => {
    menuOverlay?.classList.toggle('open', open);
    menuOverlay?.setAttribute('aria-hidden', String(!open));
    menuButton?.setAttribute('aria-expanded', String(open));
    body.classList.toggle('menu-open', open);
    if (menuButton) menuButton.querySelector('span').textContent = open ? 'CLOSE' : 'MENU';
  };
  menuButton?.addEventListener('click', () => setMenu(!menuOverlay?.classList.contains('open')));
  document.querySelectorAll('[data-menu-link]').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });

  // Reveal elements.
  const revealEls = document.querySelectorAll('.reveal, [data-reveal-text]');
  if ('IntersectionObserver' in window && !reduced) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14 });
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // Magnetic / cursor interaction.
  if (finePointer) {
    window.addEventListener('pointermove', (e) => {
      if (cursor) {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      }
      document.documentElement.style.setProperty('--mx', `${e.clientX}px`);
      document.documentElement.style.setProperty('--my', `${e.clientY}px`);
    }, { passive: true });

    document.querySelectorAll('a,button,.project').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor?.classList.add('active');
      });
      el.addEventListener('mouseleave', () => {
        cursor?.classList.remove('active');
      });
    });

    document.querySelectorAll('.project').forEach((project) => {
      project.addEventListener('mouseenter', () => {
        const label = project.dataset.label || 'VIEW';
        cursor?.querySelector('span')?.replaceChildren(document.createTextNode(label));
      });
      project.addEventListener('mouseleave', () => {
        cursor?.querySelector('span')?.replaceChildren(document.createTextNode('VIEW'));
      });
    });

    if (!reduced) {
      document.querySelectorAll('.magnetic').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width - 0.5) * 10;
          const y = ((e.clientY - r.top) / r.height - 0.5) * 10;
          el.style.transform = `translate(${x}px, ${y}px)`;
        });
        el.addEventListener('pointerleave', () => { el.style.transform = ''; });
      });
    }
  }
/* =========================================================
   INTERACTIVE SERVICES
========================================================= */

const serviceItems =
  document.querySelectorAll('.interactive-service');

if (
  serviceItems.length &&
  finePointer &&
  !reduced
) {
  serviceItems.forEach((service) => {

    const art =
      service.querySelector('.service-art');

    if (!art) return;

    service.addEventListener(
      'pointermove',
      (e) => {
        const rect =
          service.getBoundingClientRect();

        const x =
          ((e.clientX - rect.left) / rect.width - 0.5);

        const y =
          ((e.clientY - rect.top) / rect.height - 0.5);

        art.style.setProperty(
          '--service-x',
          `${x * 12}px`
        );

        art.style.setProperty(
          '--service-y',
          `${y * 12}px`
        );

        art.style.transform =
          `translate3d(
            var(--service-x),
            var(--service-y),
            0
          )`;
      },
      { passive: true }
    );

    service.addEventListener(
      'pointerleave',
      () => {
        art.style.transform = '';
        art.style.removeProperty('--service-x');
        art.style.removeProperty('--service-y');
      }
    );

    service.addEventListener(
      'mouseenter',
      () => {
        service.classList.add('is-active');
      }
    );

    service.addEventListener(
      'mouseleave',
      () => {
        service.classList.remove('is-active');
      }
    );
  });
}
  // Subtle canvas motion field.
  if (!canvas || !ctx || reduced) return;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let t = 0;
  let blobs = [];

  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    blobs = Array.from({ length: 5 }, (_, i) => ({
      x: w * (0.08 + i * 0.2),
      y: h * (0.18 + (i % 2) * 0.48),
      r: 160 + Math.random() * 180,
      phase: Math.random() * Math.PI * 2,
      speed: 0.00015 + Math.random() * 0.00018
    }));
  };

  const draw = (time) => {
    t = time;
    ctx.clearRect(0, 0, w, h);

    blobs.forEach((b, i) => {
      const x = b.x + Math.sin(t * b.speed + b.phase) * 85;
      const y = b.y + Math.cos(t * b.speed * 1.25 + b.phase) * 60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
      const c = i % 2 === 0 ? '215,255,63' : '132,108,255';
      g.addColorStop(0, `rgba(${c},0.045)`);
      g.addColorStop(0.42, `rgba(${c},0.018)`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Fine contour lines.
    ctx.lineWidth = 0.55;
    for (let band = 0; band < 6; band++) {
      ctx.beginPath();
      for (let x = -30; x <= w + 30; x += 18) {
        const y = h * (0.08 + band * 0.17) + Math.sin(x * 0.008 + t * 0.00022 + band * 0.9) * (18 + band * 2);
        if (x === -30) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = band % 2 === 0 ? 'rgba(17,17,17,0.018)' : 'rgba(132,108,255,0.018)';
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  };

  window.addEventListener('resize', resize, { passive: true });
  resize();
  requestAnimationFrame(draw);
})();
