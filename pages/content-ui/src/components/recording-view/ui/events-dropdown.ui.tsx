import { useMemo, useState } from 'react';

import type { RecordLike } from '@extension/shared';
import { cn, Icon, Popover, PopoverContent, PopoverTrigger } from '@extension/ui';

import { mapRecordsToTimelineEvents } from '@src/utils';

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const EventsDropdown = ({
  events,
  onEventHover,
}: {
  events: RecordLike[];
  onEventHover: (id: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);

  const timelineEvents = useMemo(() => mapRecordsToTimelineEvents(events, { dedupe: true, limit: 10 }), [events]);

  return (
    <div className="hidden items-center space-x-2 sm:flex">
      <Popover
        onOpenChange={isOpen => {
          setOpen(isOpen);

          if (!isOpen) onEventHover(null);
        }}
        open={open}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              'hover:bg-muted flex size-[35px] cursor-pointer items-center justify-center rounded-md transition',
              'text-muted-foreground relative bg-transparent',
              { 'border-[0.5px]': events.length > 0 },
            )}>
            <Icon name="Siren" className="h-4 w-4" />

            {events.length > 0 && (
              <span className="bg-primary text-primary-foreground absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
                {events.length}
              </span>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent
          onOpenAutoFocus={e => e.preventDefault()}
          side="top"
          align="end"
          sideOffset={18}
          className="w-[420px]">
          <div className="grid gap-3">
            <h4 className="font-medium leading-none">Important events</h4>

            <ul className="grid gap-1 text-[10px]">
              {!timelineEvents.length ? (
                <li className="text-muted-foreground">No important events.</li>
              ) : (
                <>
                  {timelineEvents.map(event => (
                    <li
                      key={event.id}
                      className="hover:bg-muted flex items-start gap-2 rounded-lg px-2 py-1"
                      onMouseEnter={() => onEventHover(event.id)}
                      onMouseLeave={() => onEventHover(null)}
                      onFocus={() => onEventHover(event.id)}
                      onBlur={() => onEventHover(null)}>
                      <span className="text-muted-foreground shrink-0 tabular-nums">{formatTime(event.timestamp)}</span>

                      <span className="text-muted-foreground shrink-0">{event.type === 'network' ? 'NET' : 'LOG'}</span>

                      <span
                        className={cn({
                          'text-destructive': event.severity === 'error',
                          'text-amber-600 dark:text-amber-500': event.severity === 'warn',
                        })}>
                        {event.label}
                      </span>
                    </li>
                  ))}

                  <li className="text-muted-foreground px-1 py-1">Create the slice to see all events.</li>
                </>
              )}
            </ul>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
