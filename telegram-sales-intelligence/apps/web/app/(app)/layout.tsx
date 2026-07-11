import { AppShell } from '../../components/shell';
import { PageEnter } from '../../components/motion';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PageEnter>{children}</PageEnter>
    </AppShell>
  );
}
