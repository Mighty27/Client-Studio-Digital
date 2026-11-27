import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="d-flex flex-wrap align-items-center justify-content-between gap-3 pb-3 mb-4 border-bottom border-secondary-subtle">
      <div>
        <h1 className="h4 fw-semibold text-light mb-1">{title}</h1>
        <p className="small text-secondary mb-0">{subtitle}</p>
      </div>
      {actions && (
        <div className="d-flex align-items-center gap-2 flex-wrap">{actions}</div>
      )}
    </header>
  );
}
