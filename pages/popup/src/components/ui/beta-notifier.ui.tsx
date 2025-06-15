import { t } from '@extension/i18n';
import { useUser } from '@extension/store';

export const BetaNotifier = () => {
  const user = useUser();
  const uuid = user.fields?.id;

  return (
    <div className="mt-4 text-center text-[10px] font-normal text-slate-600 dark:text-white">
      {t('inBeta')}{' '}
      <a
        href="https://go.brie.io/discord?utm_source=extension"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-slate-900 dark:hover:text-[#df8801]">
        {t('reportBugsOrRequestFeatures')}
      </a>
      {uuid && (
        <>
          <br />

          <span>UUID: {uuid}</span>
        </>
      )}
    </div>
  );
};
