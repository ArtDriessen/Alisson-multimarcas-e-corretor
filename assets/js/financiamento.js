/* Simulador de financiamento (veículo e imóvel) — valores estimativos */
(function () {
  var $ = function (id) { return document.getElementById(id); };

  var PERFIL = {
    veiculo: {
      prazos: [12, 24, 36, 48, 60], prazoPadrao: 48, taxa: '1,89',
      entradaPadrao: 30, valorPadrao: 60000, sistemas: false,
      rotulo: 'do veículo', entradaChips: [0, 20, 30, 50]
    },
    imovel: {
      prazos: [120, 180, 240, 300, 360, 420], prazoPadrao: 360, taxa: '0,95',
      entradaPadrao: 20, valorPadrao: 350000, sistemas: true,
      rotulo: 'do imóvel', entradaChips: [20, 30, 40, 50]
    }
  };

  var modo = 'veiculo';
  var inValor = $('valor'), inEntrada = $('entrada'), selPrazo = $('prazo'), inTaxa = $('taxa');
  var secSistema = $('sec-sistema'), erro = $('erro'), saida = $('saida');

  function soDigitos(s) { return String(s).replace(/\D/g, ''); }
  function lerReais(el) { return Number(soDigitos(el.value)) || 0; }
  function mascara(el) {
    var d = soDigitos(el.value);
    el.value = d ? Number(d).toLocaleString('pt-BR') : '';
  }
  function lerTaxa() {
    var t = parseFloat(String(inTaxa.value).replace(',', '.'));
    return isFinite(t) ? t : NaN;
  }
  function sistema() {
    var r = document.querySelector('input[name="sistema"]:checked');
    return PERFIL[modo].sistemas && r ? r.value : 'price';
  }

  function calcular(pv, i, n, sis) {
    var parcelas = [], saldo = pv, total = 0, k;
    if (sis === 'sac') {
      var amort = pv / n;
      for (k = 0; k < n; k++) {
        var p = amort + saldo * i;
        parcelas.push(p); total += p; saldo -= amort;
      }
    } else {
      var pmt = i === 0 ? pv / n : pv * i / (1 - Math.pow(1 + i, -n));
      for (k = 0; k < n; k++) { parcelas.push(pmt); total += pmt; }
    }
    return { primeira: parcelas[0], ultima: parcelas[n - 1], total: total, juros: total - pv };
  }

  function atualizar() {
    var valor = lerReais(inValor), entrada = lerReais(inEntrada);
    var n = Number(selPrazo.value), taxaPct = lerTaxa(), sis = sistema();
    erro.hidden = true;

    var msg = '';
    if (!valor) msg = 'Informe o valor ' + PERFIL[modo].rotulo + '.';
    else if (entrada >= valor) msg = 'A entrada precisa ser menor que o valor ' + PERFIL[modo].rotulo + '.';
    else if (!isFinite(taxaPct) || taxaPct < 0 || taxaPct > 10) msg = 'Informe uma taxa de juros mensal entre 0% e 10%.';
    if (msg) {
      erro.textContent = msg; erro.hidden = false; saida.hidden = true; return;
    }

    var financiado = valor - entrada;
    var r = calcular(financiado, taxaPct / 100, n, sis);
    saida.hidden = false;

    $('r-rotulo').textContent = sis === 'sac' ? '1ª parcela (SAC)' : 'Parcela mensal';
    $('r-parcela').textContent = brl(r.primeira, 2);
    $('r-nota').textContent = 'em ' + n + ' meses' + (sis === 'sac' ? ' · última parcela ' + brl(r.ultima, 2) : '');
    $('r-entrada').textContent = brl(entrada, 0);
    $('r-financiado').textContent = brl(financiado, 0);
    $('r-juros').textContent = brl(r.juros, 0);
    $('r-total').textContent = brl(r.total + entrada, 0);

    var txt = 'Olá, Alisson! Fiz uma simulação no seu site:\n' +
      '• ' + (modo === 'veiculo' ? 'Veículo' : 'Imóvel') + ' de ' + brl(valor, 0) + '\n' +
      '• Entrada: ' + brl(entrada, 0) + '\n' +
      '• Prazo: ' + n + ' meses (' + (sis === 'sac' ? 'SAC' : 'Price') + ', ' + String(taxaPct).replace('.', ',') + '% a.m.)\n' +
      '• ' + (sis === 'sac' ? '1ª parcela' : 'Parcela') + ' estimada: ' + brl(r.primeira, 2) + '\n' +
      'Pode me ajudar a conseguir essa condição?';
    $('enviar').href = waLink(txt);
  }

  function definirEntradaPct(p) {
    var valor = lerReais(inValor);
    inEntrada.value = valor ? Math.round(valor * p / 100).toLocaleString('pt-BR') : '';
    atualizar();
  }

  function aplicarModo(m, valorInicial) {
    modo = m;
    var p = PERFIL[m];
    document.querySelectorAll('.tab').forEach(function (t) {
      t.setAttribute('aria-selected', t.getAttribute('data-modo') === m ? 'true' : 'false');
    });
    selPrazo.innerHTML = p.prazos.map(function (n) {
      var anos = n >= 120 ? ' (' + (n / 12) + ' anos)' : '';
      return '<option value="' + n + '"' + (n === p.prazoPadrao ? ' selected' : '') + '>' + n + ' meses' + anos + '</option>';
    }).join('');
    inTaxa.value = p.taxa;
    secSistema.hidden = !p.sistemas;
    $('chips').innerHTML = p.entradaChips.map(function (c) {
      return '<button type="button" class="chip" data-pct="' + c + '">' + (c === 0 ? 'Sem entrada' : c + '%') + '</button>';
    }).join('');
    var v = valorInicial || p.valorPadrao;
    inValor.value = v.toLocaleString('pt-BR');
    definirEntradaPct(p.entradaPadrao);
  }

  // ---- eventos ----
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { aplicarModo(t.getAttribute('data-modo')); });
  });
  $('chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (b) definirEntradaPct(Number(b.getAttribute('data-pct')));
  });
  [inValor, inEntrada].forEach(function (el) {
    el.addEventListener('input', function () { mascara(el); atualizar(); });
  });
  selPrazo.addEventListener('input', atualizar);
  inTaxa.addEventListener('input', atualizar);
  document.querySelectorAll('input[name="sistema"]').forEach(function (r) { r.addEventListener('change', atualizar); });

  // ---- início (aceita ?tipo=veiculo|imovel&valor=62900) ----
  var qs = new URLSearchParams(location.search);
  var m = qs.get('tipo') === 'imovel' ? 'imovel' : 'veiculo';
  var v = Number(qs.get('valor'));
  aplicarModo(m, isFinite(v) && v > 0 ? Math.round(v) : 0);
})();
