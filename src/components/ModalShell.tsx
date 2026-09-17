import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
  ariaLabel?: string;
}

const EASE_OUT = [0.16, 1, 0.3, 1];
const EASE_SPRING = [0.34, 1.56, 0.64, 1];

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  children,
  maxWidthClass = 'max-w-md',
  ariaLabel = 'Modal dialog',
}) => {
  const shouldReduceMotion = useReducedMotion();

  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: EASE_OUT,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: EASE_OUT,
        delay: 0.04,
      },
    },
  };

  const cardVariants = {
    hidden: shouldReduceMotion
      ? { opacity: 0 }
      : isMobile
      ? { translateY: '100%', opacity: 1 }
      : { scale: 0.97, translateY: 16, opacity: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      translateY: 0,
      transition: {
        duration: 0.32,
        ease: shouldReduceMotion ? EASE_OUT : isMobile ? EASE_OUT : EASE_SPRING,
        delay: 0.04,
      },
    },
    exit: {
      opacity: shouldReduceMotion ? 0 : isMobile ? 1 : 0,
      scale: shouldReduceMotion ? 1 : isMobile ? 1 : 0.97,
      translateY: shouldReduceMotion ? 0 : isMobile ? '100%' : 12,
      transition: {
        duration: 0.2,
        ease: EASE_OUT,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-[#171512]/45 backdrop-blur-md max-sm:items-end max-sm:p-0 select-none overflow-y-auto"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={backdropVariants}
          onClick={onClose}
        >
          <motion.div
            className={`w-full ${maxWidthClass} bg-[#FFF9EF] border border-[#171512]/15 rounded-2xl overflow-hidden shadow-2xl shadow-[#171512]/15 max-sm:rounded-b-none max-sm:max-w-full my-auto max-sm:my-0 flex flex-col max-h-[90dvh] max-sm:max-h-[92dvh] text-[#171512]`}
            variants={cardVariants}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
