(() => {
  'use strict';

  /* ============ PRELOADER ============ */
  const preloader = document.getElementById('preloader');
  const bootPct = document.getElementById('boot-pct');
  const bootClock = document.getElementById('boot-clock');
  const bootLines = document.querySelectorAll('.boot-line');
  const seenBefore = sessionStorage.getItem('sd_visited');

  function updateClock(){
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    if (bootClock) bootClock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  const clockTimer = setInterval(updateClock, 1000);
  updateClock();

  function finishPreload(){
    clearInterval(clockTimer);
    if (preloader){
      preloader.classList.add('done');
      setTimeout(() => preloader.remove(), 900);
    }
    document.body.style.overflow = '';
    sessionStorage.setItem('sd_visited', '1');
  }

  if (seenBefore && preloader){
    preloader.remove();
  } else if (preloader) {
    document.body.style.overflow = 'hidden';
    let pct = 0;
    const pctTimer = setInterval(() => {
      pct = Math.min(100, pct + Math.round(6 + Math.random()*14));
      bootPct.textContent = String(pct).padStart(2,'0') + '%';
      if (pct >= 100) clearInterval(pctTimer);
    }, 130);

    bootLines.forEach((line, i) => {
      setTimeout(() => line.classList.add('on'), 220 + i * 170);
    });

    const totalDelay = 220 + bootLines.length * 170 + 350;
    setTimeout(finishPreload, Math.max(totalDelay, 1400));

    preloader.addEventListener('click', finishPreload);
  }

  /* ============ SCROLL PROGRESS ============ */
  const progressBar = document.getElementById('scroll-progress');
  function updateProgress(){
    const h = document.documentElement;
    const scrollTop = h.scrollTop || document.body.scrollTop;
    const scrollHeight = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
    const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
  }

  /* ============ HEADER SHOW/HIDE ============ */
  const header = document.getElementById('site-header');
  let lastScrollY = window.scrollY;
  function updateHeader(){
    const y = window.scrollY;
    if (!header) return;
    header.classList.toggle('scrolled', y > 40);
    if (y > lastScrollY && y > 160){
      header.classList.add('hide');
    } else {
      header.classList.remove('hide');
    }
    lastScrollY = y;
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking){
      requestAnimationFrame(() => {
        updateProgress();
        updateHeader();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive:true });
  updateProgress();
  updateHeader();

  /* ============ MOBILE NAV ============ */
  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('main-nav');
  if (navToggle && mainNav){
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('open');
      mainNav.classList.toggle('open');
      document.body.style.overflow = mainNav.classList.contains('open') ? 'hidden' : '';
    });
    mainNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navToggle.classList.remove('open');
        mainNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ============ REVEAL ON SCROLL ============ */
  const revealEls = document.querySelectorAll('[data-reveal], [data-reveal-group]');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold:0.12, rootMargin:'0px 0px -60px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));

  /* ============ COUNT-UP NUMBERS ============ */
  const countEls = document.querySelectorAll('[data-count]');
  function animateCount(el){
    const target = parseInt(el.getAttribute('data-count'), 10) || 0;
    const duration = 1200;
    const start = performance.now();
    function tick(now){
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = String(target);
    }
    requestAnimationFrame(tick);
  }
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  }, { threshold:0.6 });
  countEls.forEach(el => countObserver.observe(el));

  /* ============ HERO ROLE ROTATOR ============ */
  const roleText = document.getElementById('role-text');
  const roles = [
    'Tooling Design Engineer Intern — Lockheed Martin Sikorsky',
    'Drivetrain Engineer — Purdue Electric Racing'
  ];
  if (roleText){
    let idx = 0;
    setInterval(() => {
      roleText.classList.add('fade');
      setTimeout(() => {
        idx = (idx + 1) % roles.length;
        roleText.textContent = roles[idx];
        roleText.classList.remove('fade');
      }, 350);
    }, 3200);
  }

  /* ============ HERO CROSSHAIR + CALLOUTS ============ */
  const heroVisual = document.getElementById('hero-visual');
  const crosshair = document.getElementById('hero-crosshair');
  const crosshairLabel = document.getElementById('crosshair-label');
  if (heroVisual && crosshair && crosshairLabel){
    heroVisual.addEventListener('mousemove', (e) => {
      const rect = heroVisual.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      crosshair.style.transform = `translate(${x}px, ${y}px)`;
      crosshairLabel.textContent = `X ${String(Math.round(x)).padStart(4,'0')} · Y ${String(Math.round(y)).padStart(4,'0')}`;
    });
    heroVisual.addEventListener('mouseleave', () => {
      crosshairLabel.textContent = 'X 0000 · Y 0000';
    });
  }

  ['callout-1','callout-2','callout-3'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) setTimeout(() => el.classList.add('show'), 1600 + i * 350);
  });

  /* ============ EXPERIENCE ACCORDION ============ */
  const expToggles = document.querySelectorAll('[data-exp-toggle]');
  expToggles.forEach(toggle => {
    const card = toggle.closest('.exp-card');
    const body = card.querySelector('.exp-body');
    const inner = body.querySelector('.exp-body-inner');
    toggle.addEventListener('click', () => {
      const isOpen = card.classList.contains('open');
      // close all
      document.querySelectorAll('.exp-card.open').forEach(c => {
        c.classList.remove('open');
        c.querySelector('.exp-body').style.maxHeight = null;
      });
      if (!isOpen){
        card.classList.add('open');
        body.style.maxHeight = inner.scrollHeight + 40 + 'px';
      }
    });
  });
  // open first experience card by default
  if (expToggles.length){
    expToggles[0].click();
  }
  window.addEventListener('resize', () => {
    document.querySelectorAll('.exp-card.open').forEach(c => {
      const inner = c.querySelector('.exp-body-inner');
      c.querySelector('.exp-body').style.maxHeight = inner.scrollHeight + 40 + 'px';
    });
  });

  /* ============ PROJECT GALLERIES + LIGHTBOX ============ */
  const galleries = {
    upright: [
      { src:'assets/images/upright-cad-01.jpg', title:'Unibody Upright CAD', desc:'Rear upright & planet carrier — primary design view.' },
      { src:'assets/images/upright-cad-02.jpg', title:'Unibody Upright CAD', desc:'Alternate angle showing the bearing bore and mounting ears.' },
      { src:'assets/images/upright-wheel-cad-01.jpg', title:'Full Wheel Assembly', desc:'Upright integrated into the wheel, hub, and gear stack.' },
      { src:'assets/images/upright-wheel-cad-02.jpg', title:'Full Wheel Assembly', desc:'Rear-angle cutaway showing the planetary gear stack.' },
      { src:'assets/images/upright-fea.jpg', title:'FEA Validation', desc:'Rear upright / hub group stress analysis in Ansys.' },
      { src:'assets/images/upright-cam-01-roughing.jpg', title:'5-Axis Roughing', desc:'CAM roughing toolpaths for the rear wheel upright.' },
      { src:'assets/images/upright-cam-02-roughing2.jpg', title:'5-Axis Roughing', desc:'Roughing pass on the mounting flange and boss features.' },
      { src:'assets/images/upright-cam-03-finishing.jpg', title:'5-Axis Finishing', desc:'Finishing flow operation on the bearing bore surface.' },
      { src:'assets/images/upright-5axis-machined.jpg', title:'After 5-Axis Operation', desc:'Upright fresh off the 5-axis mill.' },
      { src:'assets/images/upright-3axis-machined.jpg', title:'After Final 3-Axis Operation', desc:'Completed part after the final 3-axis pass.' }
    ],
    audioeq: [
      { src:'assets/images/audio-eq-schematic.png', title:'LTspice Schematic', desc:'Treble, mid, bass, and master control stages, recombined into a summed output.' }
    ],
    bike: [
      { src:'assets/images/bike-01-frame-assembly.jpg', title:'Top-Level Frame Assembly', desc:'Parametric frame model in Siemens NX.' },
      { src:'assets/images/bike-02-fea-prepped.jpg', title:'Meshed for Analysis', desc:'Frame prepared for meshing in Ansys.' },
      { src:'assets/images/bike-03-fea-stress.jpg', title:'Von Mises Stress Results', desc:'637 MPa max under static load — safety factor ≥ 2.0 maintained.' }
    ],
    topo: [
      { src:'assets/images/topo-01-source.jpg', title:'01 — Source Image', desc:'The portrait photo used to generate the heightmap.' },
      { src:'assets/images/topo-02-heightmap.jpg', title:'02 — Grayscale Heightmap', desc:'Tonal values mapped to elevation.' },
      { src:'assets/images/topo-02b-mesh.jpg', title:'03 — 3D Mesh Conversion', desc:'Heightmap converted to machinable mesh geometry in Fusion 360.' },
      { src:'assets/images/topo-03-mesh-toolpath.jpg', title:'04 — CAM Toolpaths', desc:'Machining toolpaths generated over the mesh surface.' },
      { src:'assets/images/topo-05-stockprep.jpg', title:'05 — Stock Preparation', desc:'Hardwood stock clamped and prepared for machining.' },
      { src:'assets/images/topo-06-router.jpg', title:'06 — CNC Router Operation', desc:'The relief carved into the stock on the CNC router.' },
      { src:'assets/images/topo-07-final.jpg', title:'07 — Final Piece', desc:'The finished carved relief portrait in hardwood.' }
    ]
  };

  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbTitle = document.getElementById('lb-title');
  const lbDesc = document.getElementById('lb-desc');
  const lbCount = document.getElementById('lb-count');
  const lbClose = document.getElementById('lb-close');
  const lbPrev = document.getElementById('lb-prev');
  const lbNext = document.getElementById('lb-next');

  let currentGallery = [];
  let currentIndex = 0;

  function openLightbox(galleryKey, startIndex){
    currentGallery = galleries[galleryKey] || [];
    if (!currentGallery.length) return;
    currentIndex = startIndex || 0;
    renderLightbox();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function renderLightbox(){
    const item = currentGallery[currentIndex];
    if (!item) return;
    lbImg.src = item.src;
    lbImg.alt = item.title;
    lbTitle.textContent = item.title;
    lbDesc.textContent = item.desc;
    lbCount.textContent = `${String(currentIndex + 1).padStart(2,'0')} / ${String(currentGallery.length).padStart(2,'0')}`;
  }
  function closeLightbox(){
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
  function nextImg(){ currentIndex = (currentIndex + 1) % currentGallery.length; renderLightbox(); }
  function prevImg(){ currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length; renderLightbox(); }

  document.querySelectorAll('[data-project]').forEach(el => {
    el.addEventListener('click', () => openLightbox(el.getAttribute('data-project'), parseInt(el.getAttribute('data-idx'), 10) || 0));
  });

  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbNext) lbNext.addEventListener('click', nextImg);
  if (lbPrev) lbPrev.addEventListener('click', prevImg);
  if (lightbox) lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextImg();
    if (e.key === 'ArrowLeft') prevImg();
  });

  /* ============ TOPOGRAPHY VIDEO PREVIEWS (play on scroll into view) ============ */
  const videoPreviews = document.querySelectorAll('.video-preview');
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const vid = entry.target;
      if (entry.isIntersecting){
        vid.play().catch(() => {});
      } else {
        vid.pause();
        vid.currentTime = 0;
      }
    });
  }, { threshold:0.4 });
  videoPreviews.forEach(vid => videoObserver.observe(vid));

  /* ============ VIDEO LIGHTBOX (full machining clips) ============ */
  const topoVideos = [
    { src:'assets/video/topo-video-1.mp4', title:'Machining Pass — Video 1' },
    { src:'assets/video/topo-video-2.mp4', title:'Machining Pass — Video 2' },
    { src:'assets/video/topo-video-3.mp4', title:'Machining Pass — Video 3' }
  ];

  const videoLightbox = document.getElementById('video-lightbox');
  const vlbVideo = document.getElementById('vlb-video');
  const vlbTitle = document.getElementById('vlb-title');
  const vlbCount = document.getElementById('vlb-count');
  const vlbClose = document.getElementById('vlb-close');
  const vlbPrev = document.getElementById('vlb-prev');
  const vlbNext = document.getElementById('vlb-next');

  let currentVideoIndex = 0;

  function openVideoLightbox(startIndex){
    currentVideoIndex = startIndex || 0;
    renderVideoLightbox();
    videoLightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function renderVideoLightbox(){
    const item = topoVideos[currentVideoIndex];
    if (!item) return;
    vlbVideo.src = item.src;
    vlbVideo.load();
    vlbVideo.play().catch(() => {});
    vlbTitle.textContent = item.title;
    vlbCount.textContent = `${String(currentVideoIndex + 1).padStart(2,'0')} / ${String(topoVideos.length).padStart(2,'0')}`;
  }
  function closeVideoLightbox(){
    videoLightbox.classList.remove('open');
    vlbVideo.pause();
    vlbVideo.removeAttribute('src');
    vlbVideo.load();
    document.body.style.overflow = '';
  }
  function nextVideo(){ currentVideoIndex = (currentVideoIndex + 1) % topoVideos.length; renderVideoLightbox(); }
  function prevVideo(){ currentVideoIndex = (currentVideoIndex - 1 + topoVideos.length) % topoVideos.length; renderVideoLightbox(); }

  document.querySelectorAll('.video-item[data-video-idx]').forEach(el => {
    el.addEventListener('click', () => openVideoLightbox(parseInt(el.getAttribute('data-video-idx'), 10) || 0));
  });

  if (vlbClose) vlbClose.addEventListener('click', closeVideoLightbox);
  if (vlbNext) vlbNext.addEventListener('click', nextVideo);
  if (vlbPrev) vlbPrev.addEventListener('click', prevVideo);
  if (videoLightbox) videoLightbox.addEventListener('click', (e) => { if (e.target === videoLightbox) closeVideoLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (!videoLightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeVideoLightbox();
    if (e.key === 'ArrowRight') nextVideo();
    if (e.key === 'ArrowLeft') prevVideo();
  });

  /* ============ SMOOTH ANCHOR OFFSET (account for fixed header) ============ */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top:y, behavior:'smooth' });
    });
  });

})();
