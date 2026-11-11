<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

// Funciones Criptográficas AES-256-GCM (Ley 19.628)
function encryptAES256(string $plainText, string $hexKey): string {
    if ($plainText === '') return '';
    $key = hex2bin($hexKey);
    $iv = random_bytes(12);
    $tag = '';
    $cipherText = openssl_encrypt($plainText, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, '', 16);
    return bin2hex($iv) . ':' . bin2hex($tag) . ':' . bin2hex($cipherText);
}

function decryptAES256(?string $payload, string $hexKey): string {
    if (!$payload || strpos($payload, ':') === false) return $payload ?: '';
    $parts = explode(':', $payload);
    if (count($parts) !== 3) return $payload;
    [$ivHex, $tagHex, $cipherHex] = $parts;
    $key = hex2bin($hexKey);
    $decrypted = openssl_decrypt(
        hex2bin($cipherHex),
        'aes-256-gcm',
        $key,
        OPENSSL_RAW_DATA,
        hex2bin($ivHex),
        hex2bin($tagHex)
    );
    return $decrypted !== false ? $decrypted : '[DATO PROTEGIDO AES-256]';
}

// Funciones JWT Nativas (HMAC-SHA256 sin librerías externas)
function createJWT(array $payload, string $secret): string {
    $header = rtrim(strtr(base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'])), '+/', '-_'), '=');
    $payload['exp'] = time() + (8 * 3600);
    $body = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $sig = rtrim(strtr(base64_encode(hash_hmac('sha256', "$header.$body", $secret, true)), '+/', '-_'), '=');
    return "$header.$body.$sig";
}

function verifyJWT(string $secret): ?array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return null;
    }
    $parts = explode('.', trim($matches[1]));
    if (count($parts) !== 3) return null;
    [$header, $body, $sig] = $parts;
    $expectedSig = rtrim(strtr(base64_encode(hash_hmac('sha256', "$header.$body", $secret, true)), '+/', '-_'), '=');
    if (!hash_equals($expectedSig, $sig)) return null;
    $data = json_decode(base64_decode(strtr($body, '-_', '+/')), true);
    if (!$data || (isset($data['exp']) && $data['exp'] < time())) return null;
    return $data;
}
