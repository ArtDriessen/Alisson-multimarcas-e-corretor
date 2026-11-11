<?php
/* Catálogo público (somente leitura) usado por veiculos.html e imoveis.html.
 *
 * Regra: responde SEMPRE com as duas listas (vazias quando não há anúncios).
 * Só devolve erro quando algo está realmente quebrado, para o site poder
 * avisar em vez de mostrar uma lista errada.
 */
declare(strict_types=1);
require __DIR__ . '/../admin/_lib.php';

// Nunca guardar esta resposta em cache (navegador, servidor ou CDN)
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Content-Type-Options: nosniff');

function ao_falha(string $codigo): void {
    http_response_code(500);
    echo json_encode(['erro' => $codigo]);
    exit;
}

try {
    $caminho = ao_catalogo_path();
    if (!is_file($caminho)) {                 // ainda não cadastraram nada: lista vazia, não é erro
        echo '{"veiculos":[],"imoveis":[]}';
        exit;
    }
    $d = ao_catalogo_ler();
} catch (Throwable $e) {
    ao_falha('dados-indisponiveis');
}

if ($d === null) ao_falha('catalogo-ilegivel');   // o arquivo existe mas não pôde ser lido

$saida = ['veiculos' => [], 'imoveis' => []];
foreach (['veiculos', 'imoveis'] as $t) {
    foreach ($d[$t] as $it) {
        if (($it['status'] ?? 'disponivel') === 'vendido') continue;   // vendidos saem do site
        $saida[$t][] = ao_item_publico($it);
    }
}

$json = json_encode($saida, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
if ($json === false) ao_falha('resposta-invalida');
echo $json;
