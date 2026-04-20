import React from 'react';

export default function LogoIcon({ size = 28 }: { size?: number }) {
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, #00ff80, #00ccff)',
                filter: 'blur(8px)', opacity: 0.6, borderRadius: '8px'
            }} />
            <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'relative', zIndex: 1, display: 'block' }}>
                <defs>
                    <linearGradient id="mlq-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#00ff80" />
                        <stop offset="1" stopColor="#00ccff" />
                    </linearGradient>
                </defs>
                <rect width="32" height="32" rx="8" fill="url(#mlq-grad)" />
                <path d="M10 21V12L16 16.5L22 12V21" stroke="#080d08" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="12" r="2.5" fill="#080d08" />
                <circle cx="16" cy="16.5" r="2.5" fill="#080d08" />
                <circle cx="22" cy="12" r="2.5" fill="#080d08" />
                <circle cx="10" cy="21" r="2" fill="#080d08" />
                <circle cx="22" cy="21" r="2" fill="#080d08" />
            </svg>
        </div>
    );
}
