<?php
/* Página completa de um anúncio (veículo ou imóvel): anuncio.php?tipo=veiculos|imoveis&id=...
 *
 * É montada no servidor para que o link compartilhado (WhatsApp, Instagram, Google)
 * mostre foto, nome e preço do anúncio, e não uma página genérica.
 */
declare(strict_types=1);
require __DIR__ . '/admin/_lib.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');   // preço/situação mudam: nunca servir cópia velha
header('X-Content-Type-Options: nosniff');

const VER = '20261112c';   // mude junto com os ?v= das outras páginas quando alterar .css/.js

function h($v): string { return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function reais($n): string { return 'R$ ' . number_format((float) $n, 0, ',', '.'); }
function milhar($n): string { return number_format((float) $n, 0, ',', '.'); }
function corta(string $s, int $max): string {
    $s = trim(preg_replace('/\s+/u', ' ', $s) ?? '');
    if (function_exists('mb_strlen') && mb_strlen($s) > $max) return rtrim(mb_substr($s, 0, $max - 1)) . '…';
    return $s;
}

/* ---------- Qual anúncio? ---------- */
$tipo = (string) ($_GET['tipo'] ?? '');
if (!in_array($tipo, ['veiculos', 'imoveis'], true)) $tipo = '';
$id = (string) ($_GET['id'] ?? '');
if (!preg_match('/^[a-f0-9]{12}$/', $id)) $id = '';

$item = null; $falhou = false;
if ($tipo !== '' && $id !== '') {
    try {
        $d = ao_catalogo_ler();
        foreach (($d[$tipo] ?? []) as $x) { if (($x['id'] ?? '') === $id) { $item = $x; break; } }
    } catch (Throwable $e) { $falhou = true; }
}
if ($item !== null && ($item['status'] ?? 'disponivel') === 'vendido') $item = null;   // vendido não aparece mais

/* ---------- Endereços ---------- */
$host = (string) ($_SERVER['HTTP_HOST'] ?? '');
if (!preg_match('/^[A-Za-z0-9.-]+(:\d+)?$/', $host)) $host = '';
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/anuncio.php')), '/');   // '' quando o site está na raiz
$origem = $host !== '' ? (ao_https() ? 'https' : 'http') . '://' . $host : '';
$absoluto = fn(string $caminho): string => $origem . $base . '/' . ltrim($caminho, '/');
$foto = fn(string $nome, int $w = 0): string => $base . '/api/foto.php?f=' . rawurlencode($nome) . ($w ? '&w=' . $w : '');

$ICO_ZAP = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.2 20.8l1.3-4.6A8.7 8.7 0 1 1 8 19.6l-4.8 1.2z"/><path d="M9.2 7.9c-.3 0-.7.2-.9.6-.3.5-.4 1.2-.1 2 .6 1.6 2.4 3.6 4.3 4.5.9.4 1.8.5 2.4.1.4-.3.6-.7.5-1l-.1-.3-1.8-.9c-.2-.1-.4 0-.6.2l-.5.6c-1-.4-2-1.4-2.4-2.4l.5-.5c.2-.2.2-.4.1-.6l-.8-1.8c-.1-.3-.4-.5-.6-.5z"/></svg>';
$ICO_SHARE = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3"/></svg>';
$ICO_ZOOM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
$CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
$CHEV_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

/* ---------- Cabeçalho e rodapé comuns ---------- */
function ao_topo(string $titulo, string $desc, string $extra, string $atual, string $ver): void { ?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title><?= h($titulo) ?></title>
  <meta name="description" content="<?= h($desc) ?>">
  <meta name="theme-color" content="#0a0a0b">
<?= $extra ?>
  <link rel="icon" type="image/png" href="assets/img/favicon.png">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;1,600;1,700;1,800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css?v=<?= h($ver) ?>">
</head>
<body>
  <header class="topbar">
    <div class="topbar-in">
      <a class="brand" href="./" aria-label="Início"><img src="assets/img/ao.png" alt="AO"><span>Alisson Orçatto</span></a>
      <nav class="nav" aria-label="Principal">
        <a href="./">Início</a>
        <a href="veiculos.html"<?= $atual === 'veiculos' ? ' aria-current="page"' : '' ?>>Veículos</a>
        <a href="imoveis.html"<?= $atual === 'imoveis' ? ' aria-current="page"' : '' ?>>Imóveis</a>
        <a href="financiamento.html">Simulador</a>
      </nav>
    </div>
  </header>
<?php }

function ao_rodape(string $ver, bool $comGaleria, bool $creci = false): void { ?>
  <footer class="footer">
    <p><a data-wa href="#">WhatsApp <span data-wa-num></span></a> · <a data-ig data-ig-text href="#">Instagram</a></p>
    <p>© <span data-year>2026</span> Alisson Orçatto<?php if ($creci): ?> · <span data-creci></span><?php endif; ?> · Corretor automotivo e imobiliário</p>
  </footer>

  <script src="assets/js/config.js?v=<?= h($ver) ?>"></script>
  <script src="assets/js/main.js?v=<?= h($ver) ?>"></script>
<?php if ($comGaleria): ?>  <script src="assets/js/anuncio.js?v=<?= h($ver) ?>"></script>
<?php endif; ?>
</body>
</html>
<?php }

/* ---------- Anúncio indisponível (não existe, foi vendido ou deu erro) ---------- */
if ($item === null) {
    http_response_code($falhou ? 500 : 404);
    $volta = $tipo === 'imoveis' ? 'imoveis.html' : 'veiculos.html';
    $oQue = $tipo === 'imoveis' ? 'imóveis' : 'veículos';
    ao_topo('Anúncio indisponível | Alisson Orçatto', 'Este anúncio não está mais disponível.',
        '  <meta name="robots" content="noindex">', $tipo, VER); ?>
  <main class="page">
    <div class="empty vazio-anuncio">
      <?php if ($falhou): ?>
        <strong>Não consegui abrir este anúncio agora.</strong><br>Tente de novo em instantes ou fale comigo no WhatsApp.
      <?php else: ?>
        <strong>Este anúncio não está mais disponível.</strong><br>Ele pode ter sido vendido, mas tenho outras opções para você.
      <?php endif; ?>
      <br>
      <a class="btn btn-primary" style="margin-top:16px" href="<?= h($volta) ?>">Ver todos os <?= h($oQue) ?></a>
      <a class="btn" style="margin-top:16px" data-wa="Olá, Alisson! O anúncio que eu procurava não está mais disponível. Pode me ajudar a encontrar algo parecido?" href="#"><?= $ICO_ZAP ?>Falar no WhatsApp</a>
    </div>
  </main>
<?php ao_rodape(VER, false, $tipo === 'imoveis'); exit; }

/* ---------- Dados do anúncio ---------- */
$ehVeiculo = $tipo === 'veiculos';
$nome = $ehVeiculo ? trim(($item['marca'] ?? '') . ' ' . ($item['modelo'] ?? '')) : trim((string) ($item['titulo'] ?? ''));
$aluguel = !$ehVeiculo && (($item['finalidade'] ?? '') === 'Aluguel');
$reservado = ($item['status'] ?? '') === 'reservado';
$preco = (int) ($item['preco'] ?? 0);
$precoTxt = reais($preco) . ($aluguel ? ' / mês' : '');
$descricao = trim((string) ($item['descricao'] ?? ''));
$fotos = array_values(array_filter((array) ($item['fotos'] ?? []), fn($f) => is_string($f) && preg_match(AO_REGEX_FOTO, $f) && is_file(ao_fotos_dir() . '/' . $f)));
$n = count($fotos);

if ($ehVeiculo) {
    $ficha = [['Ano', $item['ano'] ?? ''], ['Quilometragem', milhar($item['km'] ?? 0) . ' km'], ['Câmbio', $item['cambio'] ?? ''], ['Combustível', $item['combustivel'] ?? '']];
    if (!empty($item['cor'])) $ficha[] = ['Cor', $item['cor']];
    $resumo = ($item['ano'] ?? '') . ' · ' . milhar($item['km'] ?? 0) . ' km · ' . ($item['cambio'] ?? '') . ' · ' . ($item['combustivel'] ?? '');
    $sub = '';
    $nomeCompleto = $nome . ' ' . ($item['ano'] ?? '');
    $msg = 'Olá, Alisson! Tenho interesse no ' . $nomeCompleto . ' que vi no seu site. Ainda está disponível?';
} else {
    $ficha = [['Tipo', $item['tipo'] ?? ''], ['Finalidade', $item['finalidade'] ?? '']];
    if (!empty($item['bairro'])) $ficha[] = ['Bairro', $item['bairro']];
    $ficha[] = ['Cidade', $item['cidade'] ?? ''];
    if (!empty($item['quartos'])) $ficha[] = ['Quartos', $item['quartos']];
    if (!empty($item['banheiros'])) $ficha[] = ['Banheiros', $item['banheiros']];
    if (!empty($item['vagas'])) $ficha[] = ['Vagas de garagem', $item['vagas']];
    if (!empty($item['area'])) $ficha[] = ['Área', milhar($item['area']) . ' m²'];
    $resumo = ($item['tipo'] ?? '') . ' · ' . trim(($item['bairro'] ?? '') . ', ' . ($item['cidade'] ?? ''), ', ')
        . (!empty($item['quartos']) ? ' · ' . $item['quartos'] . ' quarto' . ($item['quartos'] > 1 ? 's' : '') : '')
        . (!empty($item['area']) ? ' · ' . milhar($item['area']) . ' m²' : '');
    $sub = trim(($item['bairro'] ?? '') . ' · ' . ($item['cidade'] ?? ''), ' ·');
    $nomeCompleto = $nome;
    $msg = 'Olá, Alisson! Tenho interesse no imóvel "' . $nome . '" (' . ($item['bairro'] ?? $item['cidade'] ?? '') . ') que vi no seu site. Ainda está disponível?';
}

$urlAnuncio = $absoluto('anuncio.php') . '?tipo=' . $tipo . '&id=' . $id;
$msg .= $origem !== '' ? "\n" . $urlAnuncio : '';
$tituloPag = $nomeCompleto . ' — ' . $precoTxt . ' | Alisson Orçatto';
$descMeta = $resumo . ' · ' . $precoTxt . ($descricao !== '' ? ' — ' . corta($descricao, 110) : '');
$imgOg = $n ? $absoluto($foto($fotos[0], 1200)) : $absoluto('assets/img/og.png');
if ($n && $base !== '') $imgOg = $origem . $foto($fotos[0], 1200);
elseif ($n) $imgOg = $origem . $foto($fotos[0], 1200);

$ld = ['@context' => 'https://schema.org', '@type' => 'Product', 'name' => $nomeCompleto, 'description' => corta($descricao !== '' ? $descricao : $resumo, 300),
    'offers' => ['@type' => 'Offer', 'price' => $preco, 'priceCurrency' => 'BRL', 'url' => $urlAnuncio,
        'availability' => $reservado ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock']];
if ($n) $ld['image'] = array_map(fn($f) => $origem . $foto($f, 1200), $fotos);

$extra = '  <meta property="og:type" content="product">' . "\n"
    . '  <meta property="og:site_name" content="Alisson Orçatto — Corretor Automotivo e Imobiliário">' . "\n"
    . '  <meta property="og:title" content="' . h($tituloPag) . '">' . "\n"
    . '  <meta property="og:description" content="' . h($descMeta) . '">' . "\n"
    . ($origem !== '' ? '  <meta property="og:url" content="' . h($urlAnuncio) . '">' . "\n" . '  <link rel="canonical" href="' . h($urlAnuncio) . '">' . "\n" : '')
    . ($origem !== '' ? '  <meta property="og:image" content="' . h($imgOg) . '">' . "\n" . '  <meta name="twitter:card" content="summary_large_image">' . "\n" : '')
    . '  <script type="application/ld+json">' . json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) . '</script>';

$voltaUrl = $ehVeiculo ? 'veiculos.html' : 'imoveis.html';
$voltaTxt = $ehVeiculo ? 'Veículos' : 'Imóveis';
$simulaUrl = 'financiamento.html?tipo=' . ($ehVeiculo ? 'veiculo' : 'imovel') . '&valor=' . $preco;

ao_topo($tituloPag, $descMeta, $extra, $tipo, VER); ?>
  <main class="page">
    <nav class="crumbs" aria-label="Você está em">
      <a href="./">Início</a><span aria-hidden="true">›</span>
      <a href="<?= h($voltaUrl) ?>"><?= h($voltaTxt) ?></a><span aria-hidden="true">›</span>
      <span aria-current="page"><?= h($nome) ?></span>
    </nav>

    <article class="anuncio">
      <section class="galeria" data-galeria aria-label="Fotos">
        <div class="gal-main">
<?php if ($n): ?>
          <div class="gal-strip" tabindex="0" aria-label="Fotos do anúncio (use as setas do teclado para trocar)">
<?php foreach ($fotos as $i => $f): ?>
            <img src="<?= h($foto($f, 1200)) ?>" data-full="<?= h($foto($f)) ?>" alt="<?= h($nomeCompleto) ?> — foto <?= $i + 1 ?> de <?= $n ?>"<?= $i === 0 ? ' fetchpriority="high"' : ' loading="lazy"' ?>>
<?php endforeach; ?>
          </div>
<?php if ($n > 1): ?>
          <button class="nav-btn prev" type="button" aria-label="Foto anterior"><?= $CHEV_L ?></button>
          <button class="nav-btn next" type="button" aria-label="Próxima foto"><?= $CHEV_R ?></button>
<?php endif; ?>
          <span class="gal-count" aria-live="polite">1 / <?= $n ?></span>
          <button class="gal-zoom" type="button" aria-label="Ver foto em tela cheia"><?= $ICO_ZOOM ?></button>
<?php else: ?>
          <div class="ph"><span>Fotos em breve</span></div>
<?php endif; ?>
<?php if ($reservado): ?><span class="badge">Reservado</span><?php elseif ($aluguel): ?><span class="badge">Aluguel</span><?php endif; ?>
        </div>
<?php if ($n > 1): ?>
        <div class="gal-thumbs" role="list">
<?php foreach ($fotos as $i => $f): ?>
          <button type="button" role="listitem" data-i="<?= $i ?>" aria-label="Ver foto <?= $i + 1 ?>"<?= $i === 0 ? ' aria-current="true"' : '' ?>><img src="<?= h($foto($f, 400)) ?>" alt="" loading="lazy"></button>
<?php endforeach; ?>
        </div>
<?php endif; ?>
      </section>

      <section class="info">
        <h1><?= h($nomeCompleto) ?></h1>
<?php if ($sub !== ''): ?>        <p class="loc"><?= h($sub) ?></p>
<?php endif; ?>
        <p class="preco metal"><?= h($precoTxt) ?></p>

        <div class="cta">
          <a class="btn btn-primary btn-lg" data-wa="<?= h($msg) ?>" href="#"><?= $ICO_ZAP ?>Tenho interesse</a>
<?php if (!$aluguel): ?>
          <a class="btn btn-lg" href="<?= h($simulaUrl) ?>">Simular financiamento</a>
<?php endif; ?>
          <button class="btn btn-lg" type="button" data-compartilhar data-titulo="<?= h($nomeCompleto) ?>" data-texto="<?= h($nomeCompleto . ' — ' . $precoTxt) ?>" data-url="<?= h($urlAnuncio) ?>"><?= $ICO_SHARE ?>Compartilhar</button>
        </div>

        <h2 class="sec">Informações</h2>
        <dl class="ficha">
<?php foreach ($ficha as [$k, $v]): ?>
          <div><dt><?= h($k) ?></dt><dd><?= h($v) ?></dd></div>
<?php endforeach; ?>
        </dl>

<?php if ($descricao !== ''): ?>
        <h2 class="sec">Sobre este <?= $ehVeiculo ? 'veículo' : 'imóvel' ?></h2>
        <div class="descricao"><?= h($descricao) ?></div>
<?php endif; ?>

<?php if (!$ehVeiculo): ?>
        <p class="corretor">Alisson Orçatto · <span data-creci></span></p>
<?php endif; ?>
        <p class="aviso">Preços e disponibilidade sujeitos a alteração sem aviso prévio. Fotos meramente ilustrativas.</p>
      </section>
    </article>

    <p class="voltar-lista"><a href="<?= h($voltaUrl) ?>">← Ver todos os <?= h(mb_strtolower($voltaTxt)) ?></a></p>
  </main>
<?php ao_rodape(VER, true, !$ehVeiculo);
