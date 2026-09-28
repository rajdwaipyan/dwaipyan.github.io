(() => {
  document.documentElement.classList.add('js-enabled');
  
  const body = document.body;
  const header = document.getElementById('header');
  const nav = document.getElementById('nav');
  const menuBtn = document.getElementById('menuBtn');
  const cursor = document.querySelector('.cursor');
  const canvas = document.getElementById('scene');
  const ctx = canvas?.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  // Mobile menu.
  menuBtn?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'CLOSE' : 'MENU';
  });

  nav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      body.classList.remove('nav-open');
      menuBtn?.setAttribute('aria-expanded', 'false');

      if (menuBtn) {
        menuBtn.textContent = 'MENU';
      }
    });
  });

  // Header state.
  const updateScroll = () => {
    header?.classList.toggle('scrolled', window.scrollY > 20);
  };

  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  // Reveal-on-scroll.
  const reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && !reduced) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12
      }
    );

    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  // Cursor + pointer variables.
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
      {
        passive: true
      }
    );

    document
      .querySelectorAll('a,button,.project')
      .forEach((el) => {
        el.addEventListener('mouseenter', () => {
          cursor?.classList.add('active');
        });

        el.addEventListener('mouseleave', () => {
          cursor?.classList.remove('active');
        });
      });

    document.querySelectorAll('.project').forEach((project) => {
      project.addEventListener('mouseenter', () => {
        if (cursor) {
          const label = project.dataset.project;

          cursor.querySelector('span').textContent =
            label ? `OPEN ${label}` : 'OPEN';
        }
      });

      project.addEventListener('mouseleave', () => {
        if (cursor) {
          cursor.querySelector('span').textContent = 'OPEN';
        }
      });
    });

    // Gentle magnetic pull for marked links.
    if (!reduced) {
      document.querySelectorAll('.magnetic').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();

          const x =
            ((e.clientX - r.left) / r.width - 0.5) * 8;

          const y =
            ((e.clientY - r.top) / r.height - 0.5) * 8;

          el.style.transform =
            `translate(${x}px,${y}px)`;
        });

        el.addEventListener('pointerleave', () => {
          el.style.transform = '';
        });
      });
    }
  }

  // Lightweight WebGL-like ambient canvas:
  // soft moving particles/curves rather than a generic starfield.
  if (!canvas || !ctx || reduced) return;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let blobs = [];

  const mouse = {
    x: 0.5,
    y: 0.5
  };

  const resize = () => {
    dpr = Math.min(
      2,
      window.devicePixelRatio || 1
    );

    w = window.innerWidth;
    h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    blobs = Array.from(
      {
        length: 5
      },
      (_, i) => ({
        x:
          w * (0.18 + i * 0.17) +
          Math.random() * 90,

        y:
          h * (0.2 + (i % 2) * 0.5),

        r:
          110 +
          Math.random() * 170,

        a:
          Math.random() *
          Math.PI *
          2,

        s:
          0.00035 +
          Math.random() * 0.0005
      })
    );
  };

  window.addEventListener(
    'resize',
    resize,
    {
      passive: true
    }
  );

  window.addEventListener(
    'pointermove',
    (e) => {
      mouse.x = e.clientX / w;
      mouse.y = e.clientY / h;
    },
    {
      passive: true
    }
  );

  const draw = (t) => {
    ctx.clearRect(
      0,
      0,
      w,
      h
    );

    blobs.forEach((b, i) => {
      b.a += b.s * 16;

      const px =
        b.x +
        Math.sin(b.a + i) * 65 +
        (mouse.x - 0.5) *
          (i + 1) *
          28;

      const py =
        b.y +
        Math.cos(b.a * 1.3 + i) * 55 +
        (mouse.y - 0.5) *
          (i + 1) *
          18;

      const grad =
        ctx.createRadialGradient(
          px,
          py,
          0,
          px,
          py,
          b.r
        );

      const hue =
        i % 2 === 0
          ? '216,255,62'
          : '124,92,255';

      grad.addColorStop(
        0,
        `rgba(${hue},.07)`
      );

      grad.addColorStop(
        0.42,
        `rgba(${hue},.022)`
      );

      grad.addColorStop(
        1,
        'rgba(255,255,255,0)'
      );

      ctx.fillStyle = grad;

      ctx.beginPath();

      ctx.arc(
        px,
        py,
        b.r,
        0,
        Math.PI * 2
      );

      ctx.fill();
    });

    // Fine wave lines to add a subtle experimental feel.
    ctx.lineWidth = 0.65;

    for (
      let band = 0;
      band < 5;
      band++
    ) {
      ctx.beginPath();

      for (
        let x = -20;
        x <= w + 20;
        x += 18
      ) {
        const y =
          h *
            (0.17 + band * 0.17) +
          Math.sin(
            x * 0.008 +
              t * 0.00025 +
              band
          ) *
            20;

        if (x === -20) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle =
        band % 2
          ? 'rgba(18,18,18,.028)'
          : 'rgba(124,92,255,.022)';

      ctx.stroke();
    }

    requestAnimationFrame(draw);
  };

  resize();
  requestAnimationFrame(draw);
})();
