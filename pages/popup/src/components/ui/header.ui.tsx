import { IS_DEV, NAME } from '@extension/env';
import { t } from '@extension/i18n';
import { useUserOrganization } from '@extension/store';
import { Button, Icon } from '@extension/ui';

import { navigateTo } from '@src/utils';

interface HeaderProps {
  onSlicesHistory?: () => void;
  onSettings?: () => void;
}

export const Header = ({ onSlicesHistory, onSettings }: HeaderProps = {}) => {
  const logo = chrome.runtime.getURL('popup/brie-icon-64x64.png');
  const userOrg = useUserOrganization();
  const plan = userOrg.fields?.plan?.name;

  return (
    <header className="flex items-center justify-between">
      <button
        onClick={() => navigateTo('https://go.brie.io/lp?utm_source=extension')}
        className="flex items-center gap-x-2">
        <img src={logo} className="size-8" alt="Brie" />

        {IS_DEV && (
          <h1 className="-ml-1.5 text-lg font-semibold text-[#df8801]">
            {NAME} - {plan}
          </h1>
        )}
      </button>
      <div className="flex items-center">
        <Button
          title={t('joinDiscord')}
          type="button"
          size="icon"
          variant="ghost"
          className="hover:bg-accent size-8"
          onClick={() => navigateTo('https://go.brie.io/discord?utm_source=extension')}>
          <Icon name="DiscordLogoIcon" size={20} className="hover:text-primary text-muted-foreground size-4" />
        </Button>

        <Button
          title={t('viewSourceCode')}
          type="button"
          size="icon"
          variant="ghost"
          className="hover:bg-accent size-8"
          onClick={() => navigateTo('https://go.brie.io/github?utm_source=extension')}>
          <Icon name="GitHubLogoIcon" size={20} className="hover:text-primary text-muted-foreground size-4" />
        </Button>

        <div className="bg-border/60 mx-2 h-[20px] w-[1px]" />

        {onSlicesHistory && (
          <Button
            title={t('sliceHistoryTitle')}
            type="button"
            size="icon"
            variant="ghost"
            className="hover:bg-accent size-8"
            onClick={onSlicesHistory}>
            <Icon name="History" size={20} className="hover:text-primary text-muted-foreground size-4" />
          </Button>
        )}

        {onSettings && (
          <Button
            title={t('settings')}
            type="button"
            size="icon"
            variant="ghost"
            className="hover:bg-accent size-8"
            onClick={onSettings}>
            <Icon name="Settings" size={20} className="hover:text-primary text-muted-foreground size-4" />
          </Button>
        )}

        <Button
          title="Help Center"
          type="button"
          size="icon"
          variant="ghost"
          className="hover:bg-accent size-8"
          onClick={() => navigateTo('https://brie.io/help?utm_source=extension')}>
          <Icon
            name="CircleHelp"
            size={20}
            className="hover:text-primary text-muted-foreground size-4"
            strokeWidth={1.5}
          />
        </Button>

        <Button
          title={t('visitHomepage')}
          type="button"
          size="icon"
          variant="ghost"
          className="hover:bg-accent size-8"
          onClick={() => navigateTo('https://go.brie.io/lp?utm_source=extension')}>
          <Icon name="House" size={20} className="hover:text-primary text-muted-foreground size-4" strokeWidth={1.5} />
        </Button>
      </div>
    </header>
  );
};
