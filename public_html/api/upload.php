<?php
/**
 * Hostinger Media Upload API Endpoint — Geração Z Pro
 * Securely handles file uploads from Vercel backend to midia.geracaozpro.com
 */

header('Content-Type: application/json; charset=utf-8');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'METHOD_NOT_ALLOWED']);
    exit;
}

// 1. Validate Secret Header
$headers = getallheaders();
$secret = $headers['x-media-upload-secret'] ?? $headers['X-Media-Upload-Secret'] ?? $_SERVER['HTTP_X_MEDIA_UPLOAD_SECRET'] ?? '';

// Load secret from external config file outside public_html if available
$configPath = dirname(__DIR__, 2) . '/config/chat_media_config.php';
$expectedSecret = '';
if (file_exists($configPath)) {
    $config = require $configPath;
    $expectedSecret = $config['upload_secret'] ?? $config['secret'] ?? '';
}

if (empty($expectedSecret)) {
    $expectedSecret = getenv('HOSTINGER_MEDIA_UPLOAD_SECRET') ?: '';
}

if (empty($expectedSecret)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'UPLOAD_SECRET_NOT_CONFIGURED', 'message' => 'Segredo de upload não configurado no servidor.']);
    exit;
}

if (empty($secret) || !hash_equals($expectedSecret, $secret)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'FORBIDDEN', 'message' => 'Acesso negado: segredo de upload inválido ou ausente.']);
    exit;
}

// 2. Validate Storage Key
$storageKey = trim($_POST['storage_key'] ?? '');
if (empty($storageKey) || strpos($storageKey, 'uploads/chat/') !== 0 || strpos($storageKey, '..') !== false || strpos($storageKey, '\\') !== false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'INVALID_STORAGE_KEY', 'message' => 'Caminho de armazenamento inválido.']);
    exit;
}

// 3. Validate Uploaded File
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'NO_FILE_UPLOADED', 'message' => 'Nenhum arquivo enviado ou erro no upload.']);
    exit;
}

$file = $_FILES['file'];
$fileSize = $file['size'];
$tmpPath = $file['tmp_name'];

// Determine category & size limits based on storage_key
$maxSizeBytes = 8 * 1024 * 1024; // 8MB Default for images
if (strpos($storageKey, 'uploads/chat/profiles/') !== false) {
    $maxSizeBytes = 3 * 1024 * 1024; // 3MB for Avatars
} elseif (strpos($storageKey, 'uploads/chat/audio/') !== false) {
    $maxSizeBytes = 15 * 1024 * 1024; // 15MB for Audio
}

if ($fileSize > $maxSizeBytes) {
    http_response_code(413);
    echo json_encode(['success' => false, 'error' => 'FILE_TOO_LARGE', 'message' => 'O arquivo excede o limite permitido.']);
    exit;
}

// Check mime type / extension
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $tmpPath);
finfo_close($finfo);

$allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a'
];

if (!in_array($mimeType, $allowedMimeTypes, true)) {
    http_response_code(415);
    echo json_encode(['success' => false, 'error' => 'UNSUPPORTED_MEDIA_TYPE', 'message' => 'Tipo de arquivo não suportado: ' . $mimeType]);
    exit;
}

// 4. Move file to target path
$targetPath = dirname(__DIR__) . '/' . $storageKey;
$targetDir = dirname($targetPath);

if (!is_dir($targetDir)) {
    if (!mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'STORAGE_DIRECTORY_ERROR', 'message' => 'Não foi possível criar o diretório de destino.']);
        exit;
    }
}

if (!move_uploaded_file($tmpPath, $targetPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'FILE_SAVE_ERROR', 'message' => 'Erro ao salvar o arquivo no servidor.']);
    exit;
}

// Set standard permissions
chmod($targetPath, 0644);

// 5. Success
$publicUrl = 'https://midia.geracaozpro.com/' . $storageKey;

http_response_code(200);
echo json_encode([
    'success' => true,
    'url' => $publicUrl,
    'storage_key' => $storageKey,
    'size' => $fileSize,
    'mime' => $mimeType
]);
