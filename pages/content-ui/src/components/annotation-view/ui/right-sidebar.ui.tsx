import { useCallback, useEffect, useRef, useState } from 'react';

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
  Controller,
} from '@extension/ui';

import { AddToSpace, GenerateDropdown } from '@src/components/dialog-view';
import { useElementSize, useTypewriter } from '@src/hooks';

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
  const descRef = useRef<HTMLTextAreaElement | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const typedSuggestion = useTypewriter(suggestion ?? '', {
    enabled: !!suggestion,
    speed: 20,
  });

  const { ref: detailsViewRef, height: detailsViewHeight } = useElementSize<HTMLDivElement>();
  const formMethods = useForm({ mode: 'onChange' });
  const { setValue, handleSubmit, control } = formMethods;

  const suggestionDone = suggestion != null && typedSuggestion.length === suggestion.length;

  useEffect(() => {
    const syncHeight = () => {
      if (descRef.current && suggestionRef.current) {
        suggestionRef.current.style.maxHeight = descRef.current.clientHeight + 'px';
      }
    };

    syncHeight();

    descRef.current?.addEventListener('input', syncHeight);
    window.addEventListener('resize', syncHeight);

    return () => {
      descRef.current?.removeEventListener('input', syncHeight);
      window.removeEventListener('resize', syncHeight);
    };
  }, []);

  useEffect(() => {
    if (suggestionRef.current) {
      suggestionRef.current.scrollTop = suggestionRef.current.scrollHeight;
    }
  }, [typedSuggestion]);

  const toggle = useCallback(() => {
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);

    onOpenChange(next);
  }, [isControlled, isOpen, onOpenChange]);

  const acceptSuggestion = useCallback(
    (fieldOnChange: (v: string) => void) => {
      if (!suggestion) return;
      fieldOnChange(suggestion);
      setSuggestion(null);

      requestAnimationFrame(() => descRef.current?.focus());
    },
    [suggestion],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'Tab'].includes(e.key) && suggestion) {
        e.preventDefault();
        setValue('description', suggestion);
        setSuggestion(null);

        requestAnimationFrame(() => descRef.current?.focus());
      }
    };
    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [suggestion]);

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
              name="description"
              rules={{
                maxLength: {
                  message: 'Keep it short and sweet, 10 - 1000 characters max!',
                  value: 1000,
                },
              }}
              render={({ field }) => {
                const showSuggestion = !!(suggestion && !field.value);

                return (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">Description</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Textarea
                          {...field}
                          ref={node => {
                            descRef.current = node;
                            if (typeof field.ref === 'function') field.ref(node);
                            else (field as any).ref = node;
                          }}
                          placeholder={!suggestion?.length ? 'Write a description here...' : ''}
                          rows={7}
                          className="resize-none overflow-y-auto"
                          onWheelCapture={e => e.stopPropagation()}
                          onKeyDown={e => {
                            if (!field.value && suggestion && ['ArrowRight', 'Tab'].includes(e.key)) {
                              e.preventDefault();
                              acceptSuggestion(field.onChange);
                            }
                          }}
                          onChange={e => {
                            if (suggestion && e.target.value.length > 0) setSuggestion(null);
                            field.onChange(e);
                          }}
                        />

                        <div
                          tabIndex={-1}
                          aria-hidden="true"
                          ref={suggestionRef}
                          onClick={() => descRef.current?.focus()}
                          onWheelCapture={e => {
                            if (showSuggestion) e.stopPropagation();
                          }}
                          onMouseDown={e => {
                            if (showSuggestion) {
                              e.preventDefault();
                              descRef.current?.focus();
                            }
                          }}
                          className={cn(
                            'text-muted-foreground pointer-events-auto absolute inset-0 select-none overflow-y-auto whitespace-pre-wrap break-words px-3 py-2 text-sm leading-[inherit] caret-transparent',
                            showSuggestion ? 'pointer-events-auto' : 'pointer-events-none',
                          )}>
                          {typedSuggestion}

                          {suggestion && !field.value && (
                            <>
                              {suggestionDone ? (
                                <kbd className="ml-1 rounded border px-1 py-0.5 text-[10px] opacity-70">Tab</kbd>
                              ) : (
                                <span className="ml-1 animate-pulse opacity-70">▍</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
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

                <Controller
                  name="spaceId"
                  control={control}
                  render={({ field }) => (
                    <FormItem>
                      <AddToSpace workspaceId={workspaceId} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
              </div>

              <GenerateDropdown
                onGenerate={text => {
                  setSuggestion(text);
                  requestAnimationFrame(() => descRef.current?.focus());
                }}
              />
            </div>
          </form>
        </Form>
      </aside>
    </>
  );
};
