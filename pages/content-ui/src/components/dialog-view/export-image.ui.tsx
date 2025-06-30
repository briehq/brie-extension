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

export const ExportImage = () => {
  return (
    <div className="flex items-center space-x-2">
      <Button disabled={false} onClick={() => {}} className="bg-gradient-overlay flex h-[35px] gap-x-[6px] px-2.5">
        <Icon name="ArrowUpIcon" size={16} />

        <span>Export</span>

        <span className="text-muted-foreground">1x • PNG</span>
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            onClick={() => {}}
            className="dark:bg-primary size-[35px] dark:text-white"
            aria-label="Export Image Settings">
            <Icon name="Settings2Icon" size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px]" side="top" align="end" sideOffset={18}>
          <div className="grid gap-3">
            <h4 className="font-medium leading-none">Export Settings</h4>

            <div className="grid gap-3">
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-sm">Image format</p>

                <Tabs defaultValue="png" onChange={v => console.log('tab change', v)} className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger defaultChecked className="w-full" value="png">
                      PNG
                    </TabsTrigger>
                    <TabsTrigger className="w-full" value="jpeg">
                      JPEG
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid grid-cols-3 items-center gap-4 rounded-lg border pl-2">
                <Label htmlFor="width" className="text-muted-foreground col-span-2">
                  Output Resolution
                </Label>
                <Input
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
