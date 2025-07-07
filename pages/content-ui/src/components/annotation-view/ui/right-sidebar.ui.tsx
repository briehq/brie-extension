import { useCallback, useState } from 'react';

import { t } from '@extension/i18n';
import { SlicePriority } from '@extension/shared';
import type { TagType } from '@extension/ui';
import {
  Button,
  cn,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Icon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TagInput,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useForm,
} from '@extension/ui';

import { GenerateDropdown } from '@src/components/dialog-view';

interface RightSidebarProps {
  open?: boolean;
  className?: string;
  canvasHeight: number;
  defaultOpen?: boolean;
  onCreate: (payload: any) => void;
  onOpenChange: (open: boolean) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  open,
  defaultOpen = false,
  onCreate,
  onOpenChange,
  canvasHeight = 500,
  className,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open! : internalOpen;
  const [labels, setLabels] = useState<TagType[]>([]);

  const formMethods = useForm({ mode: 'onChange' });
  const { setValue, handleSubmit, control } = formMethods;

  const toggle = useCallback(() => {
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);

    onOpenChange(next);
  }, [isControlled, isOpen, onOpenChange]);

  return (
    <>
      {!isOpen && (
        <Button
          size="icon"
          variant="secondary"
          aria-label="Open details"
          type="button"
          onClick={toggle}
          className="group absolute right-4 top-[5.2rem] z-10 border border-[#EDECE8] bg-white transition-colors dark:text-white">
          <Icon
            name="PanelRightOpenIcon"
            strokeWidth={1.5}
            size={16}
            className="text-muted-foreground group-hover:text-primary transition-colors"
          />
        </Button>
      )}

      <aside
        className={cn(
          'relative flex h-fit flex-col space-y-2.5 overflow-hidden rounded-lg border border-[#EDECE8] bg-white p-4',
          isOpen ? 'opacity-100' : `pointer-events-none size-0 opacity-0`,
          className,
        )}>
        <div className="flex w-full items-center justify-between">
          <p className="text-primary text-sm font-medium">Details</p>

          <Icon
            size={16}
            strokeWidth={1.5}
            onClick={toggle}
            name="PanelRightCloseIcon"
            className="dark:bg-primary text-muted-foreground hover:text-primary hover:cursor-pointer dark:text-white"
          />
        </div>

        <Form {...formMethods}>
          <form onSubmit={handleSubmit(onCreate)} className="w-full space-y-2">
            <FormField
              control={control}
              rules={{
                maxLength: {
                  message: 'Keep it short and sweet, 10 - 1000 characters max!',
                  value: 1000,
                },
              }}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs">Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Write a description here..." rows={7} {...field} className="resize-none" />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs">Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={SlicePriority.LOW}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.keys(SlicePriority).map(key => (
                        <SelectItem key={key} value={key}>
                          <div
                            className={cn(
                              'hover:text-primary flex w-full items-center gap-2',
                              (field.value || SlicePriority.LOW) !== key ? 'text-muted-foreground' : 'text-primary',
                            )}>
                            <div
                              className={cn('size-2.5 rounded-full', {
                                'bg-[#D32F2F]': key === SlicePriority.HIGHEST,
                                'bg-[#F57C00]': key === SlicePriority.HIGH,
                                'bg-[#FBC02D]': key === SlicePriority.MEDIUM,
                                'bg-[#8BC34A]': key === SlicePriority.LOW,
                              })}
                            />
                            <span>{t(key)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FormMessage />
                </FormItem>
              )}
            />
            {canvasHeight}
            {canvasHeight < 520 ? (
              <FormField
                control={control}
                name="labels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">Labels</FormLabel>
                    <FormControl>
                      <TagInput
                        {...field}
                        maxTags={canvasHeight > 600 ? 6 : 2}
                        showCount={false}
                        truncate={15}
                        textCase="lowercase"
                        placeholder="Insert a label"
                        tags={labels}
                        inputFieldPosition="top"
                        setTags={labels => {
                          setLabels(labels);
                          setValue('labels', labels as [TagType, ...TagType[]]);
                        }}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="mt-6 flex w-full items-center justify-between gap-x-2">
              <div className="flex gap-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" size="icon" variant="ghost" onClick={() => {}}>
                      <Icon name="Paperclip" size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center" sideOffset={14}>
                    {t('attachFile')}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" size="icon" variant="ghost" onClick={() => {}}>
                      <Icon name="Folder" size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center" sideOffset={14}>
                    {t('addFolder')}
                  </TooltipContent>
                </Tooltip>
              </div>

              <GenerateDropdown />
            </div>
          </form>
        </Form>
      </aside>
    </>
  );
};
