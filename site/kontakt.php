<?php
/**
 * Minimal contact form handler for bungee-action-eventmodule.de
 *
 * Why PHP: a static page (HTML/CSS/JS) cannot send e-mails by itself.
 * Almost every shared hosting package (IONOS, Strato, all-inkl, ...) runs PHP
 * and provides mail(), so this single file is all the "backend" we need.
 *
 * Returns JSON for the JS fetch() request, or redirects back to the page
 * when JavaScript is disabled.
 */

// ---------- Configuration ----------
const MAIL_TO      = 'info@bungee-action.de';
// Must be an address on YOUR domain, otherwise many providers reject/flag the mail
const MAIL_FROM    = 'website@bungee-action-eventmodule.de';
const MAIL_SUBJECT = 'Neue Anfrage über bungee-action-eventmodule.de';

// ---------- Helpers ----------
$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function respond(bool $ok, string $error = ''): void
{
    global $wantsJson;
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($ok ? 200 : 400);
        echo json_encode(['ok' => $ok, 'error' => $error]);
    } else {
        header('Location: index.html' . ($ok ? '?sent=1' : '?sent=0') . '#kontakt');
    }
    exit;
}

/** Trim, strip tags and remove line breaks (prevents header injection). */
function clean_line(string $key): string
{
    $value = trim(strip_tags($_POST[$key] ?? ''));
    return str_replace(["\r", "\n", '%0a', '%0d'], ' ', $value);
}

// ---------- Guards ----------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'method');
}

// Honeypot filled -> pretend success, silently drop (bot)
if (!empty($_POST['website'])) {
    respond(true);
}

// ---------- Read & validate input ----------
$name    = clean_line('name');
$org     = clean_line('organisation');
$email   = clean_line('email');
$phone   = clean_line('phone');
$event   = clean_line('event');
$date    = clean_line('date');
$place   = clean_line('place');
$message = trim(strip_tags($_POST['message'] ?? ''));
$consent = ($_POST['consent'] ?? '') === 'yes';

$interests = array_map(
    fn($v) => trim(strip_tags((string) $v)),
    (array) ($_POST['interest'] ?? [])
);

if ($name === '' || $message === '' || !$consent || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'validation');
}

// Simple length limits against abuse
if (mb_strlen($message) > 5000 || mb_strlen($name) > 200) {
    respond(false, 'too_long');
}

// ---------- Build mail ----------
$body = "Neue Anfrage über die Website\n"
      . "================================\n\n"
      . "Name:          $name\n"
      . "Organisation:  $org\n"
      . "E-Mail:        $email\n"
      . "Telefon:       $phone\n\n"
      . "Veranstaltung: $event\n"
      . "Datum:         $date\n"
      . "Ort:           $place\n"
      . "Interesse an:  " . implode(', ', $interests) . "\n\n"
      . "Nachricht:\n$message\n\n"
      . "--\nDatenschutz-Einwilligung erteilt am " . date('d.m.Y H:i') . "\n";

$headers = [
    'From: Bungee Action Website <' . MAIL_FROM . '>',
    'Reply-To: ' . $email,          // "Reply" in the mail client answers the customer directly
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . phpversion(),
];

$subject = '=?UTF-8?B?' . base64_encode(MAIL_SUBJECT . ($org ? " – $org" : '')) . '?=';

$sent = mail(MAIL_TO, $subject, $body, implode("\r\n", $headers), '-f' . MAIL_FROM);

respond($sent, $sent ? '' : 'mail');
