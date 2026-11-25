import { useEffect, useState } from 'react';
import { fetchPrimaryImageUrls } from '../api/donations';

/** Signed primary-photo URLs for a list of donation ids. Never throws — cards just show a placeholder. */
export function useDonationImages(donationIds: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = donationIds.join(',');

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetchPrimaryImageUrls(key.split(','))
      .then((u) => !cancelled && setUrls(u))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key]);

  return urls;
}
