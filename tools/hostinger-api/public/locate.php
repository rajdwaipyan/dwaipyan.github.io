<?php
// Finds the private folder (portfolio-api/) by walking up from this public folder, so no server path has to be
// written into a public file. Set the PORTFOLIO_API_HOME environment variable to use another location.
declare(strict_types=1);

return (function (): string {
  $env = getenv('PORTFOLIO_API_HOME');
  if ($env && is_file($env . '/bootstrap.php')) return $env . '/bootstrap.php';
  for ($dir = __DIR__; ($parent = dirname($dir)) !== $dir; $dir = $parent) {
    if (is_file($parent . '/portfolio-api/bootstrap.php')) return $parent . '/portfolio-api/bootstrap.php';
  }
  http_response_code(503);
  header('Content-Type: application/json');
  echo '{"ok":false,"error":"not_installed"}';
  exit;
})();
