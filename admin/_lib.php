<?php
/*
 * Funções compartilhadas pelo painel (admin/api.php) e pelo catálogo público
 * (api/catalogo.php, api/foto.php). Não imprime nada se for aberto direto.
 *
 * Os DADOS (catálogo, senha, fotos) ficam FORA da pasta pública do site, em
 * "ao-dados", ao lado de public_html. Assim, atualizar o código pelo GitHub
 * nunca apaga o estoque cadastrado.
 */

const AO_PARA_NORMAL = 'disponivel';

/* ---------- Opções aceitas (fonte única; o painel recebe isso via API) ---------- */
function ao_opcoes(): array {
    return [
        'status'       => ['disponivel' => 'Disponível', 'reservado' => 'Reservado', 'vendido' => 'Vendido'],
        'cambio'       => ['Manual', 'Automático', 'Automatizado', 'CVT'],
        'combustivel'  => ['Flex', 'Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido', 'GNV'],
        'tipoImovel'   => ['Casa', 'Sobrado', 'Apartamento', 'Terreno', 'Chácara/Sítio', 'Comercial', 'Kitnet/Studio'],
        'finalidade'   => ['Venda', 'Aluguel'],
    ];
}

/* ---------- Pastas ---------- */
function ao_dados_dir(): string {
    static $dir = null;
    if ($dir !== null) return $dir;
    $cands = [];
    $env = getenv('AO_DATA_DIR');
    if ($env) $cands[] = $env;
    $root = realpath(__DIR__ . '/..');
    $cands[] = dirname($root) . '/ao-dados';   // fora da pasta pública (preferido)
    $cands[] = $root . '/storage';             // alternativa se o lugar acima não for gravável
    foreach ($cands as $c) {
        if (!is_dir($c)) @mkdir($c, 0750, true);
        if (is_dir($c) && is_writable($c)) {
            if (!is_file($c . '/index.html')) @file_put_contents($c . '/index.html', '');
            return $dir = $c;
        }
    }
    throw new RuntimeException('Nenhuma pasta gravável para guardar os dados.');
}

function ao_fotos_dir(): string {
    $d = ao_dados_dir() . '/fotos';
    if (!is_dir($d)) @mkdir($d, 0750, true);
    return $d;
}

/* ---------- Arquivos com "trava" (<?php exit; ?> na 1ª linha) ---------- */
function ao_guard_ler(string $path): ?array {
    if (!is_file($path)) return null;
    $raw = @file_get_contents($path);
    if ($raw === false) return null;
    $nl = strpos($raw, "\n");
    if ($nl === false) return null;
    $d = json_decode(substr($raw, $nl + 1), true);
    return is_array($d) ? $d : null;
}

function ao_escrita_atomica(string $path, string $conteudo): bool {
    $tmp = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (@file_put_contents($tmp, $conteudo, LOCK_EX) === false) return false;
    @chmod($tmp, 0640);
    if (!@rename($tmp, $path)) { @unlink($tmp); return false; }
    return true;
}

