/* Página do anúncio: galeria, tela cheia e compartilhar */
(function () {
  var g = document.querySelector('[data-galeria]');
  var btnShare = document.querySelector('[data-compartilhar]');

  function aviso(t) {
    var el = document.createElement('div');
    el.className = 'toast-a'; el.setAttribute('role', 'status'); el.textContent = t;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  if (btnShare) btnShare.addEventListener('click', function () {
    var d = btnShare.dataset, dados = { title: d.titulo, text: d.texto, url: d.url };
    if (navigator.share) { navigator.share(dados).catch(function () {}); return; }
    var copiar = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(d.url)
      : Promise.reject();
    copiar.then(function () { aviso('Link copiado!'); }, function () { window.prompt('Copie o link:', d.url); });
  });

  if (!g) return;
  var strip = g.querySelector('.gal-strip');
  if (!strip) return;
  var imgs = Array.prototype.slice.call(strip.querySelectorAll('img'));
  var n = imgs.length, atual = 0;
  var thumbs = Array.prototype.slice.call(g.querySelectorAll('.gal-thumbs button'));
  var cont = g.querySelector('.gal-count');

  function marcar(i) {
    atual = i;
    if (cont) cont.textContent = (i + 1) + ' / ' + n;
    thumbs.forEach(function (t, k) {
      if (k === i) t.setAttribute('aria-current', 'true');
      else t.removeAttribute('aria-current');
    });
  }
  function ir(i, suave) {
    i = Math.max(0, Math.min(n - 1, i));
    strip.scrollTo({ left: i * strip.clientWidth, behavior: suave === false ? 'auto' : 'smooth' });
    marcar(i);
  }
  var t;
  strip.addEventListener('scroll', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      var i = Math.round(strip.scrollLeft / strip.clientWidth);
      if (i !== atual) marcar(i);
    }, 60);
  });
  var p = g.querySelector('.nav-btn.prev'), nx = g.querySelector('.nav-btn.next');
  if (p) p.addEventListener('click', function () { ir(atual - 1); });
  if (nx) nx.addEventListener('click', function () { ir(atual + 1); });
  thumbs.forEach(function (b, i) { b.addEventListener('click', function () { ir(i); }); });
  strip.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(atual - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(atual + 1); }
  });

  /* ---- tela cheia ---- */
  var lb = null, lbImg, lbC, lbI = 0, voltarFoco = null;
  var CL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
  var CR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

  function mostrar(i) {
    lbI = (i + n) % n;
    lbImg.src = imgs[lbI].getAttribute('data-full') || imgs[lbI].src;
    lbImg.alt = imgs[lbI].alt;
    lbC.textContent = (lbI + 1) + ' / ' + n;
  }
  function fechar() {
    if (!lb) return;
    document.removeEventListener('keydown', tecla, true);
    lb.remove(); lb = null;
    document.documentElement.style.overflow = '';
    ir(lbI, false);
    if (voltarFoco) voltarFoco.focus();
  }
  function tecla(e) {
    if (e.key === 'Escape') { e.preventDefault(); fechar(); }
    else if (e.key === 'ArrowLeft') mostrar(lbI - 1);
    else if (e.key === 'ArrowRight') mostrar(lbI + 1);
  }
  function abrir(i) {
    voltarFoco = document.activeElement;
    lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Foto em tela cheia');
    lb.innerHTML = '<img alt=""><button class="lb-x" type="button" aria-label="Fechar">✕</button>' +
      (n > 1 ? '<button class="lb-p" type="button" aria-label="Foto anterior">' + CL + '</button><button class="lb-n" type="button" aria-label="Próxima foto">' + CR + '</button>' : '') +
      '<span class="lb-c"></span>';
    document.body.appendChild(lb);
    document.documentElement.style.overflow = 'hidden';
    lbImg = lb.querySelector('img'); lbC = lb.querySelector('.lb-c');
    lb.querySelector('.lb-x').addEventListener('click', fechar);
    var a = lb.querySelector('.lb-p'), b = lb.querySelector('.lb-n');
    if (a) a.addEventListener('click', function () { mostrar(lbI - 1); });
    if (b) b.addEventListener('click', function () { mostrar(lbI + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbImg) { /* toque na foto não fecha */ if (e.target === lb) fechar(); } });
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50 && n > 1) mostrar(lbI + (dx < 0 ? 1 : -1));
    }, { passive: true });
    document.addEventListener('keydown', tecla, true);
    mostrar(i);
    lb.querySelector('.lb-x').focus();
  }
  imgs.forEach(function (im, i) { im.addEventListener('click', function () { abrir(i); }); });
  var z = g.querySelector('.gal-zoom');
  if (z) z.addEventListener('click', function () { abrir(atual); });
})();
