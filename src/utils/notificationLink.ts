import type { AppNotification } from '../types/domain';

export interface NotificationTarget {
  to: string;
  label: string;
}

/**
 * Where a notification should take the user when clicked.
 * Returns null when there is nothing sensible to open (e.g. the related
 * donation was deleted) — the caller then just marks it as read.
 */
export function getNotificationTarget(n: AppNotification): NotificationTarget | null {
  const donation = n.relatedDonationId ? `/donations/${n.relatedDonationId}` : null;

  switch (n.type) {
    case 'chat_message':
      if (n.relatedClaimId) return { to: `/chats/${n.relatedClaimId}`, label: 'Open chat' };
      return donation ? { to: donation, label: 'Open donation' } : { to: '/chats', label: 'Open messages' };

    case 'claim_received':
      return donation ? { to: donation, label: 'Review request' } : { to: '/my-donations', label: 'My donations' };

    case 'claim_accepted':
      return donation ? { to: donation, label: 'View pickup details' } : { to: '/my-claims', label: 'My requests' };

    case 'recipient_nearby':
      return donation ? { to: `${donation}#live-tracking`, label: 'Open live tracking' } : null;

    case 'claim_rejected':
      return donation ? { to: donation, label: 'View donation' } : { to: '/my-claims', label: 'My requests' };

    case 'task_assigned':
    case 'task_delivered':
    case 'donation_completed':
    case 'donation_cancelled':
    case 'donation_expired':
      return donation ? { to: donation, label: 'View donation' } : null;

    case 'donation_rejected':
      return donation ? { to: donation, label: 'View donation' } : { to: '/my-donations', label: 'My donations' };

    case 'org_invited':
      return { to: '/organizations', label: 'View organizations' };

    default:
      // Unknown/future types: still go somewhere useful if we know the donation.
      return donation ? { to: donation, label: 'Open' } : null;
  }
}
