'use client';

/**
 * Login page — app access key entry.
 * POSTs the entered key to /api/auth/validate.
 * Stores key in sessionStorage on 200, redirects to /tts.
 * Shows inline error on failure.
 */

import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { setAppAccessKey } from '@/components/shared/AppKeyGate';
import { validateAppAccessKey } from '@/lib/auth-client';

export default function LoginPage() {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = key.trim();
    if (!trimmed) {
      setError('Please enter an access key.');
      return;
    }

    setIsLoading(true);

    try {
      const valid = await validateAppAccessKey(trimmed);

      if (valid) {
        setAppAccessKey(trimmed);
        window.location.href = '/tts';
      } else {
        setError('Invalid access key. Please check and try again.');
      }
    } catch {
      setError('Unable to validate key. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <Card w="full" maxW="sm">
        <CardHeader textAlign="center">
          <CardTitle>MiniMax Speech</CardTitle>
          <CardDescription>
            Enter your app access key to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <Box display="grid" gap={2}>
              <Label htmlFor="access-key">Access Key</Label>
              <Input
                id="access-key"
                type="password"
                placeholder="Enter your APP_ACCESS_KEY"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
                autoFocus
                disabled={isLoading}
              />
            </Box>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isLoading} style={{ width: '100%' }}>
              {isLoading ? 'Validating...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
