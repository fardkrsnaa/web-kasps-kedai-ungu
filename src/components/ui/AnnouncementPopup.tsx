import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MegaphoneIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Announcement {
  enabled: boolean;
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'update' | 'maintenance';
}

interface ConfigData {
  announcement: Announcement;
}

const typeStyles: Record<Announcement['type'], { border: string; bg: string; iconBg: string; iconColor: string }> = {
  info: {
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    iconBg: 'bg-blue-100 dark:bg-blue-900/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    border: 'border-amber-200 dark:border-amber-800',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    iconBg: 'bg-amber-100 dark:bg-amber-900/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  update: {
    border: 'border-purple-200 dark:border-purple-800',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    iconBg: 'bg-purple-100 dark:bg-purple-900/60',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  maintenance: {
    border: 'border-red-200 dark:border-red-800',
    bg: 'bg-red-50 dark:bg-red-950/40',
    iconBg: 'bg-red-100 dark:bg-red-900/60',
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

const HIDE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

export default function AnnouncementPopup() {
  const [show, setShow] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    fetch('/config.json?t=' + Date.now())
      .then((res) => res.json())
      .then((data: ConfigData) => {
        const ann = data?.announcement;
        if (!ann || !ann.enabled || !ann.id) return;

        // Check if user dismissed this specific announcement ID
        const dismissed = localStorage.getItem('announcement_dismissed');
        const dismissedId = localStorage.getItem('announcement_dismissed_id');
        const dismissedAt = localStorage.getItem('announcement_dismissed_at');

        if (dismissed === 'true' && dismissedId === ann.id && dismissedAt) {
          const elapsed = Date.now() - Number(dismissedAt);
          if (elapsed < HIDE_DURATION_MS) {
            // Still within 12-hour hide window
            return;
          }
          // 12 hours passed, reset dismiss so it shows again
          localStorage.removeItem('announcement_dismissed');
          localStorage.removeItem('announcement_dismissed_id');
          localStorage.removeItem('announcement_dismissed_at');
        }

        setAnnouncement(ann);
        setShow(true);
      })
      .catch(() => {
        // Config fetch failed silently — no announcement shown
      });
  }, []);

  const handleDismiss = (hideAllDay: boolean) => {
    if (hideAllDay) {
      localStorage.setItem('announcement_dismissed', 'true');
      localStorage.setItem('announcement_dismissed_id', announcement?.id || '');
      localStorage.setItem('announcement_dismissed_at', String(Date.now()));
    }
    setShow(false);
  };

  if (!announcement) return null;

  const style = typeStyles[announcement.type];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => handleDismiss(false)}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border ${style.border} overflow-hidden`}
          >
            {/* Header accent bar */}
            <div className={`h-1.5 ${style.bg}`} />

            {/* Close button */}
            <button
              onClick={() => handleDismiss(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="p-6">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center mb-4`}>
                <MegaphoneIcon className={`w-6 h-6 ${style.iconColor}`} />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 pr-8">
                {announcement.title}
              </h3>

              {/* Message */}
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                {announcement.message}
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex flex-col gap-2">
              <button
                onClick={() => handleDismiss(true)}
                className="w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-colors bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Tidak ditampilkan lagi (12 jam)
              </button>
              <button
                onClick={() => handleDismiss(false)}
                className={`w-full px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${
                  announcement.type === 'warning' || announcement.type === 'maintenance'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                Oke, Mengerti
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
