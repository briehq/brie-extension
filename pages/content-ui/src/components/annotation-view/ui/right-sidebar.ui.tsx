import { useCallback, useState } from 'react';

import { t } from '@extension/i18n';
import { SlicePriority } from '@extension/shared';
import { useGetSpacesQuery } from '@extension/store';
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
  Controller,
} from '@extension/ui';

import { AddToSpace, GenerateDropdown } from '@src/components/dialog-view';
import { useElementSize } from '@src/hooks';

interface RightSidebarProps {
  open?: boolean;
  workspaceId: string;
  className?: string;
  canvasHeight: number;
  defaultOpen?: boolean;
  onCreate: (payload: any) => void;
  onOpenChange: (open: boolean) => void;
}

const DETAILS_VIEW_PADDING = 32;

export const RightSidebar: React.FC<RightSidebarProps> = ({
  open,
  defaultOpen = false,
  onCreate,
  onOpenChange,
  canvasHeight = 500,
  className,
  workspaceId,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open! : internalOpen;
  const [labels, setLabels] = useState<TagType[]>([]);

  const { ref: detailsViewRef, height: detailsViewHeight } = useElementSize<HTMLDivElement>();
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
        ref={detailsViewRef}
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
          <form onSubmit={handleSubmit(onCreate)} className="w-full space-y-2" id="details-form">
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
              defaultValue={SlicePriority.LOW}
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

            {canvasHeight > detailsViewHeight + DETAILS_VIEW_PADDING ? (
              <FormField
                control={control}
                name="labels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">Labels</FormLabel>
                    <FormControl>
                      <TagInput
                        {...field}
                        maxTags={detailsViewHeight > 550 ? 6 : 2}
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
                <Controller
                  name="attachments"
                  control={control}
                  defaultValue={undefined as unknown as FileList}
                  render={({ field: { onChange, value, ref } }) => {
                    const count = value?.length ?? 0;

                    return (
                      <div className="relative">
                        <input
                          id="file-input"
                          type="file"
                          multiple
                          ref={ref}
                          onChange={e => onChange(e.target.files as FileList)}
                          className="sr-only"
                        />

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <label
                              htmlFor="file-input"
                              className={cn(
                                'hover:bg-muted flex size-[35px] cursor-pointer items-center justify-center rounded-md transition',
                                'text-muted-foreground text-primary relative bg-transparent dark:text-white',
                                { 'border-[0.5px]': count > 0 },
                              )}>
                              <Icon name="Paperclip" size={16} />

                              {count > 0 && (
                                <span className="bg-primary absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium text-white">
                                  {count}
                                </span>
                              )}
                            </label>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center" sideOffset={14}>
                            {t('attachFile')}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  }}
                />

                <AddToSpace workspaceId={workspaceId} onChange={value => {}} />
              </div>

              <GenerateDropdown />
            </div>
          </form>
        </Form>
      </aside>
    </>
  );
};
