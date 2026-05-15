import { Button } from '@/components/ui/button';
import Modal from '@/components/modal.component';
import type { ModalState } from '@/components/modal.component';
import type React from 'react';

export type ConfirmModalProps<T> = {
    /** The modal state returned by `useModal<T>()` */
    state: ModalState<T>;
    /** Modal dialog title */
    title?: string;
    /**
     * Message body. Can be a static string/node, or a function that receives
     * the current modal data and returns a React node.
     */
    description?: React.ReactNode | ((data: T | undefined) => React.ReactNode);
    /** Label for the confirm button (default: "Confirm") */
    confirmLabel?: string;
    /** Label for the cancel button (default: "Cancel") */
    cancelLabel?: string;
    /** Whether the confirm action is in-flight */
    isLoading?: boolean;
    /** Called with the current modal data when the user clicks Confirm */
    onConfirm: (data: T) => void;
};

export default function ConfirmModal<T>({
    state,
    title = 'Are you sure?',
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isLoading = false,
    onConfirm,
}: ConfirmModalProps<T>): React.ReactNode {
    const resolvedDescription =
        typeof description === 'function' ? description(state.data) : description;

    return (
        <Modal controller={state} title={title} size="sm" closable={!isLoading}>
            <div className="space-y-4">
                {resolvedDescription && (
                    <div className="text-sm text-muted-foreground">{resolvedDescription}</div>
                )}
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={state.closeFn}
                        disabled={isLoading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={isLoading || state.data === undefined}
                        onClick={() => state.data !== undefined && onConfirm(state.data)}
                    >
                        {isLoading ? `${confirmLabel}…` : confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
