<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class AirtableService
{
    private string $apiKey;
    private string $baseId;

    public function __construct()
    {
        $this->apiKey = config('airtable.api_key');
        $this->baseId = config('airtable.base_id');
    }

    private function tableEndpoint(string $tableName): string
    {
        $normalized = $this->normalizeTableName($tableName);
        return "https://api.airtable.com/v0/{$this->baseId}/" . urlencode($normalized);
    }

    private function normalizeTableName(string $raw): string
    {
        // Accept either a plain table name (e.g., "Users") or a table ID (e.g., "tbl123...").
        // If someone accidentally sets "tbl123.../Users", pick the table ID portion.
        if (str_contains($raw, '/') || str_contains($raw, '\\')) {
            $parts = preg_split('/[\\\\\/]+/', $raw);
            foreach ($parts as $part) {
                if (str_starts_with($part, 'tbl')) {
                    return $part; // Prefer table ID when present
                }
            }
            // Fallback to the last segment
            return end($parts) ?: $raw;
        }
        return $raw;
    }

    private function http()
    {
        $client = Http::withToken($this->apiKey);
        $verify = config('airtable.verify_ssl');
        $ca = config('airtable.ca_bundle');
        if ($verify === false) {
            $client = $client->withoutVerifying();
        } elseif ($ca) {
            $client = $client->withOptions(['verify' => $ca]);
        }
        return $client;
    }

    public function listRecords(string $tableName, array $params = []): array
    {
        $endpoint = $this->tableEndpoint($tableName);
        \Log::info('Airtable listRecords', ['endpoint' => $endpoint, 'params' => $params]);
        
        $response = $this->http()->get($endpoint, $params);

        if ($response->failed()) {
            \Log::error('Airtable listRecords failed', ['body' => $response->body()]);
            throw new \RuntimeException('Airtable listRecords failed: ' . $response->body());
        }

        $data = $response->json();
        \Log::info('Airtable listRecords response', ['recordCount' => count($data['records'] ?? [])]);

        return $data;
    }

    public function getRecord(string $tableName, string $recordId): array
    {
        $response = $this->http()->get($this->tableEndpoint($tableName) . "/{$recordId}");

        if ($response->failed()) {
            throw new \RuntimeException('Airtable getRecord failed: ' . $response->body());
        }

        return $response->json();
    }

    public function updateRecord(string $tableName, string $recordId, array $fields): array
    {
        $response = $this->http()->patch($this->tableEndpoint($tableName) . "/{$recordId}", [
                'fields' => $fields,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Airtable updateRecord failed: ' . $response->body());
        }

        return $response->json();
    }

    public function createRecord(string $tableName, array $fields): array
    {
        $response = $this->http()->post($this->tableEndpoint($tableName), [
                'fields' => $fields,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Airtable createRecord failed: ' . $response->body());
        }

        return $response->json();
    }

    public function findUserByUsernameOrEmail(string $tableName, string $usernameOrEmail): ?array
    {
        $value = addslashes($usernameOrEmail);
        // If it looks like an email, filter only by {email} to avoid referencing missing {username}
        $filter = str_contains($usernameOrEmail, '@')
            ? "{email}='{$value}'"
            : "OR({username}='{$value}',{email}='{$value}')";

        $response = $this->listRecords($tableName, [
            'filterByFormula' => $filter,
            'maxRecords' => 1,
        ]);

        $records = $response['records'] ?? [];
        
        if (empty($records)) {
            return null;
        }
        return $records[0];
    }

    public function findAcrossTables(array $tableNames, string $usernameOrEmail): ?array
    {
        foreach ($tableNames as $name) {
            if (!$name) {
                continue;
            }
            try {
                $found = $this->findUserByUsernameOrEmail($name, $usernameOrEmail);
            } catch (\RuntimeException $e) {
                // If table is missing (NOT_FOUND), try the next table
                if (str_contains($e->getMessage(), 'NOT_FOUND')) {
                    continue;
                }
                throw $e;
            }
            if ($found) {
                return $found + ['__table' => $name];
            }
        }
        return null;
    }
}


