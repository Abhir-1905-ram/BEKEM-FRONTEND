/**
 * Future GST portal lookup — UI calls this when auto-fetch is enabled server-side.
 */
import { api } from '@/lib/api';
import type { VendorGstDetailsDto } from '@afios/shared';

export interface GstLookupResult {
  available: boolean;
  name?: string;
  address?: string;
  gstDetails?: VendorGstDetailsDto;
  message?: string;
}

export async function previewVendorGstLookup(gstNumber: string): Promise<GstLookupResult> {
  const res = await api.get<{ data: GstLookupResult }>(
    `/vendors/gst-lookup/preview`,
    { params: { gstNumber } }
  );
  return res.data.data;
}
