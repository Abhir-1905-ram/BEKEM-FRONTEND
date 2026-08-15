import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { BRAND_ACCENT } from '@/lib/brand';
import { Button } from './ui/Button';

interface SuccessScreenProps {
  title: string;
  message: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  accentColor?: string;
}

export function SuccessScreen({
  title,
  message,
  primaryAction,
  secondaryAction,
  accentColor = BRAND_ACCENT,
}: SuccessScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
      >
        <CheckCircle2 className="h-20 w-20 mb-3" style={{ color: accentColor }} />
      </motion.div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 mb-4 max-w-sm">{message}</p>
      <div className="w-full max-w-sm space-y-3">
        <Button variant="accent" size="lg" accentColor={accentColor} onClick={primaryAction.onClick}>
          {primaryAction.label}
        </Button>
        {secondaryAction && (
          <Button variant="secondary" size="lg" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
