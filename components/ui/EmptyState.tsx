import { HTMLAttributes, ReactNode } from 'react';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, action, className = '', ...props }: EmptyStateProps) {
  return (
    <div className={['ui-empty-state', className].filter(Boolean).join(' ')} {...props}>
      <div className="ui-empty-state__body">
        <h2 className="ui-empty-state__title">{title}</h2>
        {description ? <div className="ui-empty-state__description">{description}</div> : null}
      </div>
      {action ? <div className="ui-empty-state__action">{action}</div> : null}
    </div>
  );
}
