import React from 'react';
import { motion } from 'motion/react';
import { MessageCircle, Heart, User, Sparkles, Compass } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'suggestions', label: 'Discover', icon: Compass },
  { id: 'likedyou', label: 'Liked You', icon: Heart },
  { id: 'chat', label: 'AI', icon: Sparkles },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: User },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
    >
      <div
        className="mx-4 mb-3 px-2 py-2 flex items-center gap-1 rounded-2xl"
        style={{
          background: 'var(--sanjog-bg-primary)',
          border: '1px solid var(--sanjog-glass-border-bright)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.03)',
          width: 'calc(100% - 32px)',
          maxWidth: '420px',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl outline-none border-0 cursor-pointer"
              style={{
                background: isActive
                  ? 'var(--sanjog-bg-deep)'
                  : 'transparent',
                minHeight: '52px',
              }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {/* Active background glow */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-bg"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'var(--sanjog-bg-deep)',
                    border: '1px solid rgba(244,63,94,0.10)',
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}

              {/* Icon */}
              <motion.div
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {item.id === 'chat' ? (
                  <Icon
                    className="w-5 h-5"
                    style={{
                      color: isActive ? 'transparent' : 'var(--sanjog-text-secondary)',
                      fill: isActive ? 'url(#nav-grad)' : 'none',
                      stroke: isActive ? 'url(#nav-grad)' : undefined,
                    }}
                  />
                ) : (
                  <Icon
                    className="w-5 h-5"
                    style={{
                      color: isActive ? 'var(--sanjog-rose)' : 'var(--sanjog-text-secondary)',
                    }}
                  />
                )}
              </motion.div>

              {/* Label */}
              <span
                className="text-[10px] font-medium leading-none"
                style={{
                  color: isActive ? 'var(--sanjog-rose)' : 'var(--sanjog-text-muted)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {item.label}
              </span>

              {/* Active dot */}
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  className="nav-active-dot"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
            </motion.button>
          );
        })}

        {/* SVG gradient for sparkles icon */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="nav-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </nav>
  );
}