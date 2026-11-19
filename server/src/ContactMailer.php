<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

/** Sends the enquiry as a plain-text mail via SMTP (PHPMailer). */
final class ContactMailer
{
    public function __construct(private readonly array $config)
    {
    }

    /** @param array<string, string> $data validated form data */
    public function send(array $data): bool
    {
        $mail = new PHPMailer(true); // true = throw exceptions
        $smtp = $this->config['smtp'];
        $meta = $this->config['mail'];

        try {
            $mail->isSMTP();
            $mail->Host = $smtp['host'];
            $mail->Port = (int) $smtp['port'];
            $mail->Timeout = (int) ($smtp['timeout'] ?? 15);
            $mail->SMTPAuth = $smtp['username'] !== '';
            $mail->Username = $smtp['username'];
            $mail->Password = $smtp['password'];

            if ($smtp['encryption'] === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($smtp['encryption'] === 'tls') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            } else {
                $mail->SMTPAutoTLS = false; // local test server only
            }

            $mail->CharSet = PHPMailer::CHARSET_UTF8;
            $mail->XMailer = ' '; // do not advertise the software version
            $mail->Hostname = substr((string) strrchr($meta['from'], '@'), 1); // Message-ID with our domain

            $mail->setFrom($meta['from'], $meta['from_name']);
            $mail->addAddress($meta['to']);
            // "Reply" in the mail program answers the customer directly.
            // PHPMailer validates the address, so no header injection is possible.
            $mail->addReplyTo($data['email'], $data['name']);

            $mail->Subject = $meta['subject'] . ($data['organisation'] !== '' ? ' – ' . $data['organisation'] : '');
            $mail->Body = $this->body($data);
            $mail->isHTML(false);

            return $mail->send();
        } catch (MailException $e) {
            error_log('Mail error: ' . $mail->ErrorInfo);
            return false;
        }
    }

    private function body(array $d): string
    {
        $line = static fn (string $label, string $value): string =>
            str_pad($label, 15) . ($value !== '' ? $value : '–') . "\n";

        return "Neue Anfrage über die Website\n"
            . str_repeat('=', 32) . "\n\n"
            . $line('Name:', $d['name'])
            . $line('Organisation:', $d['organisation'])
            . $line('E-Mail:', $d['email'])
            . $line('Telefon:', $d['phone'])
            . "\n"
            . $line('Veranstaltung:', $d['event'])
            . $line('Datum:', $d['date'])
            . $line('Ort:', $d['place'])
            . $line('Interesse an:', $d['interests'])
            . $line('Sprache:', strtoupper($d['lang']))
            . "\nNachricht:\n" . $d['message'] . "\n\n"
            . "--\nDatenschutz-Einwilligung erteilt am " . date('d.m.Y H:i') . " Uhr\n";
    }
}
