<?php
/* API do painel do Alisson. Todas as respostas são JSON. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

set_error_handler(function ($no, $msg) { return true; }); // não vazar avisos do PHP na resposta

try {
    $acao = (string) ($_GET['action'] ?? '');
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $porPost = ['login', 'logout', 'trocar_senha', 'salvar', 'excluir', 'enviar_foto'];
    $porGet  = ['me', 'listar', 'backup'];
    if (!in_array($acao, array_merge($porPost, $porGet), true)) ao_json(404, ['erro' => 'Ação desconhecida.']);
    if (in_array($acao, $porPost, true) && $metodo !== 'POST') ao_json(405, ['erro' => 'Use POST.']);
    if (in_array($acao, $porGet, true) && $metodo !== 'GET') ao_json(405, ['erro' => 'Use GET.']);

    $corpo = [];
    if ($metodo === 'POST' && $acao !== 'enviar_foto') {
        $raw = file_get_contents('php://input', false, null, 0, 1048577);
        if ($raw !== false && strlen($raw) > 1048576) ao_json(413, ['erro' => 'Requisição grande demais.']);
        $corpo = json_decode((string) $raw, true);
        if (!is_array($corpo)) $corpo = [];
    }

    /* ---------- Login (sem sessão) ---------- */
    if ($acao === 'login') {
        $espera = ao_rl_espera();
        if ($espera > 0) ao_json(429, ['erro' => 'Muitas tentativas. Tente de novo em ' . (int) ceil($espera / 60) . ' min.']);
        [$hash, $trocar] = ao_hash_atual();
        $senha = is_string($corpo['senha'] ?? null) ? $corpo['senha'] : '';
        if ($senha === '' || !password_verify($senha, $hash)) {
            ao_rl_falha();
            ao_json(401, ['erro' => 'Senha incorreta.']);
        }
        ao_rl_limpar();
        $csrf = ao_token_emitir($hash);
        ao_json(200, ['ok' => true, 'csrf' => $csrf, 'trocarSenha' => $trocar, 'opcoes' => ao_opcoes()]);
    }

    /* ---------- Estado da sessão ---------- */
    $tk = ao_token_validar();
    if ($acao === 'me') {
        if (!$tk) ao_json(200, ['logado' => false]);
        [, $trocar] = ao_hash_atual();
        ao_json(200, ['logado' => true, 'csrf' => $tk['c'], 'trocarSenha' => $trocar, 'opcoes' => ao_opcoes()]);
    }

    /* ---------- Tudo abaixo exige login ---------- */
    if (!$tk) ao_json(401, ['erro' => 'Sessão expirada. Entre novamente.']);
    if ($metodo === 'POST') {
        $h = (string) ($_SERVER['HTTP_X_CSRF'] ?? '');
        if (!hash_equals((string) $tk['c'], $h)) ao_json(403, ['erro' => 'Requisição não autorizada. Recarregue a página.']);
    }

    if ($acao === 'logout') { ao_encerrar_sessoes(); ao_token_apagar(); ao_json(200, ['ok' => true]); }

    [$hashAtual, $mustChange] = ao_hash_atual();

    if ($acao === 'trocar_senha') {
        $atual = is_string($corpo['atual'] ?? null) ? $corpo['atual'] : '';
        $nova  = is_string($corpo['nova'] ?? null) ? $corpo['nova'] : '';
        $espera = ao_rl_espera();
        if ($espera > 0) ao_json(429, ['erro' => 'Muitas tentativas. Tente de novo em ' . (int) ceil($espera / 60) . ' min.']);
        if (!password_verify($atual, $hashAtual)) { ao_rl_falha(); ao_json(400, ['erro' => 'A senha atual não confere.']); }
        if (strlen($nova) < 8) ao_json(400, ['erro' => 'A nova senha precisa ter pelo menos 8 caracteres.']);
        if (strlen($nova) > 200) ao_json(400, ['erro' => 'Senha longa demais.']);
        if (hash_equals($atual, $nova)) ao_json(400, ['erro' => 'Escolha uma senha diferente da atual.']);
        $novoHash = password_hash($nova, PASSWORD_BCRYPT, ['cost' => 12]);
        if (!ao_guard_escrever(ao_dados_dir() . '/auth.php', ['hash' => $novoHash, 'alterada' => date('c')]))
            ao_json(500, ['erro' => 'Não foi possível salvar a nova senha.']);
        ao_rl_limpar();
        $csrf = ao_token_emitir($novoHash);   // renova a sessão (a antiga deixa de valer)
        ao_json(200, ['ok' => true, 'csrf' => $csrf]);
    }

    // Enquanto a senha inicial não for trocada, nada além disso funciona.
    if ($mustChange) ao_json(403, ['erro' => 'Crie sua senha pessoal antes de continuar.', 'trocarSenha' => true]);

    if ($acao === 'listar') {
        $d = ao_catalogo_ler() ?? ['veiculos' => [], 'imoveis' => []];
        foreach (['veiculos', 'imoveis'] as $t) {
            foreach ($d[$t] as &$it) {
                $it['fotosUrl'] = array_map('ao_foto_url', array_values($it['fotos'] ?? []));
            }
            unset($it);
        }
        ao_json(200, ['veiculos' => $d['veiculos'], 'imoveis' => $d['imoveis'], 'iniciado' => ao_catalogo_ler() !== null]);
    }

    if ($acao === 'backup') {
        $d = ao_catalogo_ler() ?? ['veiculos' => [], 'imoveis' => []];
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="backup-catalogo-' . date('Y-m-d') . '.json"');
        echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        exit;
    }

    if ($acao === 'enviar_foto') {
        $f = $_FILES['foto'] ?? null;
        if (!$f || !is_array($f) || ($f['error'] ?? 4) !== UPLOAD_ERR_OK || !is_uploaded_file((string) $f['tmp_name'])) {
            ao_json(400, ['erro' => 'Não consegui receber a foto. Tente de novo.']);
        }
        try { $nome = ao_processar_foto((string) $f['tmp_name']); }
        catch (InvalidArgumentException $e) { ao_json(400, ['erro' => $e->getMessage()]); }
        ao_json(200, ['ok' => true, 'nome' => $nome, 'url' => ao_foto_url($nome)]);
    }

    $tipo = (string) ($corpo['tipo'] ?? '');
    if (!in_array($tipo, ['veiculos', 'imoveis'], true)) ao_json(400, ['erro' => 'Tipo inválido.']);

    if ($acao === 'salvar') {
        $in = is_array($corpo['item'] ?? null) ? $corpo['item'] : [];
        $id = is_string($in['id'] ?? null) ? $in['id'] : '';
        $resp = ao_catalogo_modificar(function (array &$d) use ($tipo, $in, $id) {
            $pos = null;
            if ($id !== '') foreach ($d[$tipo] as $i => $x) if (($x['id'] ?? '') === $id) { $pos = $i; break; }
            if ($id !== '' && $pos === null) return ['codigo' => 404, 'corpo' => ['erro' => 'Item não encontrado (já foi excluído?).']];
            [$it, $erros] = ao_normalizar($tipo, $in, $pos !== null ? $d[$tipo][$pos] : null);
            if ($erros) return ['codigo' => 422, 'corpo' => ['erro' => 'Confira os campos destacados.', 'campos' => $erros]];
            $agora = date('c');
            if ($pos === null) {
                $it['id'] = bin2hex(random_bytes(6));
                $it['criado'] = $agora; $it['atualizado'] = $agora;
                array_unshift($d[$tipo], $it);          // novidades aparecem primeiro
            } else {
                $antigas = $d[$tipo][$pos]['fotos'] ?? [];
                $it['id'] = $d[$tipo][$pos]['id']; $it['criado'] = $d[$tipo][$pos]['criado'] ?? $agora; $it['atualizado'] = $agora;
                $d[$tipo][$pos] = $it;
                foreach ($antigas as $f) if (!in_array($f, $it['fotos'], true)) ao_foto_apagar($f);
            }
            return ['codigo' => 200, 'corpo' => ['ok' => true, 'item' => $it]];
        });
        ao_json($resp['codigo'], $resp['corpo']);
    }

    if ($acao === 'excluir') {
        $id = (string) ($corpo['id'] ?? '');
        $resp = ao_catalogo_modificar(function (array &$d) use ($tipo, $id) {
            foreach ($d[$tipo] as $i => $x) {
                if (($x['id'] ?? '') === $id) {
                    foreach ($x['fotos'] ?? [] as $f) ao_foto_apagar($f);
                    array_splice($d[$tipo], $i, 1);
                    return ['codigo' => 200, 'corpo' => ['ok' => true]];
                }
            }
            return ['codigo' => 404, 'corpo' => ['erro' => 'Item não encontrado.']];
        });
        ao_json($resp['codigo'], $resp['corpo']);
    }

    ao_json(400, ['erro' => 'Requisição inválida.']);
} catch (Throwable $e) {
    ao_json(500, ['erro' => 'Erro interno. Tente novamente em instantes.']);
}
