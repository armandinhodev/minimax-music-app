"use client";

import { Dialog, Portal } from "@chakra-ui/react";
import { Button } from "@/components/ui/button";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  loading = false,
}: ConfirmationDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={({ open }) => onOpenChange(open)} placement="center">
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.500" />
        <Dialog.Positioner p={4}>
          <Dialog.Content role="alertdialog" maxW="md" borderRadius="xl" boxShadow="xl">
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body color="gray.700">{description}</Dialog.Body>
            <Dialog.Footer gap={2}>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button variant="destructive" onClick={onConfirm} loading={loading}>
                {confirmLabel}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
