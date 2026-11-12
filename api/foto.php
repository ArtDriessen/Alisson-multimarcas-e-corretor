<?php
/* Entrega as fotos cadastradas pelo painel (ficam fora da pasta pública).
 *
 * ?f=NOME.jpg            foto original (até 1600 px)
 * ?f=NOME.jpg&w=400|800|1200   versão reduzida (miniaturas e prévia do WhatsApp),
 *                        gerada na primeira vez e guardada em ao-dados/fotos-cache
 */
declare(strict_types=1);
require __DIR__ . '/../admin/_lib.php';

$nome = (string) ($_GET['f'] ?? '');
if (!preg_match(AO_REGEX_FOTO, $nome)) { http_response_code(404); exit; }

try { $caminho = ao_fotos_dir() . '/' . $nome; } catch (Throwable $e) { http_response_code(404); exit; }
if (!is_file($caminho)) { http_response_code(404); exit; }

$w = (int) ($_GET['w'] ?? 0);
if ($w !== 0 && in_array($w, AO_LARGURAS_FOTO, true)) {
    try {
        $reduzida = ao_foto_reduzida($nome, $w);
        if ($reduzida !== null) $caminho = $reduzida;       // se não der, entrega a original
    } catch (Throwable $e) { /* entrega a original */ }
}

$mtime = (int) filemtime($caminho);
$etag = '"' . substr(hash('sha256', $nome . $w . $mtime), 0, 20) . '"';
header('ETag: ' . $etag);
header('Cache-Control: public, max-age=31536000, immutable');   // o nome muda a cada foto nova
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $mtime) . ' GMT');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) { http_response_code(304); exit; }

header('Content-Type: image/jpeg');
header('Content-Length: ' . filesize($caminho));
readfile($caminho);
