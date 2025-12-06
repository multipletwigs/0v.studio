'use client';

import { useState } from 'react';
import { Clock } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { UIGenerationHistoryModal } from './ui-generation-history-modal';

export function UIGenerationHistoryButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="lg"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 shadow-lg rounded-full w-14 h-14 p-0"
      >
        <Clock className="w-6 h-6" weight="fill" />
      </Button>
      <UIGenerationHistoryModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

