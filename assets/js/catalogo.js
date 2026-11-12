/* Renderiza os catálogos de veículos e imóveis com os anúncios cadastrados no painel (api/catalogo.php) */
(function () {
  var root = document.querySelector('[data-catalogo]');
  if (!root) return;

  var tipo = root.getAttribute('data-catalogo'); // 'veiculos' | 'imoveis'
  var itens = [];
  var lista = document.getElementById('lista');
  var q = document.getElementById('f-busca');
  var ordem = document.getElementById('f-ordem');
  var cat = document.getElementById('f-categoria');   // tipo do imóvel
  var fin = document.getElementById('f-finalidade');  // venda / aluguel

  var ICON = {
    veiculos: '<svg viewBox="0 0 24 24"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>',
    imoveis: '<svg viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
  };
  var CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
  var CHEV_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
  var WA = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.2 20.8l1.3-4.6A8.7 8.7 0 1 1 8 19.6l-4.8 1.2z"/><path d="M9.2 7.9c-.3 0-.7.2-.9.6-.3.5-.4 1.2-.1 2 .6 1.6 2.4 3.6 4.3 4.5.9.4 1.8.5 2.4.1.4-.3.6-.7.5-1l-.1-.3-1.8-.9c-.2-.1-.4 0-.6.2l-.5.6c-1-.4-2-1.4-2.4-2.4l.5-.5c.2-.2.2-.4.1-.6l-.8-1.8c-.1-.3-.4-.5-.6-.5z"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) { return Number(n).toLocaleString('pt-BR'); }

  function titulo(it) {
    return tipo === 'veiculos' ? (it.marca + ' ' + it.modelo) : it.titulo;
  }

  function midia(it) {
    var badge = it.status === 'reservado' ? '<span class="badge">Reservado</span>'
      : (it.finalidade === 'Aluguel' ? '<span class="badge">Aluguel</span>' : '');
    if (it.fotos && it.fotos.length) {
      var imgs = it.fotos.map(function (f, i) {
        return '<img src="' + esc(f) + '" alt="' + esc(titulo(it)) + ' — foto ' + (i + 1) + '" loading="lazy">';
      }).join('');
      var setas = it.fotos.length > 1
        ? '<button class="nav-btn prev" type="button" aria-label="Foto anterior">' + CHEV_L + '</button>' +
          '<button class="nav-btn next" type="button" aria-label="Próxima foto">' + CHEV_R + '</button>'
        : '';
      return '<div class="media"><div class="strip">' + imgs + '</div>' + setas + badge + '</div>';
    }
    return '<div class="media"><div class="ph">' + ICON[tipo] + '<span>Foto em breve</span></div>' + badge + '</div>';
  }

  function specs(it) {
    var s = [];
    if (tipo === 'veiculos') {
      s.push(it.ano, num(it.km) + ' km', it.cambio, it.combustivel);
      if (it.cor) s.push(it.cor);
    } else {
      s.push(it.tipo);
      if (it.quartos) s.push(it.quartos + (it.quartos > 1 ? ' quartos' : ' quarto'));
      if (it.banheiros) s.push(it.banheiros + (it.banheiros > 1 ? ' banheiros' : ' banheiro'));
      if (it.vagas) s.push(it.vagas + (it.vagas > 1 ? ' vagas' : ' vaga'));
      if (it.area) s.push(num(it.area) + ' m²');
    }
    return '<ul class="specs">' + s.filter(Boolean).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
  }

  function card(it) {
    var nome = titulo(it);
    var sub = tipo === 'imoveis' ? '<p class="sub">' + esc(it.bairro) + ' · ' + esc(it.cidade) + '</p>' : '';
    var msg = tipo === 'veiculos'
      ? 'Olá, Alisson! Tenho interesse no ' + nome + ' ' + it.ano + ' que vi no seu site. Ainda está disponível?'
      : 'Olá, Alisson! Tenho interesse no imóvel "' + nome + '" (' + it.bairro + ') que vi no seu site. Ainda está disponível?';
    var preco = brlSafe(it.preco) + (it.finalidade === 'Aluguel' ? ' <small>/ mês</small>' : '');
    var podeSimular = tipo === 'veiculos' || it.finalidade !== 'Aluguel';
    var simular = podeSimular
      ? '<a class="btn" href="financiamento.html?tipo=' + (tipo === 'veiculos' ? 'veiculo' : 'imovel') + '&valor=' + encodeURIComponent(it.preco) + '">Simular</a>'
      : '<span></span>';
    var href = 'anuncio.php?tipo=' + tipo + '&id=' + encodeURIComponent(it.id);
    return '<article class="card" data-href="' + esc(href) + '">' + midia(it) +
      '<div class="card-body"><h3><a href="' + esc(href) + '">' + esc(nome) + '</a></h3>' + sub + specs(it) + (it.descricao ? '<p class="sub desc">' + esc(it.descricao) + '</p>' : '') + '<p class="price metal">' + preco + '</p><a class="mais" href="' + esc(href) + '">Ver detalhes completos →</a></div>' +
      '<div class="card-actions"><a class="btn btn-primary" href="' + waLink(msg) + '" target="_blank" rel="noopener">' + WA + 'Tenho interesse</a>' + simular + '</div>' +
      '</article>';
  }

  function brlSafe(v) { return isFinite(v) ? window.brl(v) : 'Consulte'; }

  function aplicar() {
    var termo = q ? q.value.trim().toLowerCase() : '';
    var out = itens.filter(function (it) {
      if (termo) {
        var alvo = (tipo === 'veiculos'
          ? [it.marca, it.modelo, it.ano, it.cor, it.cambio, it.combustivel]
          : [it.titulo, it.tipo, it.bairro, it.cidade]).join(' ').toLowerCase();
        if (alvo.indexOf(termo) === -1) return false;
      }
      if (cat && cat.value && it.tipo !== cat.value) return false;
      if (fin && fin.value && it.finalidade !== fin.value) return false;
      return true;
    });
    var o = ordem ? ordem.value : '';
    if (o === 'menor') out.sort(function (a, b) { return a.preco - b.preco; });
    if (o === 'maior') out.sort(function (a, b) { return b.preco - a.preco; });
    if (o === 'novo') out.sort(function (a, b) { return (b.ano || 0) - (a.ano || 0); });

    if (out.length) { lista.innerHTML = out.map(card).join(''); return; }
    var wa = '<br><a class="btn btn-primary" style="margin-top:16px" href="' + waLink(tipo === 'veiculos'
      ? 'Olá, Alisson! Estou procurando um veículo. Pode me ajudar?'
      : 'Olá, Alisson! Estou procurando um imóvel. Pode me ajudar?') + '" target="_blank" rel="noopener">' + WA + 'Falar no WhatsApp</a>';
    lista.innerHTML = itens.length
      ? '<div class="empty">Nenhum resultado com esses filtros.<br>Me chame no WhatsApp — posso procurar para você!' + wa + '</div>'
      : '<div class="empty"><strong>Novos anúncios em breve.</strong><br>Enquanto isso, me diga o que você procura e eu encontro para você.' + wa + '</div>';
  }

  function montarFiltros() {
    if (!cat) return;
    var tipos = Array.from(new Set(itens.map(function (i) { return i.tipo; }))).sort();
    cat.innerHTML = '<option value="">Todos</option>' + tipos.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('');
  }

  [q, ordem, cat, fin].forEach(function (el) { if (el) el.addEventListener('input', aplicar); });

  // setas do carrossel de fotos
  lista.addEventListener('click', function (e) {
    var b = e.target.closest('.nav-btn');
    if (!b) {
      // clique em qualquer parte do cartão (menos links/botões) abre o anúncio completo
      if (e.target.closest('a, button, input, select, textarea') || e.button) return;
      var c = e.target.closest('.card[data-href]');
      if (c) location.href = c.getAttribute('data-href');
      return;
    }
    var strip = b.parentElement.querySelector('.strip');
    strip.scrollBy({ left: (b.classList.contains('next') ? 1 : -1) * strip.clientWidth, behavior: 'smooth' });
  });

  function usar(lista) { itens = lista || []; montarFiltros(); aplicar(); }

  function erro(motivo) {
    lista.innerHTML = '<div class="empty"><strong>Não consegui carregar os anúncios agora.</strong><br>' +
      'Atualize a página em instantes ou fale comigo no WhatsApp.' +
      '<br><button type="button" class="btn" id="b-tentar" style="margin-top:16px">Tentar de novo</button>' +
      '<br><small style="opacity:.6;display:inline-block;margin-top:12px">(' + esc(motivo) + ')</small></div>';
    var b = document.getElementById('b-tentar');
    if (b) b.addEventListener('click', carregar);
  }

  function carregar() {
    lista.innerHTML = '<div class="empty">Carregando…</div>';
    // o número no fim muda a cada acesso, então nenhuma cópia guardada (navegador, servidor ou CDN) é reaproveitada
    fetch('api/catalogo.php?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('servidor respondeu ' + r.status);
        return r.json().catch(function () { throw new Error('resposta inválida'); });
      })
      .then(function (d) {
        if (!d || !Array.isArray(d[tipo])) throw new Error('lista ausente');
        usar(d[tipo]);
      })
      .catch(function (e) { erro(e && e.message ? e.message : 'sem conexão'); });
  }

  carregar();
})();
