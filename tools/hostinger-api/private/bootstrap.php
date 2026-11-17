<?php
// Loads the private part of the API. Lives OUTSIDE the public web root (e.g. /home/u123456789/portfolio-api/),
// together with config.php, the templates, PHPMailer and the logs. The public files only require this one.
declare(strict_types=1);

define('API_HOME', __DIR__);
date_default_timezone_set('UTC');
ini_set('display_errors', '0');
mb_internal_encoding('UTF-8');

require __DIR__ . '/src/lib.php';
require __DIR__ . '/src/security.php';
require __DIR__ . '/src/mailer.php';
require __DIR__ . '/src/forms.php';
require __DIR__ . '/src/ai.php';
