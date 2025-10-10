import { useState } from 'react';

import {
  Button,
  Icon,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@extension/ui';

export const ExportImage = ({ onExport }: { onExport: (format: string) => void }) => {
  const [selectedFormat, setSelectedFormat] = useState('png');
  const [open, setOpen] = useState(false);

  return (
    <div className="hidden items-center space-x-2 sm:flex">
      <Button
        disabled={false}
        onClick={() => onExport(selectedFormat)}
        className="bg-gradient-overlay flex h-[35px] gap-x-[6px] px-2.5">
        <Icon name="ArrowUpIcon" size={16} />

        <span>Export</span>

        <span className="text-muted-foreground text-xs">
          1x • <span className="uppercase">{selectedFormat}</span>
        </span>
      </Button>

      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="dark:bg-primary size-[35px] dark:text-white"
            aria-label="Export Image Settings">
            <Icon name="Settings2Icon" size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          onOpenAutoFocus={e => e.preventDefault()}
          className="w-[250px]"
          side="top"
          align="end"
          sideOffset={18}>
          <div className="grid gap-3">
            <h4 className="font-medium leading-none">Export Settings</h4>

            <div className="grid gap-3">
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-sm">Image format</p>

                <Tabs
                  value={selectedFormat}
                  onClick={e => e.preventDefault()}
                  onValueChange={value => {
                    setSelectedFormat(value);
                    onChangeFormat(value);
                  }}
                  className="w-full">
                  <TabsList
                    className="w-full"
                    onClick={e => {
                      e.preventDefault();
                      setOpen(false);
                    }}>
                    {['png', 'jpeg'].map(format => (
                      <TabsTrigger key={format} value={format} className="w-full uppercase">
                        {format}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid grid-cols-3 items-center gap-4 rounded-lg border pl-2">
                <Label htmlFor="width" className="text-muted-foreground col-span-2">
                  Output Resolution
                </Label>
                <Input
                  disabled
                  maxLength={4}
                  id="width"
                  defaultValue="100%"
                  className="col-span-1 h-8 border-none px-2 text-center shadow-none"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
