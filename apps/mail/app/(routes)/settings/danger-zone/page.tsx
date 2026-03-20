import { SettingsCard } from '@/components/settings/settings-card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { m } from '@/paraglide/messages';

export default function DangerPage() {
  return (
    <div className="grid gap-6">
      <SettingsCard
        title={m['pages.settings.dangerZone.title']()}
        description={m['pages.settings.dangerZone.description']()}
      >
        <div className="border-destructive/50 bg-destructive/10 mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span>Self-service deletion is disabled. Use `bun run nizzy delete-user` instead.</span>
        </div>
        <Button variant="outline" disabled>
          {m['pages.settings.dangerZone.deleteAccount']()}
        </Button>
      </SettingsCard>
    </div>
  );
}
