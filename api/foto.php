<?php
/* Entrega as fotos cadastradas pelo painel (ficam fora da pasta pública). */
declare(strict_types=1);
require __DIR__ . '/../admin/_lib.php';

$nome = (string) ($_GET['f'] ?? '');
if (!preg_match(AO_REGEX_FOTO, $nome)) { http_response_code(404); exit; }

try { $caminho = ao_fotos_dir() . '/' . $nome; } catch (Throwable $e) { http_response_code(404); exit; }
if (!is_file($caminho)) { http_response_code(404); exit; }

$mtime = (int) filemtime($caminho);
$etag = '"' . substr(hash('sha256', $nome . $mtime), 0, 20) . '"';
header('ETag: ' . $etag);
header('Cache-Control: public, max-age=31536000, immutable');   // o nome muda a cada foto nova
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $mtime) . ' GMT');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) { http_response_code(304); exit; }

header('Content-Type: image/jpeg');
header('Content-Length: ' . filesize($caminho));
readfile($caminho);