function ao_guard_escrever(string $path, array $d): bool {
    return ao_escrita_atomica($path, "<?php exit; ?>\n" . json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

/* ---------- Trava para gravações simultâneas ---------- */
function ao_com_trava(callable $fn) {
    $h = fopen(ao_dados_dir() . '/.trava', 'c');
    if (!$h) throw new RuntimeException('Não foi possível travar os dados.');
    flock($h, LOCK_EX);
    try { return $fn(); }
    finally { flock($h, LOCK_UN); fclose($h); }
}

/* ---------- Catálogo ---------- */
function ao_catalogo_path(): string { return ao_dados_dir() . '/catalogo.json'; }

function ao_catalogo_ler(): ?array {
    $p = ao_catalogo_path();
    if (!is_file($p)) return null;
    $d = json_decode((string) @file_get_contents($p), true);
    if (!is_array($d)) return null;
    $d['veiculos'] = isset($d['veiculos']) && is_array($d['veiculos']) ? array_values($d['veiculos']) : [];
    $d['imoveis']  = isset($d['imoveis'])  && is_array($d['imoveis'])  ? array_values($d['imoveis'])  : [];
    return $d;
}

/** Lê, deixa $fn alterar (por referência) e grava de forma atômica, guardando a versão anterior. */
function ao_catalogo_modificar(callable $fn) {
    return ao_com_trava(function () use ($fn) {
        $d = ao_catalogo_ler() ?? ['veiculos' => [], 'imoveis' => []];
        $r = $fn($d);
        $p = ao_catalogo_path();
        if (is_file($p)) @copy($p, ao_dados_dir() . '/catalogo.anterior.json');
        $json = json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if (!ao_escrita_atomica($p, $json)) throw new RuntimeException('Falha ao gravar o catálogo.');
        return $r;
    });
}

/* ---------- Registro do último backup baixado (para o lembrete no painel) ---------- */
function ao_backup_ultimo(): ?int {
    $b = ao_guard_ler(ao_dados_dir() . '/backup.php');
    return isset($b['ultimo']) ? (int) $b['ultimo'] : null;
}

function ao_backup_registrar(): void {
    ao_com_trava(function () { ao_guard_escrever(ao_dados_dir() . '/backup.php', ['ultimo' => time()]); });
}

/* ---------- Senha e sessão (token assinado, sem sessões de PHP) ---------- */
function ao_hash_atual(): array {
    $a = ao_guard_ler(ao_dados_dir() . '/auth.php');
    if ($a && !empty($a['hash'])) return [$a['hash'], false];
    $i = require __DIR__ . '/_inicial.php';
    return [$i['hash'], true];     // senha inicial: exige troca no primeiro acesso
}

function ao_segredo(): string {
    $f = ao_dados_dir() . '/segredo.php';
    $s = ao_guard_ler($f);
    if ($s && !empty($s['k'])) return $s['k'];
    return ao_com_trava(function () use ($f) {
        $s = ao_guard_ler($f);
        if ($s && !empty($s['k'])) return $s['k'];
        $k = bin2hex(random_bytes(32));
        ao_guard_escrever($f, ['k' => $k]);
        return $k;
    });
}

function ao_b64u(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function ao_b64u_dec(string $s) { return base64_decode(strtr($s, '-_', '+/'), true); }

function ao_cookie_path(): string {
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/admin/api.php')), '/');
    return ($dir === '' ? '' : $dir) . '/';
}

function ao_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

const AO_COOKIE = 'ao_admin';
const AO_DIAS_SESSAO = 30;

/** "Geração" das sessões: o logout a incrementa e todos os tokens anteriores deixam de valer. */
function ao_geracao(): int {
    $s = ao_guard_ler(ao_dados_dir() . '/sessao.php');
    return (int) ($s['g'] ?? 0);
}

function ao_encerrar_sessoes(): void {
    ao_com_trava(function () {
        ao_guard_escrever(ao_dados_dir() . '/sessao.php', ['g' => ao_geracao() + 1]);
    });
}

function ao_token_emitir(string $hash): string {
    $csrf = bin2hex(random_bytes(16));
    $p = ['exp' => time() + 86400 * AO_DIAS_SESSAO, 'v' => substr(hash('sha256', $hash), 0, 16), 'c' => $csrf, 'g' => ao_geracao()];
    $b = ao_b64u(json_encode($p));
    $sig = ao_b64u(hash_hmac('sha256', $b, ao_segredo(), true));
    $token = $b . '.' . $sig;
    setcookie(AO_COOKIE, $token, [
        'expires'  => $p['exp'], 'path' => ao_cookie_path(),
        'secure'   => ao_https(), 'httponly' => true, 'samesite' => 'Strict',
    ]);
    return $csrf;
}

function ao_token_apagar(): void {
    setcookie(AO_COOKIE, '', ['expires' => 1, 'path' => ao_cookie_path(), 'secure' => ao_https(), 'httponly' => true, 'samesite' => 'Strict']);
}

/** Retorna o payload do token se estiver válido (assinatura, validade e senha ainda a mesma). */
function ao_token_validar(): ?array {
    $t = $_COOKIE[AO_COOKIE] ?? '';
    if (!is_string($t) || substr_count($t, '.') !== 1) return null;
    [$b, $sig] = explode('.', $t);
    $esperada = ao_b64u(hash_hmac('sha256', $b, ao_segredo(), true));
    if (!hash_equals($esperada, $sig)) return null;
    $raw = ao_b64u_dec($b);
    $p = $raw === false ? null : json_decode($raw, true);
    if (!is_array($p) || ($p['exp'] ?? 0) < time()) return null;
    if ((int) ($p['g'] ?? -1) !== ao_geracao()) return null;
    [$hash] = ao_hash_atual();
    if (!hash_equals(substr(hash('sha256', $hash), 0, 16), (string) ($p['v'] ?? ''))) return null;
    return $p;
}

/* ---------- Limite de tentativas de senha ---------- */
const AO_MAX_FALHAS = 5;
const AO_BLOQUEIO_SEG = 900;

function ao_rl_chave(): string { return substr(hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'x'), 0, 16); }

function ao_rl_espera(): int {
    $d = ao_guard_ler(ao_dados_dir() . '/tentativas.php') ?? [];
    $e = $d[ao_rl_chave()] ?? null;
    if ($e && ($e['ate'] ?? 0) > time()) return (int) $e['ate'] - time();
    return 0;
}

function ao_rl_falha(): void {
    ao_com_trava(function () {
        $f = ao_dados_dir() . '/tentativas.php';
        $d = ao_guard_ler($f) ?? [];
        $k = ao_rl_chave();
        $e = $d[$k] ?? ['n' => 0, 'ate' => 0, 't' => 0];
        if (($e['ate'] ?? 0) && $e['ate'] <= time()) $e = ['n' => 0, 'ate' => 0, 't' => 0];
        $e['n']++; $e['t'] = time();
        if ($e['n'] >= AO_MAX_FALHAS) $e['ate'] = time() + AO_BLOQUEIO_SEG;
        $d[$k] = $e;
        foreach ($d as $kk => $v) if (($v['t'] ?? 0) < time() - 86400) unset($d[$kk]);
        ao_guard_escrever($f, $d);
    });
    usleep(400000); // freia tentativas em sequência
}

function ao_rl_limpar(): void {
    ao_com_trava(function () {
        $f = ao_dados_dir() . '/tentativas.php';
        $d = ao_guard_ler($f) ?? [];
        unset($d[ao_rl_chave()]);
        ao_guard_escrever($f, $d);
    });
}

/* ---------- Fotos ---------- */
const AO_REGEX_FOTO = '/^[a-f0-9]{20}\.jpg$/';

function ao_foto_url(string $nome): string {
    $base = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/x.php'))), '/');
    return $base . '/api/foto.php?f=' . rawurlencode($nome);
}

/** Valida, corrige orientação, reduz (máx. 1600px) e salva como JPEG. Retorna o nome do arquivo. */
function ao_processar_foto(string $tmp): string {
    if (!function_exists('imagecreatefromstring') || !function_exists('imagejpeg'))
        throw new InvalidArgumentException('O servidor não tem suporte a imagens (GD).');
    if (filesize($tmp) > 20 * 1024 * 1024) throw new InvalidArgumentException('Foto muito grande (máx. 20 MB).');
    $info = @getimagesize($tmp);
    if (!$info || !in_array($info['mime'], ['image/jpeg', 'image/png', 'image/webp'], true))
        throw new InvalidArgumentException('Formato não suportado. Use JPG, PNG ou WebP.');
    if ($info[0] * $info[1] > 60000000) throw new InvalidArgumentException('Imagem com resolução alta demais.');
    $im = @imagecreatefromstring((string) file_get_contents($tmp));
    if (!$im) throw new InvalidArgumentException('Não consegui ler essa imagem.');

    if ($info['mime'] === 'image/jpeg' && function_exists('exif_read_data')) {
        $ex = @exif_read_data($tmp);
        $o = (int) ($ex['Orientation'] ?? 1);
        $ang = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
        if ($ang) { $r = imagerotate($im, $ang, 0); if ($r) { imagedestroy($im); $im = $r; } }
    }

    $w = imagesx($im); $h = imagesy($im);
    $max = 1600;
    $esc = min(1, $max / max($w, $h));
    $nw = max(1, (int) round($w * $esc)); $nh = max(1, (int) round($h * $esc));
    $out = imagecreatetruecolor($nw, $nh);
    imagefill($out, 0, 0, imagecolorallocate($out, 255, 255, 255));
    imagecopyresampled($out, $im, 0, 0, 0, 0, $nw, $nh, $w, $h);
    imagedestroy($im);

    $nome = bin2hex(random_bytes(10)) . '.jpg';
    $ok = imagejpeg($out, ao_fotos_dir() . '/' . $nome, 82);
    imagedestroy($out);
    if (!$ok) throw new RuntimeException('Não foi possível salvar a foto.');
    return $nome;
}

function ao_foto_apagar(string $nome): void {
    if (preg_match(AO_REGEX_FOTO, $nome)) @unlink(ao_fotos_dir() . '/' . $nome);
}

/* ---------- Validação dos itens ---------- */
function ao_txt($v, int $max): string {
    $v = is_string($v) || is_numeric($v) ? (string) $v : '';
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    $v = trim($v);
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

function ao_num($v): ?int {
    if (is_int($v)) return $v;
    if (is_float($v)) return (int) round($v);
    if (is_string($v)) { $s = preg_replace('/[^\d]/', '', $v); return $s === '' ? null : (int) $s; }
    return null;
}

/** @return array [item|null, erros[campo=>mensagem]] */
function ao_normalizar(string $tipo, array $in, ?array $atual): array {
    $o = ao_opcoes();
    $e = [];
    $it = $atual ?? [];

    $it['status'] = array_key_exists($in['status'] ?? '', $o['status']) ? $in['status'] : AO_PARA_NORMAL;

    $preco = ao_num($in['preco'] ?? null);
    if ($preco === null || $preco <= 0) $e['preco'] = 'Informe o preço.';
    elseif ($preco > 500000000) $e['preco'] = 'Preço alto demais.';
    $it['preco'] = $preco ?? 0;
    $it['descricao'] = ao_txt($in['descricao'] ?? '', 1500);

    if ($tipo === 'veiculos') {
        $it['marca']  = ao_txt($in['marca'] ?? '', 40);
        $it['modelo'] = ao_txt($in['modelo'] ?? '', 80);
        if ($it['marca'] === '')  $e['marca']  = 'Informe a marca.';
        if ($it['modelo'] === '') $e['modelo'] = 'Informe o modelo.';
        $ano = ao_num($in['ano'] ?? null);
        if ($ano === null || $ano < 1950 || $ano > (int) date('Y') + 1) $e['ano'] = 'Informe um ano válido.';
        $it['ano'] = $ano ?? 0;
        $km = ao_num($in['km'] ?? null);
        if ($km === null || $km < 0 || $km > 2000000) $e['km'] = 'Informe a quilometragem (0 se for zero km).';
        $it['km'] = $km ?? 0;
        $it['cambio']      = in_array($in['cambio'] ?? '', $o['cambio'], true) ? $in['cambio'] : $o['cambio'][0];
        $it['combustivel'] = in_array($in['combustivel'] ?? '', $o['combustivel'], true) ? $in['combustivel'] : $o['combustivel'][0];
        $it['cor'] = ao_txt($in['cor'] ?? '', 30);
    } else {
        $it['tipo']       = in_array($in['tipo'] ?? '', $o['tipoImovel'], true) ? $in['tipo'] : $o['tipoImovel'][0];
        $it['finalidade'] = in_array($in['finalidade'] ?? '', $o['finalidade'], true) ? $in['finalidade'] : 'Venda';
        $it['titulo'] = ao_txt($in['titulo'] ?? '', 100);
        if ($it['titulo'] === '') $e['titulo'] = 'Informe um título (ex.: Casa com 3 quartos).';
        $it['bairro'] = ao_txt($in['bairro'] ?? '', 60);
        $it['cidade'] = ao_txt($in['cidade'] ?? '', 60);
        if ($it['cidade'] === '') $e['cidade'] = 'Informe a cidade.';
        foreach (['quartos' => 50, 'banheiros' => 50, 'vagas' => 50, 'area' => 1000000] as $c => $lim) {
            $n = ao_num($in[$c] ?? 0) ?? 0;
            if ($n < 0 || $n > $lim) $e[$c] = 'Valor inválido.';
            $it[$c] = max(0, min($lim, $n));
        }
    }

    // fotos: só nomes de arquivos que existem na pasta de fotos
    $fotos = [];
    foreach ((array) ($in['fotos'] ?? []) as $f) {
        if (is_string($f) && preg_match(AO_REGEX_FOTO, $f) && is_file(ao_fotos_dir() . '/' . $f) && !in_array($f, $fotos, true)) $fotos[] = $f;
    }
    $it['fotos'] = array_slice($fotos, 0, 12);

    if ($e) return [null, $e];
    return [$it, []];
}

/** Item pronto para o site público (sem campos internos, com URLs das fotos). */
function ao_item_publico(array $it): array {
    $it['fotos'] = array_map('ao_foto_url', array_values($it['fotos'] ?? []));
    unset($it['criado'], $it['atualizado']);
    return $it;
}

function ao_json(int $code, array $corpo): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
