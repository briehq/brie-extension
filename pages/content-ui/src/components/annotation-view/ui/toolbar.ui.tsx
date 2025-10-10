import { memo, useCallback } from 'react';

import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Icon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@extension/ui';

import { ColorPalette, ExportImage } from '@src/components/dialog-view';
import { navElements } from '@src/constants';
import type { ActiveElement } from '@src/models';

interface ToolbarProps {
  activeElement: ActiveElement;
  onActiveElement: (element: ActiveElement) => void;
  onExport: (format: string) => void;
}

const Toolbar = ({ activeElement, onActiveElement, onExport }: ToolbarProps) => {
  const isActive = (value: string | Array<any>) =>
    (activeElement && activeElement.value === value) ||
    (Array.isArray(value) && value.some(val => val?.value === activeElement?.value));

  const isDropdownElem = useCallback(
    (item: any) => item.value.some((elem: any) => elem?.value === activeElement?.value),
    [activeElement?.value],
  );

  const handleOnActiveElement = (item: any) => {
    if (Array.isArray(item.value)) {
      return;
    }
    onActiveElement(item);
  };

  return (
    <div className="dark:bg-primary absolutes mx-auto mt-4 flex w-fit gap-4 rounded-2xl border border-[#EDECE8] bg-white p-2 shadow-sm">
      <div className="flex items-center space-x-2">
        {navElements.map((item: any, idx: number) =>
          item?.value ? (
            Array.isArray(item.value) ? (
              <DropdownMenu key={item.value}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    className={cn(
                      'px-6 shadow-none',
                      isActive(item.value) ? 'bg-gradient-overlay !text-white hover:bg-black disabled:opacity-100' : '',
                    )}
                    variant="ghost"
                    //   loading={isUpdating}
                    onClick={() => handleOnActiveElement(item)}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-1">
                          <Icon name={isDropdownElem(item) ? activeElement?.icon : item.icon} className="h-4 w-4" />
                          <Icon name="ChevronDownIcon" size={12} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center" sideOffset={28}>
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" sideOffset={18} className="w-[180px]">
                  {item.value.map((i: any) => (
                    <DropdownMenuCheckboxItem
                      className={cn('px-3', { 'text-muted-foreground': !isActive(i.value) })}
                      key={i.value}
                      checked={isActive(i.value)}
                      onCheckedChange={() => handleOnActiveElement(i)}>
                      <Icon name={i.icon} className="mr-3 h-4 w-4" /> {i.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Tooltip key={item.value + idx}>
                <TooltipTrigger asChild>
                  {item.value === 'color-palette' ? (
                    <ColorPalette
                      isActive={isActive(item.value)}
                      onChangeColor={(color: string) => handleOnActiveElement({ ...item, payload: { color } })}
                    />
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      disabled={isActive(item.value)}
                      className={cn(
                        'shadow-none disabled:cursor-not-allowed dark:hover:bg-black',
                        isActive(item.value)
                          ? 'bg-gradient-overlay text-white disabled:opacity-100 dark:hover:bg-black'
                          : '',
                      )}
                      variant="ghost"
                      onClick={() => handleOnActiveElement(item)}>
                      <Icon name={item.icon} className={item.value === 'blur' ? 'size-5' : 'size-3 sm:size-4'} />
                    </Button>
                  )}
                </TooltipTrigger>
                <TooltipContent side="top" align="center" sideOffset={18}>
                  {item.name}
                </TooltipContent>
              </Tooltip>
            )
          ) : (
            <div key={idx} className="hidden h-[20px] w-[1px] bg-slate-300 sm:flex" />
          ),
        )}
      </div>

      <ExportImage onExport={onExport} />
    </div>
  );
};

const arePropsEqual = (prevProps: ToolbarProps, nextProps: ToolbarProps) =>
  prevProps.activeElement === nextProps.activeElement;

export default memo(Toolbar, arePropsEqual);
