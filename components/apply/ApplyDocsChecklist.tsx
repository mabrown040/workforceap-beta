'use client';

import { useTranslations } from 'next-intl';
import { APPLICATION_DOCS_REQUIRED } from '@/lib/apply/applicationDocsRequired';

export default function ApplyDocsChecklist() {
  const t = useTranslations('apply');

  return (
    <details
      className="apply-docs-checklist apply-foundational-support"
      open
      role="region"
      aria-labelledby="apply-docs-checklist-heading"
    >
      <summary className="apply-docs-checklist__summary">
        <span id="apply-docs-checklist-heading" className="apply-foundational-support__title apply-docs-checklist__title">
          {t('docsChecklistTitle')}
        </span>
      </summary>
      <div className="apply-docs-checklist__body">
        <p className="apply-docs-checklist__lead">{t('docsChecklistLead')}</p>
        <ul className="apply-foundational-support__list">
          {APPLICATION_DOCS_REQUIRED.map((doc) => (
            <li key={doc.id}>{t(doc.messageKey)}</li>
          ))}
        </ul>
        <p className="apply-docs-checklist__note">{t('docsChecklistNote')}</p>
      </div>
    </details>
  );
}
