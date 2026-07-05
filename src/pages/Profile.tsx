import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { LogOut, Bell, Globe, Users } from 'lucide-react';
import { BRAND_ACCENT } from '@/lib/brand';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_LABELS, UserRole, type NotificationPrefsDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useSignOut } from '@/lib/signOut';
import { DelegationPanel } from '@/components/DelegationPanel';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/I18nContext';
import { APP_LOCALES, type AppLocale } from '@afios/shared';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const { signOut, signingOut } = useSignOut();
  const { t, locale, setLocale } = useI18n();
  const [prefs, setPrefs] = useState<NotificationPrefsDto>(
    user?.notificationPrefs ?? { inApp: true, emailDigest: false, sms: false }
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      locale?: AppLocale;
      notificationPrefs?: NotificationPrefsDto;
    }) => {
      const res = await api.patch<{ user: typeof user }>('/auth/me/preferences', payload);
      return res.data.user!;
    },
    onSuccess: (updated) => {
      updateUser(updated);
      toast.success(t('profile.saved'));
    },
  });

  if (!user) return null;

  const role = user.role as UserRole;
  const accent = user.avatarColor || BRAND_ACCENT;
  const canViewAudit = [UserRole.COORDINATOR, UserRole.CHAIRMAN].includes(role);
  const canManageUsers = !!user.isSystemAdmin;

  const savePrefs = (next: NotificationPrefsDto) => {
    setPrefs(next);
    saveMutation.mutate({ notificationPrefs: next });
  };

  const changeLocale = (next: AppLocale) => {
    setLocale(next);
    saveMutation.mutate({ locale: next });
  };

  return (
    <div className="page-container max-w-lg">
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <div className="panel p-6 flex items-center gap-4 mb-6">
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
          style={{ backgroundColor: accent }}
        >
          {user.name.charAt(0)}
        </div>
        <div>
          <p className="font-bold text-ink text-lg">{user.name}</p>
          <p className="text-sm text-ink-secondary">{user.email}</p>
          <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-bekem-accent-soft text-bekem-accent">
            {ROLE_LABELS[role]}
          </span>
        </div>
      </div>

      <section className="panel p-5 mb-6">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4" />
          {t('profile.notifications')}
        </h2>
        <div className="space-y-3">
          {(
            [
              { key: 'inApp' as const, label: t('profile.inApp'), desc: t('profile.inAppDesc') },
              { key: 'emailDigest' as const, label: t('profile.emailDigest'), desc: t('profile.emailDigestDesc') },
              { key: 'sms' as const, label: t('profile.sms'), desc: t('profile.smsDesc') },
            ] as const
          ).map((item) => (
            <label
              key={item.key}
              className="flex items-start gap-3 cursor-pointer rounded-xl p-3 hover:bg-surface-muted transition-colors"
            >
              <input
                type="checkbox"
                checked={!!prefs[item.key]}
                onChange={(e) => savePrefs({ ...prefs, [item.key]: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-surface-border text-bekem-accent focus:ring-bekem-accent"
              />
              <span>
                <span className="text-sm font-medium text-ink block">{item.label}</span>
                <span className="text-xs text-ink-muted">{item.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <DelegationPanel />

      <section className="panel p-5 mb-6">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2 mb-4">
          <Globe className="h-4 w-4" />
          {t('profile.language')}
        </h2>
        <p className="text-xs text-ink-muted mb-3">{t('profile.languageDesc')}</p>
        <label className="sr-only" htmlFor="locale-select">
          {t('profile.selectLanguage')}
        </label>
        <select
          id="locale-select"
          value={locale}
          onChange={(e) => changeLocale(e.target.value as AppLocale)}
          className="w-full h-11 rounded-lg border border-surface-border bg-white px-3 text-sm font-medium text-ink focus:ring-2 focus:ring-bekem-accent focus:outline-none"
        >
          {APP_LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.native} — {l.english}
            </option>
          ))}
        </select>
      </section>

      {canManageUsers && (
        <Button variant="secondary" className="mb-3 w-full" onClick={() => navigate('/admin/users')}>
          <Users className="h-4 w-4" />
          {t('profile.manageUsers')}
        </Button>
      )}

      {canViewAudit && (
        <Button variant="secondary" className="mb-3 w-full" onClick={() => navigate('/audit-logs')}>
          {t('profile.viewAudit')}
        </Button>
      )}

      <Button variant="secondary" className="w-full" disabled={signingOut} onClick={() => signOut()}>
        <LogOut className="h-4 w-4" />
        {signingOut ? t('nav.signingOut') : t('nav.signOut')}
      </Button>
    </div>
  );
}
