import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { UserRole, formatProjectLabel, type SiteDto } from '@afios/shared';

export function useNavbarContext() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole | undefined;

  const { data: site } = useQuery({
    queryKey: ['my-site', 'navbar'],
    queryFn: async () => {
      const res = await api.get<{
        data: (SiteDto & { project?: { code: string; name: string } }) | null;
      }>('/sites/my');
      return res.data.data;
    },
    enabled: role === UserRole.SITE_INCHARGE || role === UserRole.STORE_INCHARGE,
    staleTime: 5 * 60 * 1000,
  });

  const projectLabel = site?.project
    ? `${formatProjectLabel(site.project)}${
        site.chainageLabel ? ` · ${site.chainageLabel}` : site.name ? ` · ${site.name}` : ''
      }`
    : null;

  return { projectLabel, role };
}
