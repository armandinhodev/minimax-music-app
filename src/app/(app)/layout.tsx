'use client';

/**
 * App shell layout — wraps all authenticated (app) routes.
 * Renders the authenticated product shell and applies AppKeyGate.
 * AppKeyGate redirects to /login if no key is in sessionStorage.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import { AppKeyGate, clearAppAccessKey } from '@/components/shared/AppKeyGate';
import { Button } from '@/components/ui/button';

const SPEECH_MATCH_PATHS = ['/tts', '/voices'];
const IMAGE_MATCH_PATHS = ['/image'];
const MUSIC_MATCH_PATHS = ['/music'];
const LIBRARY_MATCH_PATHS = ['/library'];

const SPEECH_LINKS = [
  { href: '/tts', label: 'Text to Speech' },
  { href: '/voices', label: 'Voices' },
];

const IMAGE_LINKS = [
  { href: '/image', label: 'Text to Image' },
  { href: '/image/image-to-image', label: 'Image to Image' },
];

const VOICE_ACTIONS = [
  { href: '/voices/clone', label: 'Clone Voice' },
  { href: '/voices/design', label: 'Design Voice' },
];

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const PRODUCT_AREA_ACCENTS = {
  speech: {
    activeBorder: '#86efac',
    activeBg: '#f0fdf4',
    activeColor: '#166534',
    hoverBorder: '#bbf7d0',
    hoverBg: '#f8fafc',
    shadow: '0 8px 20px rgba(22, 101, 52, 0.08)',
  },
  image: {
    activeBorder: '#93c5fd',
    activeBg: '#eff6ff',
    activeColor: '#1d4ed8',
    hoverBorder: '#bfdbfe',
    hoverBg: '#f8fbff',
    shadow: '0 8px 20px rgba(37, 99, 235, 0.08)',
  },
  music: {
    activeBorder: '#f0abfc',
    activeBg: '#fdf4ff',
    activeColor: '#a21caf',
    hoverBorder: '#f5d0fe',
    hoverBg: '#fff7ff',
    shadow: '0 8px 20px rgba(162, 28, 175, 0.08)',
  },
  library: {
    activeBorder: '#c4b5fd',
    activeBg: '#f5f3ff',
    activeColor: '#6d28d9',
    hoverBorder: '#ddd6fe',
    hoverBg: '#fbfaff',
    shadow: '0 8px 20px rgba(109, 40, 217, 0.08)',
  },
} as const;

function ProductAreaLink({
  href,
  label,
  description,
  isActive,
  accent,
  onNavigate,
}: {
  href: string;
  label: string;
  description: string;
  isActive: boolean;
  accent: keyof typeof PRODUCT_AREA_ACCENTS;
  onNavigate?: () => void;
}) {
  const colors = PRODUCT_AREA_ACCENTS[accent];

  return (
    <Box
      asChild
      display="block"
      borderRadius="0.875rem"
      border="1px solid"
      borderColor={isActive ? colors.activeBorder : '#e5e7eb'}
      bg={isActive ? colors.activeBg : '#ffffff'}
      boxShadow={isActive ? colors.shadow : 'none'}
      color={isActive ? colors.activeColor : '#111827'}
      p="0.75rem"
      textDecoration="none"
      transition="border-color 160ms ease, background-color 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease"
      _hover={{
        borderColor: isActive ? colors.activeBorder : colors.hoverBorder,
        bg: isActive ? colors.activeBg : colors.hoverBg,
        color: colors.activeColor,
        boxShadow: colors.shadow,
        transform: 'translateY(-1px)',
      }}
      _focusVisible={{ outline: '2px solid #0f766e', outlineOffset: '2px' }}
    >
      <Link href={href} onClick={onNavigate}>
        <Box as="span" display="block" fontSize="0.925rem" fontWeight={700} color="inherit">
          {label}
        </Box>
        <Box as="span" display="block" mt="0.125rem" fontSize="0.75rem" color="#64748b">
          {description}
        </Box>
      </Link>
    </Box>
  );
}

function SidebarLink({
  href,
  label,
  isActive,
  onNavigate,
  size = 'md',
  accent = 'speech',
}: {
  href: string;
  label: string;
  isActive: boolean;
  onNavigate?: () => void;
  size?: 'md' | 'sm';
  accent?: 'speech' | 'image' | 'music';
}) {
  const colors = accent === 'image'
    ? { activeColor: '#1d4ed8', activeBg: '#dbeafe', hoverBg: '#eff6ff', focus: '#2563eb' }
    : accent === 'music'
      ? { activeColor: '#a21caf', activeBg: '#fae8ff', hoverBg: '#fdf4ff', focus: '#c026d3' }
      : { activeColor: '#166534', activeBg: '#dcfce7', hoverBg: '#f0fdf4', focus: '#0f766e' };

  return (
    <Box
      asChild
      borderRadius="0.5rem"
      display="block"
      px={size === 'md' ? '0.625rem' : '1rem'}
      py="0.5rem"
      fontSize={size === 'md' ? '0.875rem' : '0.8125rem'}
      fontWeight={isActive ? 700 : 500}
      color={isActive ? colors.activeColor : '#475569'}
      bg={isActive ? colors.activeBg : 'transparent'}
      textDecoration="none"
      transition="background-color 160ms ease, color 160ms ease, transform 160ms ease"
      _hover={{ bg: isActive ? colors.activeBg : colors.hoverBg, color: colors.activeColor, transform: 'translateX(2px)' }}
      _focusVisible={{ outline: `2px solid ${colors.focus}`, outlineOffset: '2px' }}
    >
      <Link href={href} onClick={onNavigate}>
        {label}
      </Link>
    </Box>
  );
}

function AppSidebar({ onNavigate, variant = 'desktop' }: { onNavigate?: () => void; variant?: 'desktop' | 'mobile' }) {
  const pathname = usePathname();
  const isSpeechActive = matchesPath(pathname, SPEECH_MATCH_PATHS);
  const isImageActive = matchesPath(pathname, IMAGE_MATCH_PATHS);
  const isMusicActive = matchesPath(pathname, MUSIC_MATCH_PATHS);
  const isLibraryActive = matchesPath(pathname, LIBRARY_MATCH_PATHS);

  const handleLogout = () => {
    clearAppAccessKey();
    window.location.href = '/login';
  };

  return (
    <aside style={{ width: variant === 'mobile' ? '100%' : '17rem', borderRight: variant === 'desktop' ? '1px solid #d1fae5' : undefined, background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 46%)', padding: '1rem', position: variant === 'desktop' ? 'sticky' : 'relative', top: 0, height: variant === 'desktop' ? '100vh' : '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Box
        asChild
        display="block"
        px="0.25rem"
        pt="0.25rem"
        pb="0.75rem"
        textDecoration="none"
        transition="color 160ms ease"
        _focusVisible={{ outline: '2px solid #0f766e', outlineOffset: '2px' }}
      >
        <Link href="/tts" onClick={onNavigate}>
          <Box fontSize="1rem" fontWeight={800} color="#166534">MiniMax Studio</Box>
          <Box mt="0.125rem" fontSize="0.75rem" color="#64748b">Speech, image, and music generation</Box>
        </Link>
      </Box>

      <nav aria-label="Product areas" style={{ display: 'grid', gap: '0.5rem' }}>
        <div style={{ borderRadius: '0.875rem', border: `1px solid ${isSpeechActive ? '#86efac' : '#e5e7eb'}`, backgroundColor: isSpeechActive ? '#f0fdf4' : '#ffffff', boxShadow: isSpeechActive ? '0 8px 20px rgba(22, 101, 52, 0.08)' : 'none', overflow: 'hidden' }}>
          <ProductAreaLink href="/tts" label="Speech" description="Voice generation suite" isActive={isSpeechActive} accent="speech" onNavigate={onNavigate} />

          <div style={{ display: 'grid', gap: '0.25rem', borderTop: '1px solid #dcfce7', padding: '0.5rem' }}>
            {SPEECH_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <SidebarLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  isActive={isActive}
                  onNavigate={onNavigate}
                />
              );
            })}

            <div style={{ margin: '0.25rem 0.625rem 0', borderTop: '1px solid #e5e7eb' }} />

            {VOICE_ACTIONS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <SidebarLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  isActive={isActive}
                  onNavigate={onNavigate}
                  size="sm"
                />
              );
            })}
          </div>
        </div>

        <div style={{ borderRadius: '0.875rem', border: `1px solid ${isImageActive ? '#93c5fd' : '#e5e7eb'}`, backgroundColor: isImageActive ? '#eff6ff' : '#ffffff', boxShadow: isImageActive ? '0 8px 20px rgba(37, 99, 235, 0.08)' : 'none', overflow: 'hidden' }}>
          <ProductAreaLink href="/image" label="Image" description="Image generation studio" isActive={isImageActive} accent="image" onNavigate={onNavigate} />

          <div style={{ display: 'grid', gap: '0.25rem', borderTop: '1px solid #dbeafe', padding: '0.5rem' }}>
            {IMAGE_LINKS.map((link) => {
              const isActive = pathname === link.href;

              return (
                <SidebarLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  isActive={isActive}
                  onNavigate={onNavigate}
                  accent="image"
                />
              );
            })}
          </div>
        </div>
        <ProductAreaLink href="/music" label="Music" description="Full track generation" isActive={isMusicActive} accent="music" onNavigate={onNavigate} />
        <ProductAreaLink href="/library" label="Library" description="Saved audio, music, and image assets" isActive={isLibraryActive} accent="library" onNavigate={onNavigate} />
      </nav>

      <Box marginTop="auto">
        <Button variant="outline" size="sm" onClick={handleLogout} style={{ width: '100%' }}>
          Sign Out
        </Button>
      </Box>
    </aside>
  );
}

function MobileHeader({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 40, width: '100%', borderBottom: '1px solid #d1fae5', backgroundColor: 'rgba(240, 253, 244, 0.95)', backdropFilter: 'blur(8px)' }}>
      <Box display="flex" h={14} alignItems="center" justifyContent="space-between" px={4}>
        <Button type="button" variant="outline" size="sm" onClick={onToggle} aria-expanded={isOpen} aria-controls="mobile-menu-drawer">
          ☰
        </Button>
        <Link href="/tts" style={{ fontWeight: 800, color: '#166534', textDecoration: 'none' }}>
          MiniMax Studio
        </Link>
        <span style={{ width: '2.25rem' }} aria-hidden="true" />
      </Box>
    </header>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isWideContent = matchesPath(pathname, IMAGE_MATCH_PATHS) || matchesPath(pathname, MUSIC_MATCH_PATHS);

  return (
    <AppKeyGate>
      <Box minH="100vh" backgroundColor="#f8fafc">
        <Box display={{ base: 'block', md: 'none' }}>
          <MobileHeader isOpen={isMobileMenuOpen} onToggle={() => setIsMobileMenuOpen((current) => !current)} />
        </Box>
        {isMobileMenuOpen && (
          <Box display={{ base: 'block', md: 'none' }} position="fixed" inset={0} zIndex={50}>
            <Box position="absolute" inset={0} backgroundColor="rgba(15, 23, 42, 0.45)" onClick={() => setIsMobileMenuOpen(false)} />
            <Box id="mobile-menu-drawer" position="absolute" top={0} left={0} bottom={0} width="min(20rem, calc(100vw - 2rem))" backgroundColor="white" boxShadow="2xl">
              <AppSidebar variant="mobile" onNavigate={() => setIsMobileMenuOpen(false)} />
            </Box>
          </Box>
        )}
        <Box display="flex" minH="100vh">
          <Box display={{ base: 'none', md: 'block' }}>
            <AppSidebar />
          </Box>
          <Box as="main" flex={1} px={{ base: 4, md: 8 }} py={{ base: 6, md: 8 }} width="100%">
            <Box maxW={isWideContent ? 'none' : 'container.xl'} mx="auto" width="100%">
              {children}
            </Box>
          </Box>
        </Box>
      </Box>
    </AppKeyGate>
  );
}
