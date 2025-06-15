import clsx from 'clsx';
import { MicIcon, SparklesIcon, TypeIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useLocation, useParams } from 'react-router-dom';

import { MicrophoneSettings } from '@/components/smart/microphone-settings';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useRecordVoice } from '@/hooks';
import { get, set } from '@/services';
import { useImproveIssueDescriptionMutation } from '@/store/ai';
import { isMobile } from '@/utils';

export const AddDescription = ({
  isOpen,
  onOpen,
  room,
}: {
  isOpen: boolean;
  onOpen: (open: boolean) => void;
  room: string;
}) => {
  const { id: projectId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const spaceId = searchParams.get('spaceId');
  const issue = get('issue');
  const [improveIssueDescription, { isLoading: isImproveLoading }] = useImproveIssueDescriptionMutation();

  const [requestCount, setRequestCount] = useState(0);
  const [showRecord, setShowRecord] = useState(false);

  const {
    startRecording,
    stopRecording,
    transcription: { text, isLoading: isTextLoading, isError: isTextError },
    recording,
    recordedTime,
    error,
  } = useRecordVoice(showRecord);

  const formRef = useRef();
  const form = useForm({
    mode: 'onSubmit',
    defaultValues: { description: issue?.description || '' },
  });

  const showDescriptionField = useMemo(() => {
    if (!isMobile) {
      return true;
    }

    return !showRecord;
  }, [showRecord]);

  useEffect(() => {
    if (isTextLoading || isTextError) {
      return;
    }

    const { description } = form.getValues();

    form.setValue('description', `${description} ${text}`.trim());
  }, [text]);

  const onImproveDescription = async () => {
    if (requestCount >= 5) {
      toast.error("You've reached your AI usage limit. Upgrade to Enterprise to get more AI credits.");
      return;
    }

    const { description } = form.getValues();

    const prompt = `Improve or add the description and recommendations using "${description}" found in "${room}" room? Please respond with a unique description and recommendations you haven't used before. If there are no details provided, respond with: Your request lacks details about the issue in "${room}" making it hard to provide tailored recommendations. Please share specifics, such as findings or areas of concern.`;
    try {
      const { data } = await improveIssueDescription({ prompt });

      form.setValue('description', data.choices[0].message.content as any);
    } catch (e) {
      console.log('Error:', e);
    } finally {
      setRequestCount(prev => prev + 1);
    }
  };

  const onSubmit = async ({ description }: { description: string }) => {
    if (!projectId || !spaceId) {
      toast.error('Project, Room or Issue is not provided!');
      return;
    }

    set('issue', { description });

    toast.success('Issue description added successfully.');

    onOpen(false);
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={open => {
        if (!open) {
          setShowRecord(false);
        }

        onOpen(open);
      }}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className="p-0">
        <div className="bottom-5 w-full">
          <Separator className="mt-auto" />
          <div className="p-4">
            <Form {...form}>
              <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-8">
                <div className="grid gap-4">
                  {showDescriptionField && (
                    <FormField
                      disabled={isImproveLoading || isTextLoading}
                      control={form.control}
                      rules={{
                        required: 'Please insert issue description.',
                        maxLength: {
                          message: 'Keep it short and sweet, 10 - 1000 characters max!',
                          value: 1000,
                        },
                      }}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          {/* <FormLabel className="capitalize">
                          {field.name}
                        </FormLabel> */}

                          <FormControl>
                            <Textarea
                              className="p-4"
                              placeholder="Type to add issue description"
                              rows={4}
                              style={{
                                maxHeight: '300px',
                                overflowY: 'auto',
                                resize: 'none',
                              }}
                              {...field}
                              ref={textarea => {
                                if (textarea) {
                                  textarea.style.height = '0px';
                                  textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`; // Dynamically set height up to 300px
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription>This is issue public display description.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="relative mt-4 w-full sm:absolute sm:bottom-4 sm:mt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="hover:bg-slate-50 dark:hover:text-black"
                              disabled={isImproveLoading || isTextLoading}
                              onClick={() => setShowRecord(false)}>
                              <TypeIcon className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Text</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="hover:bg-slate-50 dark:hover:text-black"
                              disabled={isImproveLoading || isTextLoading}
                              onClick={() => setShowRecord(prev => !prev)}>
                              <MicIcon className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Voice to Notes</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              className="bg-blue-600 text-white hover:bg-blue-800"
                              variant="secondary"
                              disabled={isImproveLoading || isTextLoading}
                              loading={isImproveLoading}
                              onClick={onImproveDescription}>
                              {!isImproveLoading && <SparklesIcon className="size-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>AI-powered Issue Description</TooltipContent>
                        </Tooltip>
                      </div>
                      <Button type="submit" className="sm:mr-8" disabled={isImproveLoading || isTextLoading}>
                        Submit
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
