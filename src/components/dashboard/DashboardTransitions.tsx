import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

// ============ Page Transition Wrapper ============
// Container morph: outer container stays, inner content cross-fades with slide

interface DashboardPageTransitionProps {
  children: ReactNode;
  routeKey: string;
}

export function DashboardPageTransition({ children, routeKey }: DashboardPageTransitionProps) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 16, scale: 0.995 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.3,
            ease: [0.22, 1, 0.36, 1],
            staggerChildren: 0.05,
            delayChildren: 0.06,
          },
        }}
        exit={{
          opacity: 0,
          y: -8,
          scale: 0.995,
          transition: {
            duration: 0.15,
            ease: [0.4, 0, 1, 1],
          },
        }}
        className="will-change-[transform,opacity]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ============ Staggered Container ============

const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.03,
    },
  },
};

const staggerItemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export function StaggerContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ============ Module Skeleton ============

interface ModuleSkeletonProps {
  variant?: 'cards' | 'list' | 'grid' | 'detail';
  count?: number;
}

export function ModuleSkeleton({ variant = 'cards', count = 4 }: ModuleSkeletonProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {variant === 'cards' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <Skeleton className="h-32 rounded-2xl" />
            </motion.div>
          ))}
        </div>
      )}

      {variant === 'list' && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          {Array.from({ length: count }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <Skeleton className="h-16 w-full rounded-xl" />
            </motion.div>
          ))}
        </div>
      )}

      {variant === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Skeleton className="h-48 rounded-2xl" />
            </motion.div>
          ))}
        </div>
      )}

      {variant === 'detail' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div
            className="lg:col-span-2 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.25 }}
          >
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </motion.div>
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18, duration: 0.25 }}
          >
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// ============ Layout Card with animation ============

export function LayoutCard({ children, layoutId, className = '' }: {
  children: ReactNode;
  layoutId?: string;
  className?: string;
}) {
  return (
    <motion.div
      layout
      layoutId={layoutId}
      transition={{
        layout: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============ Reduced Motion Hook ============

export function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
