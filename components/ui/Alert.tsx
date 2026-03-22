import { HTMLAttributes, ReactNode } from 'react';

type AlertTone = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: AlertTone;
  title?: ReactNode;
  action?: ReactNode;
}

export function Alert({
  tone = 'info',
  title,
  action,
  className = '',
  children,
  ...props
}: AlertProps) {
  return (
    <div
      className={['ui-alert', `ui-alert--${tone}`, className].filter(Boolean).join(' ')}
      {...props}
    >
      <div className="ui-alert__body">
        {title ? <div className="ui-alert__title">{title}</div> : null}
        {children ? <div className="ui-alert__content">{children}</div> : null}
      </div>
      {action ? <div className="ui-alert__action">{action}</div> : null}
    </div>
  );
}
