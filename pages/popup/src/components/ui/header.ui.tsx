import { Button, Icon } from '@extension/ui';
import { navigateTo } from '@src/utils';

export const Header = () => {
  const logo = chrome.runtime.getURL('popup/brie-icon-64x64.png');

  return (
    <header className="mb-4 flex items-center justify-between">
      <button
        onClick={() => navigateTo('https://go.briehq.com/lp?utm_source=extension')}
        className="flex items-center gap-x-2">
        <img src={logo} className="size-10" alt="Brie" />

        <h1 className="text-xl font-semibold text-[#df8801] -ml-1.5">brie</h1>
      </button>
      <div className="flex items-center">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="hover:bg-slate-50 dark:hover:text-black"
          onClick={() => navigateTo('https://go.briehq.com/github?utm_source=extension')}>
          <Icon name="GitHubLogoIcon" size={20} className="size-4" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="hover:bg-slate-50 dark:hover:text-black"
          onClick={() => navigateTo('https://go.briehq.com/discord?utm_source=extension')}>
          <Icon name="DiscordLogoIcon" size={20} className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="hover:bg-slate-50 dark:hover:text-black"
          onClick={() => navigateTo('https://go.briehq.com/lp?utm_source=extension')}>
          <Icon name="House" size={20} className="size-4" strokeWidth={1.5} />
        </Button>
      </div>
    </header>
  );
};
