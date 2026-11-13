import { ScreenShell } from './ScreenShell';

export function MessageScreen({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <ScreenShell title={title}>
      <p>{body}</p>
      <button type="button" onClick={onAction}>
        {action}
      </button>
    </ScreenShell>
  );
}
