import { useState } from 'react';

import { t } from '@extension/i18n';
import { Button, cn, Popover, PopoverContent, PopoverTrigger, ToggleGroup, ToggleGroupItem } from '@extension/ui';

const HEX_COLORS: Record<string, string> = {
  '#ef4444': 'bg-red-500',
  '#22c55e': 'bg-green-500',
  '#eab308': 'bg-yellow-500',
  '#3b82f6': 'bg-blue-500',
  '#a855f7': 'bg-purple-500',
  '#f97316': 'bg-orange-500',
};
export const ColorPalette = ({
  isActive,
  onChangeColor,
}: {
  isActive: boolean;
  onChangeColor: (hex: string) => void;
}) => {
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          disabled={open && isActive}
          className="hidden shadow-none disabled:cursor-not-allowed sm:flex dark:hover:bg-black"
          variant="ghost">
          <div className={`group size-4 rounded-full ${HEX_COLORS[selectedColor]}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={18}>
        <div className="grid gap-3">
          <h4 className="font-medium leading-none">{t('colorPalette')}</h4>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-sm">{t('selectColor')}</p>

              <ToggleGroup
                className="justify-start"
                type="single"
                defaultValue={selectedColor}
                onValueChange={value => {
                  setSelectedColor(value);
                  onChangeColor(value);
                  setOpen(false);
                }}>
                {['#ef4444', '#22c55e', '#eab308', '#3b82f6', '#a855f7', '#f97316'].map(color => (
                  <ToggleGroupItem
                    key={color}
                    value={color}
                    aria-label={`${t('toggle')} ${color}`}
                    disabled={color === selectedColor}>
                    <div
                      className={cn('group size-4 rounded-full', {
                        'bg-red-500': color === '#ef4444',
                        'bg-green-500': color === '#22c55e',
                        'bg-yellow-500': color === '#eab308',
                        'bg-blue-500': color === '#3b82f6',
                        'bg-purple-500': color === '#a855f7',
                        'bg-orange-500': color === '#f97316',
                      })}
                    />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
