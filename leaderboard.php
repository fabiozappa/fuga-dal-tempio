<?php
// Classifica a punti — legge/scrive assets/leaderboard.json (prime 10 posizioni).
//   GET  -> ritorna la top 10 (array di { name, score, date }).
//   POST -> body JSON { name, score }: inserisce, tiene le prime 10, salva.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$file = __DIR__ . '/assets/leaderboard.json';

function load_board($file) {
  if (!is_file($file)) return [];
  $data = json_decode(@file_get_contents($file), true);
  return is_array($data) ? $data : [];
}
function top10($list) {
  usort($list, fn($a, $b) => ($b['score'] ?? 0) <=> ($a['score'] ?? 0));
  return array_slice($list, 0, 10);
}

$list = top10(load_board($file));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $body = json_decode(file_get_contents('php://input'), true) ?: [];
  $score = isset($body['score']) ? (int) $body['score'] : null;
  $name = isset($body['name']) ? trim((string) $body['name']) : '';
  // Sanifica il nome: solo lettere/numeri/spazi/-/_ , max 16 caratteri.
  $name = preg_replace('/[^\p{L}\p{N} _\-]/u', '', $name);
  $name = mb_substr($name, 0, 16);
  if ($name === '') $name = 'Anonimo';

  if ($score === null) {
    http_response_code(400);
    echo json_encode(['error' => 'score mancante']);
    exit;
  }

  $list[] = ['name' => $name, 'score' => $score, 'date' => date('c')];
  $list = top10($list);
  @file_put_contents($file, json_encode($list, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

echo json_encode($list, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
