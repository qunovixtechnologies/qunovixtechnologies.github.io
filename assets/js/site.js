(() => {
  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ($('yr')) $('yr').textContent = new Date().getFullYear();

  // Nav: border on scroll + mobile menu
  const nav = $('nav'), menuBtn = $('menuBtn');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, {passive:true}); onScroll();
  }
  if (nav && menuBtn) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    document.querySelectorAll('#navLinks a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false);
    }));
  }

  // Reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), {threshold:.12, rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  // Icon fan spreads after load
  const fan = $('fan');
  if (fan) setTimeout(() => fan.classList.add('spread'), reduce ? 0 : 450);

  // Index hover preview that follows the cursor
  const peek = $('peek');
  if (peek) {
    const imgs = peek.querySelectorAll('img');
    let tx = 0, ty = 0, x = 0, y = 0, raf = null;
    const loop = () => {
      x += (tx - x) * .18; y += (ty - y) * .18;
      peek.style.left = x + 'px'; peek.style.top = y + 'px';
      raf = Math.abs(tx - x) + Math.abs(ty - y) > .5 ? requestAnimationFrame(loop) : null;
    };
    document.querySelectorAll('#index a').forEach(a => {
      a.addEventListener('mouseenter', e => {
        if (!matchMedia('(hover:hover) and (min-width:861px)').matches) return;
        if (!peek.classList.contains('on')) { x = tx = e.clientX + 140; y = ty = e.clientY; }
        imgs.forEach(i => i.classList.toggle('on', i.dataset.k === a.dataset.peek));
        peek.classList.add('on');
      });
      a.addEventListener('mousemove', e => { tx = e.clientX + 140; ty = e.clientY; if (!raf) raf = requestAnimationFrame(loop); });
      a.addEventListener('mouseleave', () => peek.classList.remove('on'));
    });
  }

  // Range track fill
  const fill = r => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%');

  // BMI gauge (WHO bands, as used in the BMI Calculator app)
  if ($('bmiVal')) {
    const MIN = 15, MAX = 40, C = 100, R = 80;
    const pt = v => { const a = Math.PI - (Math.min(Math.max(v, MIN), MAX) - MIN) / (MAX - MIN) * Math.PI; return [C + R * Math.cos(a), C - R * Math.sin(a)]; };
    const arcs = $('arcs');
    [[15, 18.5, '#7FB3E8'], [18.5, 25, '#149C78'], [25, 30, '#F2B233'], [30, 40, '#E5533D']].forEach(([a, b, c]) => {
      const [x1, y1] = pt(a + .15), [x2, y2] = pt(b - .15);
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}`);
      p.setAttribute('stroke', c); arcs.appendChild(p);
    });
    const h = $('h'), w = $('w'), needle = $('needle');
    const cats = [[16, 'Very severely underweight'], [17, 'Severely underweight'], [18.5, 'Underweight'], [25, 'Normal weight'], [30, 'Overweight'], [35, 'Obesity class I'], [40, 'Obesity class II'], [Infinity, 'Obesity class III']];
    const bmi = () => {
      const m = h.value / 100, v = w.value / (m * m);
      $('hOut').textContent = h.value + ' cm';
      $('wOut').textContent = w.value + ' kg';
      $('bmiVal').textContent = v.toFixed(1);
      const lo = (18.5 * m * m).toFixed(1), hi = (24.9 * m * m).toFixed(1);
      $('bmiCat').textContent = cats.find(c => v < c[0])[1] + ' · healthy ' + lo + '–' + hi + ' kg';
      const t = (Math.min(Math.max(v, MIN), MAX) - MIN) / (MAX - MIN);
      needle.style.transform = `rotate(${t * 180}deg)`;
      fill(h); fill(w);
    };
    [h, w].forEach(i => i.addEventListener('input', bmi)); bmi();
  }

  // EMI
  if ($('emi')) {
    const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
    const short = n => n >= 1e7 ? '₹' + (n / 1e7).toFixed(2) + ' Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(2) + ' L' : inr(n);
    const amt = $('amt'), rate = $('rate'), yrs = $('yrs');
    const emi = () => {
      const P = +amt.value, r = rate.value / 1200, n = yrs.value * 12;
      const e = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1), total = e * n, I = total - P;
      $('amtOut').textContent = inr(P);
      $('rateOut').textContent = (+rate.value).toFixed(1) + '%';
      $('yrsOut').textContent = yrs.value + (yrs.value == 1 ? ' yr' : ' yrs');
      $('emi').innerHTML = inr(e) + ' <small>/mo</small>';
      $('barP').style.width = (P / total * 100) + '%';
      $('barI').style.width = (I / total * 100) + '%';
      $('lp').textContent = short(P);
      $('li').textContent = short(I);
      [amt, rate, yrs].forEach(fill);
    };
    [amt, rate, yrs].forEach(i => i.addEventListener('input', emi)); emi();
  }

  // Screenshot gallery: arrows + lightbox
  const track = $('galleryTrack');
  if (track) {
    const step = () => (track.querySelector('.g-item')?.offsetWidth || 260) + 18;
    const prev = $('gPrev'), next = $('gNext');
    const sync = () => {
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
    };
    prev.addEventListener('click', () => track.scrollBy({left: -step(), behavior: reduce ? 'auto' : 'smooth'}));
    next.addEventListener('click', () => track.scrollBy({left: step(), behavior: reduce ? 'auto' : 'smooth'}));
    track.addEventListener('scroll', sync, {passive:true}); addEventListener('resize', sync); sync();

    const box = $('lightbox'), boxImg = $('lbImg'), items = [...track.querySelectorAll('.g-item')];
    let cur = 0;
    const show = i => { cur = (i + items.length) % items.length; const im = items[cur].querySelector('img'); boxImg.src = im.src; boxImg.alt = im.alt; $('lbCount').textContent = (cur + 1) + ' / ' + items.length; };
    items.forEach((b, i) => b.addEventListener('click', () => { show(i); box.showModal(); }));
    $('lbPrev').addEventListener('click', () => show(cur - 1));
    $('lbNext').addEventListener('click', () => show(cur + 1));
    $('lbClose').addEventListener('click', () => box.close());
    box.addEventListener('click', e => { if (e.target === box) box.close(); });
    box.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  }

  // Tabs (e.g. WHO / DGE classification)
  document.querySelectorAll('[role="tablist"]').forEach(list => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = t => tabs.forEach(x => {
      const on = x === t;
      x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
      $(x.getAttribute('aria-controls')).hidden = !on;
    });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; select(n); n.focus(); }
      });
    });
  });
})();
