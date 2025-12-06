'use client';

import { useState } from 'react';
import { FilePlus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { InsertShapesModal } from './insert-shapes-modal';

export function InsertShapesButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsModalOpen(true)}
        title="Insert Shapes from JSON"
      >
        <FilePlus className="w-4 h-4" weight="fill" />
        Insert Shapes
      </Button>
      <InsertShapesModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

