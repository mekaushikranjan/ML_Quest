'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import LogoIcon from '@/components/ui/LogoIcon';

const navStyle = {
  position: 'sticky' as const,
  top: 0,
  zIndex: 50,
  width: '100%',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(8,13,8,0.92)',
  backdropFilter: 'blur(12px)',
};

const innerStyle = {
  maxWidth: 1280,
  margin: '0 auto',
  height: 72,
  display: 'flex',
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  paddingLeft: 40,
  paddingRight: 40,
  paddingTop: 0,
  paddingBottom: 0,
  position: 'relative' as const,
};

const logoLinkStyle = {
  display: 'flex',
  alignItems: 'center' as const,
  gap: 12,
  color: '#e2e8f0',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 19,
  letterSpacing: '-0.02em',
  lineHeight: 1.2,
};

const navLinksStyle = {
  position: 'absolute' as const,
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center' as const,
  gap: 28,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '0.01em',
};

const linkStyle = {
  color: '#94a3b8',
  textDecoration: 'none',
  transition: 'color 0.2s',
  padding: '6px 0',
};

const authWrapStyle = {
  display: 'flex',
  alignItems: 'center' as const,
  gap: 12,
};

const btnLoginStyle = {
  minWidth: 96,
  height: 40,
  padding: '0 20px',
  display: 'inline-flex',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'transparent',
  color: '#94a3b8',
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '0.01em',
  textDecoration: 'none',
  cursor: 'pointer' as const,
  transition: 'all 0.2s',
};

const btnSignUpStyle = {
  minWidth: 96,
  height: 40,
  padding: '0 20px',
  display: 'inline-flex',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderRadius: 10,
  border: 'none',
  background: '#00ff80',
  color: '#080d08',
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '0.01em',
  textDecoration: 'none',
  cursor: 'pointer' as const,
  transition: 'all 0.2s',
};

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { _hasHydrated } = useAuthStore();

  return (
    <nav style={navStyle}>
      <div style={innerStyle}>
        {/* Logo - with left margin so it sits in from the edge */}
        <Link
          href="/"
          style={logoLinkStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <LogoIcon size={28} />
          <span>ML Quest</span>
        </Link>

        {/* Nav Links */}
        <div style={navLinksStyle}>
          <Link
            href="/problems"
            style={linkStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            Problems
          </Link>
          <Link
            href="/ml-practice"
            style={{ ...linkStyle, color: '#a78bfa' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#c4b5fd';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#a78bfa';
            }}
          >
            ML Practice
          </Link>
          {isAuthenticated && (
            <Link
              href="/dashboard"
              style={linkStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              Dashboard
            </Link>
          )}
          {isAuthenticated && user && (user.role === 'admin' || user.role === 'editor') && (
            <>
              <Link
                href="/admin/problems/new"
                style={linkStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                Add Problem
              </Link>
              <Link
                href="/admin"
                style={linkStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                Admin Hub
              </Link>
            </>
          )}
        </div>

        {/* Auth */}
        <div style={authWrapStyle}>
          {/* Show nothing while store is loading from localStorage to prevent flash */}
          {!_hasHydrated ? (
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 rounded-full p-0"
                  style={{
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#e2e8f0',
                  }}
                >
                  <Avatar className="h-9 w-9 border-0">
                    <AvatarFallback
                      style={{
                        background: 'linear-gradient(135deg, #00ff80, #00cc66)',
                        color: '#080d08',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                style={{
                  minWidth: 220,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#0d120d',
                  padding: '6px 0',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0', lineHeight: 1.3 }}>{user.username}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.3 }}>{user.email}</div>
                </div>
                <DropdownMenuItem
                  onClick={logout}
                  style={{ color: '#f87171', cursor: 'pointer' }}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                href="/auth/login"
                style={btnLoginStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#e2e8f0';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                style={btnSignUpStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#00e672';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,128,0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#00ff80';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
