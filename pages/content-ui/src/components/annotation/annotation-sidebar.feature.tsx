import { memo } from 'react';

import { Button, Icon, Tooltip, TooltipContent, TooltipTrigger } from '@extension/ui';

import { navElements } from '@src/constants';

const AnnotationSidebar = ({ activeElement, onActiveElement }: any) => {
  const isActive = (value: string | Array<any>) =>
    (activeElement && activeElement.value === value) ||
    (Array.isArray(value) && value.some(val => val?.value === activeElement?.value));

  const handleOnActiveElement = (item: any) => {
    if (Array.isArray(item.value)) {
      return;
    }
    onActiveElement(item);
  };

  return (
    <div className="dark:bg-secondary inset-x-0 mx-auto mt-8 flex w-fit rounded-xl bg-black shadow-md">
      <div className="sm:p2 flex-column flex items-center space-x-1 p-1 sm:space-x-1.5">
        {navElements.map((item: any, idx: number) =>
          item?.value ? (
            <Tooltip key={item.value + idx}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  disabled={isActive(item.value)}
                  className={`hover:bg-secondary/15 bg-transparent text-white dark:hover:bg-black ${
                    isActive(item.value) ? 'bg-secondary/30 dark:hover:bg-black' : ''
                  }`}
                  variant="secondary"
                  onClick={() => handleOnActiveElement(item)}>
                  <Icon name={item.icon} className="size-3 sm:size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="start" sideOffset={item?.offset || 14}>
                {item.name}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div key={idx} className="h-full w-[1px] bg-slate-700"></div>
          ),
        )}
      </div>
    </div>
  );
};

const arePropsEqual = (prevProps, nextProps) => prevProps.activeElement === nextProps.activeElement;

export default memo(AnnotationSidebar, arePropsEqual);
