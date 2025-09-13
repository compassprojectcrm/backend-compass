/** src/utils/email-bloom-filter.ts */
import { ScalableBloomFilter } from "bloom-filters";

/**
 * Scalable Bloom Filter
 * - Initial capacity: 10k items
 * - Error rate: 1% (per filter layer)
 * 
 * If more than 10k emails are inserted, a new filter layer is created automatically.
 */
const bloom = new ScalableBloomFilter(10_000, 0.01);

export function addEmailsToFilter(emails: string[]) {
    for (const email of emails) {
        bloom.add(email);
    }
}

export function mayExist(email: string) {
    return bloom.has(email);
}