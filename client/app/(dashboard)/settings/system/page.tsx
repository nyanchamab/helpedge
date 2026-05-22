'use client';

export const dynamic = 'force-dynamic';

import { PlaceholderPage } from '@/components/shared/PlaceholderPage';

export default function SystemSettingsPage() {
  return (
    <PlaceholderPage
      title="System Settings"
      description="Configure system-wide settings and platform behaviour"
      features={[
        'Email server configuration (SMTP/IMAP)',
        'System-wide notification preferences',
        'Authentication & SSO settings',
        'API rate limits and throttling',
        'Audit log retention policies',
        'Maintenance mode controls',
        'Data backup and export settings',
        'Integration webhook management',
      ]}
    />
  );
}
