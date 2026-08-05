import { useState } from 'react';

import { t } from '@extension/i18n';
import { useStorage, validateCustomRedactionPattern } from '@extension/shared';
import { MAX_CUSTOM_REDACTION_PATTERNS, domainSkipListStorage, redactionPatternsStorage } from '@extension/storage';
import { Button, Icon, Input, Separator } from '@extension/ui';

export const SettingsContent = ({ onBack }: { onBack: () => void }) => {
  const domains = useStorage(domainSkipListStorage);
  const customPatterns = useStorage(redactionPatternsStorage);
  const [newDomain, setNewDomain] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [patternError, setPatternError] = useState('');

  const handleAddDomain = async () => {
    const trimmed = newDomain.trim();
    if (!trimmed) return;

    await domainSkipListStorage.addDomain(trimmed);
    setNewDomain('');
  };

  const handleRemoveDomain = async (domain: string) => {
    await domainSkipListStorage.removeDomain(domain);
  };

  const handleAddPattern = async () => {
    const trimmed = newPattern.trim();
    const validation = validateCustomRedactionPattern(trimmed);

    if (!validation.valid) {
      setPatternError(t('invalidRedactionPattern'));
      return;
    }

    await redactionPatternsStorage.addPattern(trimmed);
    setNewPattern('');
    setPatternError('');
  };

  const handleRemovePattern = async (pattern: string) => {
    await redactionPatternsStorage.removePattern(pattern);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddDomain();
    }
  };

  const handlePatternKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddPattern();
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <Icon name="ArrowLeftIcon" className="size-5" />
        </Button>
        <h2 className="flex items-center text-base font-semibold">{t('settings')}</h2>
      </div>

      <Separator className="inset-x-0 h-px bg-gray-900/5 dark:bg-gray-800" />

      <div className="mt-3">
        <h3 className="text-sm font-medium">{t('domainSkipList')}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t('domainSkipListDescription')}</p>

        <div className="mt-3 flex gap-x-2">
          <Input
            type="text"
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('domainPlaceholder')}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0"
            onClick={handleAddDomain}
            disabled={!newDomain.trim()}>
            <Icon name="Plus" className="mr-1 size-3.5" />
            {t('addDomain')}
          </Button>
        </div>

        <div className="mt-3 space-y-1">
          {domains.length === 0 && <p className="text-xs text-muted-foreground">{t('noDomains')}</p>}

          {domains.map(domain => (
            <div
              key={domain}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
              <span className="max-w-[240px] truncate text-xs text-slate-700 dark:text-slate-300">{domain}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-red-500"
                onClick={() => handleRemoveDomain(domain)}>
                <Icon name="X" className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-4 h-px bg-gray-900/5 dark:bg-gray-800" />

      <div>
        <h3 className="text-sm font-medium">{t('customRedactionPatterns')}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t('customRedactionPatternsDescription')}</p>

        <div className="mt-3 flex gap-x-2">
          <Input
            type="text"
            value={newPattern}
            onChange={e => {
              setNewPattern(e.target.value);
              setPatternError('');
            }}
            onKeyDown={handlePatternKeyDown}
            placeholder={t('redactionPatternPlaceholder')}
            aria-invalid={Boolean(patternError)}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0"
            onClick={handleAddPattern}
            disabled={!newPattern.trim() || customPatterns.length >= MAX_CUSTOM_REDACTION_PATTERNS}>
            <Icon name="Plus" className="mr-1 size-3.5" />
            {t('addDomain')}
          </Button>
        </div>

        {patternError && <p className="mt-1 text-xs text-red-500">{patternError}</p>}

        <div className="mt-3 space-y-1">
          {customPatterns.length === 0 && (
            <p className="text-xs text-muted-foreground">{t('noCustomRedactionPatterns')}</p>
          )}

          {customPatterns.map(pattern => (
            <div
              key={pattern}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
              <code className="max-w-[240px] truncate text-xs text-slate-700 dark:text-slate-300">{pattern}</code>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-red-500"
                onClick={() => handleRemovePattern(pattern)}>
                <Icon name="X" className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
