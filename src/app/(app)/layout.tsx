'use client';

/**
 * App shell layout — wraps all authenticated (app) routes.
 * Renders top-level navigation and applies AppKeyGate.
 * AppKeyGate redirects to /login if no key is in sessionStorage.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box } from '@chakra-ui/react';
import { AppKeyGate, clearAppAccessKey } from '@/components/shared/AppKeyGate';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { href: '/tts', label: 'Text to Speech' },
  { href: '/voices', label: 'Voices' },
  { href: '/library', label: 'Library' },
];

function NavBar() {
  const pathname = usePathname();

  const handleLogout = () => {
    clearAppAccessKey();
    window.location.href = '/login';
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 40, width: '100%', borderBottom: '1px solid #e5e7eb', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}>
      <Box display="flex" h={14} alignItems="center" justifyContent="space-between" maxW="container.xl" marginLeft="auto" marginRight="auto" px={4}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/tts" style={{ fontWeight: 600, color: '#111827' }}>
            MiniMax Speech
          </Link>
          <ul style={{ display: 'flex', gap: '0.25rem' }}>
            {NAV_LINKS.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    style={{
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: '0.375rem',
                      transition: 'color 0.2s, background-color 0.2s',
                      backgroundColor: isActive ? '#f3f4f6' : 'transparent',
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? '#111827' : '#6b7280',
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <Box display="flex" alignItems="center" gap={2}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
             <Link href="/voices/clone" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
               Clone Voice
             </Link>
             <Link href="/voices/design" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
               Design Voice
             </Link>
          </nav>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </Box>
      </Box>
    </header>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppKeyGate>
      <Box display="flex" minH="100vh" flexDirection="column">
        <NavBar />
         <Box flex={1} maxW="container.xl" ml="auto" mr="auto" px={4} py={6} width="100%">{children}</Box>
      </Box>
    </AppKeyGate>
  );
}
