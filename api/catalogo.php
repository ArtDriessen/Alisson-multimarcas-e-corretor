<?php
/* Catálogo público (somente leitura) usado por veiculos.html e imoveis.html. */
declare(strict_types=1);
require __DIR__ . '/../admin/_lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Content-Type-Options: nosniff');

try {
    $d = ao_catalogo_ler();
} catch (Throwable $e) {
    $d = null;
}

if ($d === null) {            // nada cadastrado ainda: o site usa os exemplos de data/catalogo.js
    http_response_code(404);
    echo '{"erro":"sem-dados"}';
    exit;
}

$saida = ['veiculos' => [], 'imoveis' => []];
foreach (['veiculos', 'imoveis'] as $t) {
    foreach ($d[$t] as $it) {
        if (($it['status'] ?? 'disponivel') === 'vendido') continue;   // vendidos saem do site
        $saida[$t][] = ao_item_publico($it);
    }
}
echo json_encode($saida, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
