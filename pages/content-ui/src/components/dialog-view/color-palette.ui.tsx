import { useState } from 'react';

import {
  Button,
  cn,
  Icon,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from '@extension/ui';

export const ColorPalette = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => {
  const [selectedColor, setSelectedColor] = useState('red');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          disabled={isActive}
          className={cn(
            'shadow-none disabled:cursor-not-allowed dark:hover:bg-black',
            isActive ? 'bg-gradient-overlay text-white disabled:opacity-100 dark:hover:bg-black' : '',
          )}
          variant="ghost"
          onClick={onClick}>
          <div className={`group size-4 rounded-full bg-${selectedColor}-500`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={18}>
        <div className="grid gap-3">
          <h4 className="font-medium leading-none">Color Palette</h4>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-sm">Select color</p>

              <ToggleGroup
                className="justify-start"
                type="single"
                defaultValue={selectedColor}
                onValueChange={value => {
                  console.log('color', value);
                  setSelectedColor(value);
                }}>
                {['red', 'green', 'yellow', 'blue', 'purple', 'orange'].map(color => (
                  <ToggleGroupItem value={color} aria-label={`Toggle ${color}`}>
                    <div
                      className={cn('group size-4 rounded-full', {
                        'bg-red-500': color === 'red',
                        'bg-green-500': color === 'green',
                        'bg-yellow-500': color === 'yellow',
                        'bg-blue-500': color === 'blue',
                        'bg-purple-500': color === 'purple',
                        'bg-orange-500': color === 'orange',
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
