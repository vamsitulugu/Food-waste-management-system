import { useState } from 'react';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { updateTaskStatus } from '../../api/tasks';
import { PICKUP_TASK_STATUS_LABELS } from '../../types/domain';
import type { PickupTask } from '../../types/domain';
import type { PickupTaskStatus } from '../../types/database';
import { getErrorMessage } from '../../utils/errors';

const NEXT_STATUS: Partial<Record<PickupTaskStatus, { next: PickupTaskStatus; label: string }>> = {
  assigned: { next: 'en_route_pickup', label: 'Start heading to pickup' },
  en_route_pickup: { next: 'picked_up', label: "I've picked up the food" },
  picked_up: { next: 'en_route_delivery', label: 'Start heading to delivery' },
  en_route_delivery: { next: 'delivered', label: "I've delivered the food" },
};

export function TaskStatusStepper({ task, onChange }: { task: PickupTask; onChange: () => void }) {
  const { showToast } = useToast();
  const [updating, setUpdating] = useState(false);

  const step = NEXT_STATUS[task.status];

  async function handleAdvance() {
    if (!step) return;
    setUpdating(true);
    try {
      await updateTaskStatus(task.id, step.next);
      showToast('success', 'Status updated.');
      onChange();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not update status.'));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-ink-300">Current status: {PICKUP_TASK_STATUS_LABELS[task.status]}</p>
      {step && (
        <Button className="mt-3" loading={updating} onClick={handleAdvance}>
          {step.label}
        </Button>
      )}
      {task.status === 'delivered' && (
        <p className="mt-3 text-sm text-ink-500">Waiting for the donor or recipient to confirm receipt.</p>
      )}
    </div>
  );
}
