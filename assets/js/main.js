/* Comportamentos comuns a todas as páginas */
(function () {
  var S = window.SITE;

  // ---- Botões flutuantes (WhatsApp + Instagram) ----
  var floaters = document.createElement('div');
  floaters.className = 'floaters';
  floaters.innerHTML =
    '<a class="fab" href="https://instagram.com/' + S.instagram + '" target="_blank" rel="noopener" aria-label="Instagram @' + S.instagram + '">' +
      '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.3" cy="6.7" r="0.6" fill="currentColor"/></svg>' +
      '<span class="fab-label">Instagram</span></a>' +
    '<a class="fab" href="' + window.waLink() + '" target="_blank" rel="noopener" aria-label="Chamar no WhatsApp">' +
      '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.2 20.8l1.3-4.6A8.7 8.7 0 1 1 8 19.6l-4.8 1.2z"/><path d="M9.2 7.9c-.3 0-.7.2-.9.6-.3.5-.4 1.2-.1 2 .6 1.6 2.4 3.6 4.3 4.5.9.4 1.8.5 2.4.1.4-.3.6-.7.5-1l-.1-.3-1.8-.9c-.2-.1-.4 0-.6.2l-.5.6c-1-.4-2-1.4-2.4-2.4l.5-.5c.2-.2.2-.4.1-.6l-.8-1.8c-.1-.3-.4-.5-.6-.5z"/></svg>' +
      '<span class="fab-label">WhatsApp</span></a>';
  document.body.appendChild(floaters);

  // ---- Links de contato estáticos (rodapé) ----
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    a.href = window.waLink(a.getAttribute('data-wa') || undefined);
    a.target = '_blank'; a.rel = 'noopener';
  });
  document.querySelectorAll('[data-wa-num]').forEach(function (el) { el.textContent = S.whatsappExibicao; });
  document.querySelectorAll('[data-ig]').forEach(function (a) {
    a.href = 'https://instagram.com/' + S.instagram; a.target = '_blank'; a.rel = 'noopener';
    if (a.hasAttribute('data-ig-text')) a.textContent = '@' + S.instagram;
  });
  document.querySelectorAll('[data-creci]').forEach(function (el) {
    if (S.creci) { el.textContent = S.creci; } else { el.hidden = true; }
  });
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // ---- Logo AO em 3D: camadas empilhadas + giro ao passar o mouse ----
  var logo = document.querySelector('[data-logo3d]');
  if (logo) {
    var body = logo.querySelector('.ao3d');
    var front = body.querySelector('img');
    var N = 14, STEP = 1.5, HALF = (N - 1) * STEP / 2;
    var sideSrc = logo.getAttribute('data-side');
    var sideImgs = [];
    for (var i = 0; i < N; i++) {
      var im = new Image();
      im.alt = ''; im.setAttribute('aria-hidden', 'true'); im.draggable = false;
      var isFace = (i === 0 || i === N - 1);
      im.src = isFace ? front.getAttribute('src') : sideSrc;
      im.style.transform = 'translateZ(' + (HALF - i * STEP).toFixed(2) + 'px)';
      body.insertBefore(im, front);
      sideImgs.push(im);
    }
    // a imagem original (nítida) fica na frente das camadas
    front.style.transform = 'translateZ(' + (HALF + 0.4).toFixed(2) + 'px)';
    body.appendChild(front);
    // a camada frontal duplicada some atrás da imagem original; a traseira fica como verso
    sideImgs[0].remove();

    // Giro ao passar o mouse. É um movimento disparado pelo próprio visitante,
    // então ele acontece sempre; só não repete em loop quando o sistema pede
    // "reduzir animações".
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var spinning = false, hovering = false;
    var spin = function () {
      if (spinning) return;
      spinning = true;
      var done = function () {
        spinning = false;
        if (hovering && !reduce) spin();
      };
      if (!body.animate) {            // navegador muito antigo: usa transição CSS
        body.style.transition = 'transform 1.2s ease-in-out';
        body.style.transform = 'rotateY(360deg)';
        setTimeout(function () {
          body.style.transition = 'none'; body.style.transform = 'rotateY(0deg)';
          setTimeout(done, 30);
        }, 1250);
        return;
      }
      var a = body.animate(
        [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(360deg)' }],
        { duration: reduce ? 1000 : 1500, easing: 'cubic-bezier(.5,.05,.25,1)' }
      );
      a.onfinish = done;
      a.oncancel = done;
    };
    logo.addEventListener('pointerenter', function () { hovering = true; spin(); });
    logo.addEventListener('mouseenter', function () { hovering = true; spin(); });
    logo.addEventListener('pointerleave', function () { hovering = false; });
    logo.addEventListener('mouseleave', function () { hovering = false; });
    logo.addEventListener('click', spin); // toque no celular
  }
})();
