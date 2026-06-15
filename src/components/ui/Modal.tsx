import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  size = 'md',
}: ModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          {/* Modal card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-[#111827] rounded-2xl shadow-2xl dark:shadow-2xl dark:shadow-black/50 border border-gray-200/80 dark:border-white/[0.08] max-h-[90vh] overflow-y-auto`}
          >
            {/* Header */}
            <div className="flex items-start gap-4 p-6 border-b border-gray-200/80 dark:border-white/[0.08]">
              {icon && (
                <div className="flex-shrink-0 p-2.5 rounded-2xl bg-primary-50 dark:bg-primary-950/50">
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {title}
                </h2>
                {description && (
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {/* Body */}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}