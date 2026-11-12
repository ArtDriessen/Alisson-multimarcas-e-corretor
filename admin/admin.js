/* Painel do Alisson — cadastro de veículos e imóveis */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var estado = { csrf: '', opcoes: null, tipo: 'veiculos', dados: { veiculos: [], imoveis: [] }, iniciado: false };
  var edit = null;           // { tipo, id|null, fotos: [{nome, url, enviando}] }
  var salvando = false;

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function brl(n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); }
  function milhar(n) { return Number(n || 0).toLocaleString('pt-BR'); }
  function soDig(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }

  var toastT;
  function toast(msg, ruim) {
    var t = $('toast'); t.textContent = msg; t.className = 'toast' + (ruim ? ' bad' : ''); t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, ruim ? 9000 : 2600);
  }

  function api(acao, opt) {
    opt = opt || {};
    var init = { method: opt.post ? 'POST' : 'GET', credentials: 'same-origin', headers: {} };
    if (opt.post) init.headers['X-CSRF'] = estado.csrf;
    if (opt.form) init.body = opt.form;
    else if (opt.post) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opt.corpo || {}); }
    return fetch('api.php?action=' + acao, init).then(function (r) {
      return r.json().catch(function () { return { erro: 'Resposta inesperada do servidor.' }; }).then(function (j) {
        if (!r.ok) {
          if (r.status === 401 && acao !== 'login') { mostrar('login'); }
          var e = new Error(j.erro || 'Erro ' + r.status); e.status = r.status; e.dados = j; throw e;
        }
        return j;
      });
    }, function () { throw new Error('Sem conexão com o servidor. Verifique a internet.'); });
  }

  function mostrar(qual) {
    ['load', 'login', 'senha', 'app'].forEach(function (v) { $('v-' + v).hidden = (v !== qual); });
    if (qual === 'login') { $('login-senha').value = ''; setTimeout(function () { $('login-senha').focus(); }, 50); }
  }
  function erroEm(id, msg) { var e = $(id); e.textContent = msg || ''; e.hidden = !msg; }

  /* ---------- login ---------- */
  $('f-login').addEventListener('submit', function (ev) {
    ev.preventDefault(); erroEm('login-erro');
    var btn = ev.target.querySelector('button[type=submit]'); btn.disabled = true;
    api('login', { post: true, corpo: { senha: $('login-senha').value } }).then(function (r) {
      estado.csrf = r.csrf; estado.opcoes = r.opcoes; entrar(r.trocarSenha);
    }).catch(function (e) { erroEm('login-erro', e.message); }).then(function () { btn.disabled = false; });
  });

  function entrar(trocar) {
    if (trocar) { abrirSenha(true); return; }
    mostrar('app'); carregar();
  }

  /* ---------- trocar senha ---------- */
  var senhaObrigatoria = false;
  function abrirSenha(obrigatoria) {
    senhaObrigatoria = !!obrigatoria;
    $('senha-titulo').textContent = obrigatoria ? 'Crie sua senha' : 'Trocar senha';
    $('senha-sub').textContent = obrigatoria ? 'Por segurança, troque a senha inicial por uma só sua (mínimo de 8 caracteres).' : 'Escolha uma nova senha (mínimo de 8 caracteres).';
    $('senha-cancelar').hidden = obrigatoria;
    ['senha-atual', 'senha-nova', 'senha-nova2'].forEach(function (i) { $(i).value = ''; });
    erroEm('senha-erro'); mostrar('senha'); $('senha-atual').focus();
  }
  $('senha-cancelar').addEventListener('click', function () { mostrar('app'); });
  $('f-senha').addEventListener('submit', function (ev) {
    ev.preventDefault(); erroEm('senha-erro');
    if ($('senha-nova').value !== $('senha-nova2').value) { erroEm('senha-erro', 'As duas senhas novas não são iguais.'); return; }
    var btn = ev.target.querySelector('button[type=submit]'); btn.disabled = true;
    api('trocar_senha', { post: true, corpo: { atual: $('senha-atual').value, nova: $('senha-nova').value } }).then(function (r) {
      estado.csrf = r.csrf; toast('Senha alterada.'); mostrar('app'); carregar();
    }).catch(function (e) { erroEm('senha-erro', e.message); }).then(function () { btn.disabled = false; });
  });

  /* ---------- menu da conta ---------- */
  $('b-menu').addEventListener('click', function (e) { e.preventDefault(); $('menu').hidden = !$('menu').hidden; });
  $('m-senha').addEventListener('click', function () { $('menu').hidden = true; abrirSenha(false); });
  $('m-sair').addEventListener('click', function () {
    $('menu').hidden = true;
    api('logout', { post: true }).catch(function () {}).then(function () { estado.csrf = ''; mostrar('login'); });
  });
  document.addEventListener('click', function (e) {
    if (!$('menu').hidden && !e.target.closest('#menu') && !e.target.closest('#b-menu')) $('menu').hidden = true;
  });

  /* ---------- lista ---------- */
  function carregar() {
    api('listar').then(function (r) {
      estado.dados = { veiculos: r.veiculos, imoveis: r.imoveis }; estado.iniciado = r.iniciado; estado.ultimoBackup = r.ultimoBackup;
      desenharLista();
    }).catch(function (e) { toast(e.message, true); });
  }

  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      estado.tipo = t.getAttribute('data-tipo');
      document.querySelectorAll('.tab').forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
      desenharLista();
    });
  });

  function rotuloStatus(s) { return (estado.opcoes && estado.opcoes.status[s]) || s; }

  function desenharLista() {
    var tipo = estado.tipo, itens = estado.dados[tipo];
    $('n-veiculos').textContent = estado.dados.veiculos.length ? '(' + estado.dados.veiculos.length + ')' : '';
    $('n-imoveis').textContent = estado.dados.imoveis.length ? '(' + estado.dados.imoveis.length + ')' : '';
    $('lista-titulo').textContent = tipo === 'veiculos' ? 'Veículos' : 'Imóveis';
    $('b-novo').textContent = tipo === 'veiculos' ? '+ Novo veículo' : '+ Novo imóvel';
    // lembrete de backup: aparece só se já há estoque e o último backup é antigo (ou nunca foi feito)
    var total = estado.dados.veiculos.length + estado.dados.imoveis.length, av = $('aviso-backup');
    var dias = estado.ultimoBackup ? Math.floor((Date.now() / 1000 - estado.ultimoBackup) / 86400) : null;
    if (total && (dias === null || dias >= 14)) {
      av.innerHTML = (dias === null ? 'Você ainda não baixou nenhum backup do estoque. ' : 'Seu último backup foi há <strong>' + dias + ' dias</strong>. ') +
        '<a href="api.php?action=backup" download>Baixar backup completo</a> e guardar no celular, e-mail ou Drive.';
      av.hidden = false;
    } else { av.hidden = true; }
    var l = $('lista');
    if (!itens.length) {
      l.innerHTML = '<div class="empty">' + (tipo === 'veiculos' ? 'Nenhum veículo cadastrado ainda.' : 'Nenhum imóvel cadastrado ainda.') + '<br>Toque em <strong>“Novo”</strong> para começar.</div>';
      return;
    }
    l.innerHTML = itens.map(function (it) {
      var nome = tipo === 'veiculos' ? it.marca + ' ' + it.modelo : it.titulo;
      var sub = tipo === 'veiculos'
        ? it.ano + ' · ' + milhar(it.km) + ' km · ' + it.cambio
        : it.tipo + ' · ' + (it.bairro ? it.bairro + ', ' : '') + it.cidade + ' · ' + it.finalidade;
      var foto = it.fotosUrl && it.fotosUrl[0] ? '<img src="' + esc(it.fotosUrl[0]) + '" alt="" loading="lazy">' : 'sem foto';
      var pill = it.status && it.status !== 'disponivel' ? '<span class="pill ' + esc(it.status) + '">' + esc(rotuloStatus(it.status)) + '</span>' : '';
      return '<button type="button" class="item ' + esc(it.status || '') + '" data-id="' + esc(it.id) + '">' +
        '<span class="th">' + foto + '</span>' +
        '<span><span class="t">' + esc(nome) + pill + '</span><span class="s" style="display:block">' + esc(sub) + '</span><span class="p metal" style="display:block">' + brl(it.preco) + (it.finalidade === 'Aluguel' ? ' /mês' : '') + '</span></span>' +
        '</button>';
    }).join('');
  }
  $('lista').addEventListener('click', function (e) {
    var b = e.target.closest('.item'); if (!b) return;
    var id = b.getAttribute('data-id');
    var it = estado.dados[estado.tipo].filter(function (x) { return x.id === id; })[0];
    if (it) abrirForm(it);
  });
  $('b-novo').addEventListener('click', function () { abrirForm(null); });

  /* ---------- formulário ---------- */
  function opts(lista, atual) {
    return lista.map(function (o) { return '<option' + (o === atual ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('');
  }
  function campo(id, rotulo, html, dica) {
    return '<div class="row"><label for="c-' + id + '">' + rotulo + '</label>' + html + (dica ? '<p class="hint">' + dica + '</p>' : '') + '<p class="msg-campo" id="e-' + id + '" hidden></p></div>';
  }
  function inp(id, v, extra) { return '<input class="field" id="c-' + id + '" value="' + esc(v == null ? '' : v) + '" ' + (extra || '') + '>'; }
  function dinheiro(id, v) { return '<div class="money"><span>R$</span><input class="field" id="c-' + id + '" inputmode="numeric" autocomplete="off" value="' + (v ? milhar(v) : '') + '"></div>'; }

  function desenharCampos(tipo, it) {
    it = it || {}; var o = estado.opcoes, h = '';
    if (tipo === 'veiculos') {
      h += '<div class="grid2">' + campo('marca', 'Marca', inp('marca', it.marca, 'maxlength="40" placeholder="Ex.: Honda" autocomplete="off"')) +
        campo('modelo', 'Modelo', inp('modelo', it.modelo, 'maxlength="80" placeholder="Ex.: Civic EXL 2.0" autocomplete="off"')) + '</div>';
      h += '<div class="grid2">' + campo('ano', 'Ano', inp('ano', it.ano, 'inputmode="numeric" maxlength="4" placeholder="2020"')) +
        campo('km', 'Quilometragem', inp('km', it.km != null ? milhar(it.km) : '', 'inputmode="numeric" placeholder="45.000"')) + '</div>';
      h += '<div class="grid2">' + campo('cambio', 'Câmbio', '<select class="field" id="c-cambio">' + opts(o.cambio, it.cambio) + '</select>') +
        campo('combustivel', 'Combustível', '<select class="field" id="c-combustivel">' + opts(o.combustivel, it.combustivel) + '</select>') + '</div>';
      h += '<div class="grid2">' + campo('cor', 'Cor', inp('cor', it.cor, 'maxlength="30" placeholder="Prata"')) +
        campo('preco', 'Preço', dinheiro('preco', it.preco)) + '</div>';
    } else {
      h += campo('titulo', 'Título do anúncio', inp('titulo', it.titulo, 'maxlength="100" placeholder="Ex.: Casa com 3 quartos e quintal"'));
      h += '<div class="grid2">' + campo('tipo', 'Tipo', '<select class="field" id="c-tipo">' + opts(o.tipoImovel, it.tipo) + '</select>') +
        campo('finalidade', 'Finalidade', '<select class="field" id="c-finalidade">' + opts(o.finalidade, it.finalidade) + '</select>') + '</div>';
      h += '<div class="grid2">' + campo('bairro', 'Bairro', inp('bairro', it.bairro, 'maxlength="60"')) +
        campo('cidade', 'Cidade', inp('cidade', it.cidade, 'maxlength="60"')) + '</div>';
      h += '<div class="grid2">' + campo('quartos', 'Quartos', inp('quartos', it.quartos || '', 'inputmode="numeric" maxlength="2"')) +
        campo('banheiros', 'Banheiros', inp('banheiros', it.banheiros || '', 'inputmode="numeric" maxlength="2"')) + '</div>';
      h += '<div class="grid2">' + campo('vagas', 'Vagas de garagem', inp('vagas', it.vagas || '', 'inputmode="numeric" maxlength="2"')) +
        campo('area', 'Área (m²)', inp('area', it.area || '', 'inputmode="numeric"')) + '</div>';
      h += campo('preco', 'Preço (aluguel: valor mensal)', dinheiro('preco', it.preco));
    }
    $('campos').innerHTML = h;
    ['preco', 'km', 'area'].forEach(function (id) {
      var el = $('c-' + id); if (!el) return;
      el.addEventListener('input', function () { var d = soDig(el.value); el.value = d ? Number(d).toLocaleString('pt-BR') : ''; });
    });
  }

  function abrirForm(it) {
    var tipo = estado.tipo;
    edit = { tipo: tipo, id: it ? it.id : null, fotos: (it && it.fotos ? it.fotos : []).map(function (n, i) { return { nome: n, url: it.fotosUrl[i] }; }) };
    $('modal-titulo').textContent = it ? (tipo === 'veiculos' ? 'Editar veículo' : 'Editar imóvel') : (tipo === 'veiculos' ? 'Novo veículo' : 'Novo imóvel');
    desenharCampos(tipo, it);
    $('c-descricao').value = it ? it.descricao || '' : '';
    $('c-status').innerHTML = Object.keys(estado.opcoes.status).map(function (k) {
      return '<option value="' + k + '"' + ((it ? it.status : 'disponivel') === k ? ' selected' : '') + '>' + esc(estado.opcoes.status[k]) + '</option>';
    }).join('');
    $('b-excluir').hidden = !it;
    erroEm('item-erro'); desenharFotos();
    $('modal').hidden = false; document.body.style.overflow = 'hidden';
    $('modal').querySelector('.sheet-body').scrollTop = 0;
  }
  function fecharForm(forcar) {
    if (!forcar && edit && edit.fotos.some(function (f) { return f.enviando; })) { toast('Aguarde o envio das fotos terminar.', true); return; }
    $('modal').hidden = true; document.body.style.overflow = ''; edit = null;
  }
  $('b-fechar').addEventListener('click', function () { fecharForm(); });
  $('b-cancelar').addEventListener('click', function () { fecharForm(); });
  $('modal').addEventListener('mousedown', function (e) { if (e.target === $('modal')) fecharForm(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (arrasto) { finalizar(false); return; }
    if (!$('modal').hidden) fecharForm();
  });

  /* ---------- fotos ---------- */
  function desenharFotos() {
    if (arrasto && arrasto.ativo) { redesenhar = true; return; }   // adia até soltar
    var h = edit.fotos.map(function (f, i) {
      return '<div class="foto' + (f.enviando ? ' enviando' : '') + '" data-i="' + i + '">' +
        (f.url ? '<img src="' + esc(f.url) + '" alt="Foto ' + (i + 1) + '" draggable="false">' : '') +
        (i === 0 && !f.enviando ? '<span class="capa">Capa</span>' : '') +
        (f.enviando ? '' : '<div class="ctl">' +
          '<button type="button" data-a="esq" aria-label="Mover para a esquerda"' + (i === 0 ? ' disabled style="opacity:.3"' : '') + '>←</button>' +
          '<button type="button" data-a="del" aria-label="Remover foto">✕</button>' +
          '<button type="button" data-a="dir" aria-label="Mover para a direita"' + (i === edit.fotos.length - 1 ? ' disabled style="opacity:.3"' : '') + '>→</button></div>') +
        '</div>';
    }).join('');
    if (edit.fotos.length < 12) h += '<button type="button" class="add-foto" id="b-addfoto"><b>+</b>Adicionar fotos</button>';
    $('fotos').innerHTML = h;
    Array.prototype.forEach.call($('fotos').querySelectorAll('.foto'), function (el, i) { el._foto = edit.fotos[i]; });
  }
  $('fotos').addEventListener('click', function (e) {
    if (e.target.closest('#b-addfoto')) { $('in-fotos').click(); return; }
    var b = e.target.closest('button[data-a]'); if (!b || b.disabled) return;
    var i = Number(b.closest('.foto').getAttribute('data-i')), a = b.getAttribute('data-a'), f = edit.fotos;
    if (a === 'del') f.splice(i, 1);
    if (a === 'esq' && i > 0) { var t = f[i - 1]; f[i - 1] = f[i]; f[i] = t; }
    if (a === 'dir' && i < f.length - 1) { var u = f[i + 1]; f[i + 1] = f[i]; f[i] = u; }
    desenharFotos();
  });
  /* ---------- arrastar e soltar as fotos (mouse e toque) ---------- */
  var arrasto = null, redesenhar = false;

  $('fotos').addEventListener('pointerdown', function (e) {
    if (arrasto || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var el = e.target.closest('.foto');
    if (!el || e.target.closest('button') || el.classList.contains('enviando')) return;
    arrasto = { el: el, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
      toque: e.pointerType === 'touch', ativo: false, ordem: null, ghost: null, timer: null, rolagem: null, dx: 0, dy: 0 };
    // no toque, é preciso segurar um instante (senão o dedo está só rolando a tela)
    if (arrasto.toque) arrasto.timer = setTimeout(function () { if (arrasto && !arrasto.ativo) iniciarArrasto(); }, 260);
    window.addEventListener('pointermove', moverArrasto, { passive: false });
    window.addEventListener('pointerup', soltarArrasto);
    window.addEventListener('pointercancel', cancelarArrasto);
  });

  function iniciarArrasto() {
    var a = arrasto; a.ativo = true;
    var r = a.el.getBoundingClientRect();
    a.dx = a.x0 - r.left; a.dy = a.y0 - r.top;
    a.ordem = Array.prototype.slice.call($('fotos').querySelectorAll('.foto'));
    // posição de cada "casa" da grade (fixa durante o arrasto), em coordenadas do conteúdo que rola
    var c = $('modal').querySelector('.sheet-body');
    a.casas = a.ordem.map(function (el) { var q = el.getBoundingClientRect(); return { l: q.left, r: q.right, t: q.top + c.scrollTop, b: q.bottom + c.scrollTop }; });
    var g = a.el.cloneNode(true); g.className = 'foto fantasma';
    var ctl = g.querySelector('.ctl'); if (ctl) ctl.remove();
    g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
    document.body.appendChild(g); a.ghost = g;
    a.el.classList.add('arrastando'); $('fotos').classList.add('em-arrasto');
    a.ordem.forEach(function (el, i) { el.style.order = i; });      // a ordem visual muda sem mover os elementos de lugar
    var add = $('b-addfoto'); if (add) add.style.order = 1000;      // o botão "+" fica sempre por último
    try { a.el.setPointerCapture(a.id); } catch (_) {}
    if (a.toque && navigator.vibrate) navigator.vibrate(12);
    a.rolagem = setInterval(rolarArrasto, 16);
    posicionarFantasma(); atualizarAlvo();
  }

  function moverArrasto(e) {
    var a = arrasto; if (!a || e.pointerId !== a.id) return;
    a.x = e.clientX; a.y = e.clientY;
    if (!a.ativo) {
      var d = Math.hypot(a.x - a.x0, a.y - a.y0);
      if (a.toque) { if (d > 10) finalizar(false); return; }        // mexeu antes de segurar: é rolagem
      if (d < 6) return;                                            // clique simples: não é arrasto
      iniciarArrasto();
    }
    e.preventDefault();
    posicionarFantasma(); atualizarAlvo();
  }

  function posicionarFantasma() {
    var a = arrasto; if (!a || !a.ghost) return;
    a.ghost.style.left = (a.x - a.dx) + 'px'; a.ghost.style.top = (a.y - a.dy) + 'px';
  }

  function atualizarAlvo() {
    var a = arrasto; if (!a || !a.ativo) return;
    var y = a.y + $('modal').querySelector('.sheet-body').scrollTop, para = -1;
    for (var i = 0; i < a.casas.length; i++) {
      var k = a.casas[i];
      if (a.x >= k.l && a.x <= k.r && y >= k.t && y <= k.b) { para = i; break; }
    }
    if (para < 0) return;                                            // cursor entre casas ou fora da grade: nada muda
    var de = a.ordem.indexOf(a.el);
    if (de < 0 || de === para) return;
    var antes = a.ordem.map(function (el) { return el.getBoundingClientRect(); });
    var velho = a.ordem.slice();
    a.ordem.splice(de, 1); a.ordem.splice(para, 0, a.el);
    a.ordem.forEach(function (el, k) { el.style.order = k; });
    velho.forEach(function (el, k) {                                 // animação suave: as outras fotos "deslizam"
      if (el === a.el || !el.animate) return;
      var d = el.getBoundingClientRect(), dx = antes[k].left - d.left, dy = antes[k].top - d.top;
      if (dx || dy) el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 160, easing: 'ease-out' });
    });
  }

  function rolarArrasto() {                                          // perto da borda, a tela rola sozinha
    var a = arrasto; if (!a || !a.ativo) return;
    var c = $('modal').querySelector('.sheet-body'), r = c.getBoundingClientRect(), v = 0;
    if (a.y < r.top + 48) v = -Math.ceil((r.top + 48 - a.y) / 4);
    else if (a.y > r.bottom - 48) v = Math.ceil((a.y - (r.bottom - 48)) / 4);
    if (v) { c.scrollTop += Math.max(-18, Math.min(18, v)); atualizarAlvo(); }
  }

  function soltarArrasto(e) { if (arrasto && e.pointerId === arrasto.id) finalizar(true); }
  function cancelarArrasto(e) { if (arrasto && e.pointerId === arrasto.id) finalizar(false); }

  function finalizar(confirmar) {
    var a = arrasto; if (!a) return;
    arrasto = null;
    clearTimeout(a.timer); clearInterval(a.rolagem);
    window.removeEventListener('pointermove', moverArrasto);
    window.removeEventListener('pointerup', soltarArrasto);
    window.removeEventListener('pointercancel', cancelarArrasto);
    if (!a.ativo) return;
    if (a.ghost) a.ghost.remove();
    a.ordem.forEach(function (el) { el.style.order = ''; });
    var add = $('b-addfoto'); if (add) add.style.order = '';
    a.el.classList.remove('arrastando'); $('fotos').classList.remove('em-arrasto');
    try { a.el.releasePointerCapture(a.id); } catch (_) {}
    if (confirmar && edit) {
      var novo = a.ordem.map(function (el) { return el._foto; }).filter(function (f) { return f && edit.fotos.indexOf(f) !== -1; });
      var sobras = edit.fotos.filter(function (f) { return novo.indexOf(f) === -1; });   // ex.: foto que terminou de subir durante o arrasto
      edit.fotos = novo.concat(sobras);
    }
    redesenhar = false;
    if (edit) desenharFotos();
  }

  // enquanto arrasta no celular, a tela não pode rolar junto
  document.addEventListener('touchmove', function (e) { if (arrasto && arrasto.ativo && e.cancelable) e.preventDefault(); }, { passive: false });
  // o menu "salvar imagem" do toque longo não deve aparecer por cima do arrasto
  $('fotos').addEventListener('contextmenu', function (e) { e.preventDefault(); });

  $('in-fotos').addEventListener('change', function () {
    var arq = Array.prototype.slice.call(this.files || []); this.value = '';
    var vagas = 12 - edit.fotos.length;
    if (arq.length > vagas) { toast('Limite de 12 fotos. Enviando só as ' + vagas + ' primeiras.', true); arq = arq.slice(0, vagas); }
    var ref = edit;                                  // se fechar o formulário no meio, descarta
    var fila = arq.reduce(function (p, file) {
      return p.then(function () {
        if (edit !== ref) return;
        var ph = { nome: null, url: null, enviando: true }; ref.fotos.push(ph); desenharFotos();
        var fd = new FormData(); fd.append('foto', file);
        return api('enviar_foto', { post: true, form: fd }).then(function (r) {
          ph.nome = r.nome; ph.url = r.url; ph.enviando = false;
        }).catch(function (e) {
          ref.fotos.splice(ref.fotos.indexOf(ph), 1); toast(file.name + ': ' + e.message, true);
        }).then(function () { if (edit === ref) desenharFotos(); });
      });
    }, Promise.resolve());
    return fila;
  });

  /* ---------- salvar / excluir ---------- */
  function lerForm() {
    var tipo = edit.tipo, v = function (id) { var e = $('c-' + id); return e ? e.value : ''; };
    var item = { id: edit.id || undefined, preco: soDig(v('preco')), descricao: v('descricao'), status: v('status'),
      fotos: edit.fotos.map(function (f) { return f.nome; }).filter(Boolean) };
    var campos = tipo === 'veiculos'
      ? ['marca', 'modelo', 'ano', 'km', 'cambio', 'combustivel', 'cor']
      : ['titulo', 'tipo', 'finalidade', 'bairro', 'cidade', 'quartos', 'banheiros', 'vagas', 'area'];
    campos.forEach(function (c) { item[c] = v(c); });
    return item;
  }
  // o aviso de um campo some assim que ele é corrigido
  $('campos').addEventListener('input', function (e) {
    var id = (e.target.id || '').replace(/^c-/, '');
    e.target.classList.remove('invalido');
    var m = $('e-' + id); if (m) m.hidden = true;
  });
  function limparErros() {
    document.querySelectorAll('.msg-campo').forEach(function (e) { e.hidden = true; });
    document.querySelectorAll('.field.invalido').forEach(function (e) { e.classList.remove('invalido'); });
    erroEm('item-erro');
  }
  // Confere, do mesmo jeito que um visitante faria, se o anúncio salvo já aparece no site público.
  function conferirNoSite(tipo, item) {
    if (!item || item.status === 'vendido') return Promise.resolve({ ok: true, oculto: true });
    return fetch('../api/catalogo.php?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('o servidor respondeu ' + r.status); return r.json(); })
      .then(function (d) { return { ok: (d[tipo] || []).some(function (x) { return x.id === item.id; }) }; })
      .catch(function (e) { return { ok: false, motivo: e.message }; });
  }

  $('f-item').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (salvando) return;
    if (edit.fotos.some(function (f) { return f.enviando; })) { erroEm('item-erro', 'Aguarde o envio das fotos terminar.'); return; }
    limparErros(); salvando = true; $('b-salvar').disabled = true;
    var tipoSalvo = edit.tipo;
    api('salvar', { post: true, corpo: { tipo: tipoSalvo, item: lerForm() } }).then(function (r) {
      fecharForm(true); estado.iniciado = true; carregar();
      return conferirNoSite(tipoSalvo, r.item).then(function (c) {
        if (c.oculto) toast('Salvo. Este item está como “Vendido”, então não aparece no site.');
        else if (c.ok) toast('Salvo! Já está no site.');
        else toast('Salvo, mas o site ainda NÃO está mostrando este anúncio' + (c.motivo ? ' (' + c.motivo + ')' : '') + '. Atualize o site; se continuar assim, avise quem cuida dele.', true);
      });
    }).catch(function (e) {
      erroEm('item-erro', e.message);
      var c = (e.dados && e.dados.campos) || {}, primeiro = null;
      Object.keys(c).forEach(function (k) {
        var m = $('e-' + k), f = $('c-' + k);
        if (m) { m.textContent = c[k]; m.hidden = false; }
        if (f) { f.classList.add('invalido'); if (!primeiro) primeiro = f; }
      });
      if (primeiro) primeiro.focus();
    }).then(function () { salvando = false; $('b-salvar').disabled = false; });
  });

  $('b-excluir').addEventListener('click', function () {
    if (!edit || !edit.id) return;
    if (!confirm('Excluir este item e as fotos dele? Isso não pode ser desfeito.\n\nDica: se ele foi vendido, é melhor marcar como “Vendido” em vez de excluir.')) return;
    api('excluir', { post: true, corpo: { tipo: edit.tipo, id: edit.id } }).then(function () {
      fecharForm(true); toast('Item excluído.'); carregar();
    }).catch(function (e) { erroEm('item-erro', e.message); });
  });

  /* ---------- início ---------- */
  api('me').then(function (r) {
    if (!r.logado) { mostrar('login'); return; }
    estado.csrf = r.csrf; estado.opcoes = r.opcoes; entrar(r.trocarSenha);
  }).catch(function (e) { mostrar('login'); erroEm('login-erro', e.message); });
})();
