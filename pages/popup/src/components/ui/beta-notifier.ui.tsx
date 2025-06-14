import { t } from '@extension/i18n';
import { useStorage } from '@extension/shared';
import { userUUIDStorage } from '@extension/storage';

export const BetaNotifier = () => {
  const uuid = useStorage(userUUIDStorage);

  return (
    <div className="mt-4 text-center text-[10px] font-normal text-slate-600">
      {t('inBeta')}{' '}
      <a
        href="https://go.brie.io/discord?utm_source=extension"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-slate-900">
        {t('reportBugsOrRequestFeatures')}
      </a>
      <br />
      <span>UUID: {uuid}</span>
    </div>
  );
};
