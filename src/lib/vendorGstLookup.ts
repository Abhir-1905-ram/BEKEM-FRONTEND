/**
 * GST portal lookup — calls backend GSP provider (sandbox.co.in when configured).
 */
import { api } from '@/lib/api';
import type { VendorGstDetailsDto } from '@afios/shared';

export interface GstLookupResult {
  available: boolean;
  name?: string;
  address?: string;
  panNumber?: string;
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
