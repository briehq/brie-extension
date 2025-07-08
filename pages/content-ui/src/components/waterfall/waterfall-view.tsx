import { useMemo, useState } from 'react';

import { ScrollArea, Card, CardHeader, CardTitle, CardContent, Icon, Button, Separator } from '@extension/ui';

import type { NetworkRecord } from '../../types/network';

interface WaterfallViewProps {
  records: NetworkRecord[];
}

const WaterfallView: React.FC<WaterfallViewProps> = ({ records }) => {
  const [sortBy, setSortBy] = useState<'timestamp' | 'duration' | 'size'>('timestamp');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Filter and process network records
  const networkRecords = useMemo(() => {
    const netRecords = records
      .filter(record => record.recordType === 'network' && record.url)
      .map(record => ({
        ...record,
        id:
          ((record as Record<string, unknown>).requestId as string) ||
          `${record.url}-${record.timestamp || Date.now()}`,
        size: (record.requestSize || 0) + (record.responseSize || 0),
      })) as (NetworkRecord & { id: string; size: number })[];

    // Debug: Log a few records to see their structure
    if (netRecords.length > 0) {
      console.log('Sample network records:', netRecords.slice(0, 3));
    }

    // Sort records
    return netRecords.sort((a, b) => {
      switch (sortBy) {
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'size':
          return b.size - a.size;
        case 'timestamp':
        default:
          return (a.timestamp || 0) - (b.timestamp || 0);
      }
    });
  }, [records, sortBy]);

  // Calculate timing bounds for waterfall chart
  const timingBounds = useMemo(() => {
    if (networkRecords.length === 0) return { min: 0, max: 0 };

    const timestamps = networkRecords
      .map(record => record.timing?.requestStart || record.timestamp || 0)
      .filter(t => t > 0);

    const endTimes = networkRecords
      .map(record => {
        const start = record.timing?.requestStart || record.timestamp || 0;
        const duration = record.duration || record.timing?.duration || 0;
        return start + duration;
      })
      .filter(t => t > 0);

    return {
      min: Math.min(...timestamps),
      max: Math.max(...endTimes),
    };
  }, [networkRecords]);

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDuration = (ms: number) => {
    if (!ms) return '0ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (status: number) => {
    if (!status || status === 0) return 'bg-gray-400 dark:bg-gray-500'; // Unknown/missing status
    if (status >= 200 && status < 300) return 'bg-emerald-500 dark:bg-emerald-400';
    if (status >= 300 && status < 400) return 'bg-amber-500 dark:bg-amber-400';
    if (status >= 400 && status < 500) return 'bg-orange-500 dark:bg-orange-400';
    if (status >= 500) return 'bg-red-500 dark:bg-red-400';
    return 'bg-slate-500 dark:bg-slate-400';
  };

  const getTimingBarStyle = (record: NetworkRecord & { id: string; size: number }) => {
    const totalRange = timingBounds.max - timingBounds.min;
    if (totalRange === 0) return { left: '0%', width: '20%' }; // Show a small default bar

    const startTime = record.timing?.requestStart || record.timestamp || 0;
    const duration = record.duration || record.timing?.duration || 50; // Minimum 50ms for visibility

    const leftPercent = ((startTime - timingBounds.min) / totalRange) * 100;
    const widthPercent = Math.max((duration / totalRange) * 100, 2); // Minimum 2% width for visibility

    return {
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.min(100 - leftPercent, widthPercent)}%`,
    };
  };

  if (networkRecords.length === 0) {
    return (
      <Card className="dark:border-slate-700 dark:bg-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-slate-200">
            <Icon name="BarChartIcon" className="h-5 w-5" />
            Network Waterfall
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-8 text-center dark:text-slate-400">No network requests captured</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full dark:border-slate-700 dark:bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 dark:text-slate-200">
            <Icon name="BarChartIcon" className="h-5 w-5" />
            Network Waterfall ({networkRecords.length} requests)
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'timestamp' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('timestamp')}>
              Time
            </Button>
            <Button
              variant={sortBy === 'duration' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('duration')}>
              Duration
            </Button>
            <Button variant={sortBy === 'size' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('size')}>
              Size
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-border/50 bg-muted/20 border-b p-4 dark:border-slate-700/50 dark:bg-slate-900/30">
          <div className="text-muted-foreground grid grid-cols-12 gap-2 text-xs font-medium dark:text-slate-400">
            <div className="col-span-4">Request</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Time</div>
            <div className="col-span-2">Waterfall</div>
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {networkRecords.map(record => (
            <div key={record.id} className="border-border/50 border-b">
              <div
                className="hover:bg-muted/50 grid cursor-pointer grid-cols-12 items-center gap-2 p-3 transition-colors dark:hover:bg-slate-800/50"
                onClick={() => setShowDetails(showDetails === record.id ? null : record.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowDetails(showDetails === record.id ? null : record.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={showDetails === record.id}
                aria-label={`Toggle details for ${record.method} ${record.url}`}>
                {/* Request URL and Method */}
                <div className="col-span-4 min-w-0">
                  <div className="truncate text-sm font-medium dark:text-slate-200" title={record.url}>
                    {record.method} {record.url ? new URL(record.url).pathname : 'Unknown'}
                  </div>
                  <div className="text-muted-foreground truncate text-xs dark:text-slate-400" title={record.url}>
                    {record.url ? new URL(record.url).host : 'Unknown'}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(record.status || 0)}`} />
                    <span className="text-sm dark:text-slate-300">{record.status || '—'}</span>
                  </div>
                </div>

                {/* Size */}
                <div className="col-span-2">
                  <div className="text-sm dark:text-slate-300">{formatSize(record.size)}</div>
                  {(record.requestSize || record.responseSize) && (
                    <div className="text-muted-foreground text-xs dark:text-slate-400">
                      ↑{formatSize(record.requestSize || 0)} ↓{formatSize(record.responseSize || 0)}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div className="col-span-2">
                  <div className="text-sm dark:text-slate-300">{formatDuration(record.duration || 0)}</div>
                </div>

                {/* Waterfall Bar */}
                <div className="col-span-2">
                  <div className="bg-muted/50 relative h-6 rounded border dark:border-slate-700 dark:bg-slate-800/50">
                    <div
                      className={`absolute h-full rounded ${getStatusColor(record.status || 0)} opacity-90`}
                      style={getTimingBarStyle(record)}
                      title={`Duration: ${formatDuration(record.duration || 0)} | Status: ${record.status || 'Unknown'}`}
                    />
                    {/* Show a minimal bar even if no timing data */}
                    {!record.duration && !record.timing?.duration && (
                      <div className="absolute left-0 h-full w-1 rounded bg-slate-400 opacity-50 dark:bg-slate-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {showDetails === record.id && (
                <div className="bg-muted/10 px-3 pb-3 dark:bg-slate-900/20">
                  <Separator className="mb-3 dark:bg-slate-700" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="text-foreground mb-2 font-medium dark:text-slate-200">Request Details</h4>
                      <div className="space-y-1">
                        <div>
                          <span className="text-muted-foreground dark:text-slate-400">Method:</span>{' '}
                          <span className="dark:text-slate-300">{record.method}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground dark:text-slate-400">URL:</span>{' '}
                          <span className="dark:text-slate-300">{record.url}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground dark:text-slate-400">Status:</span>{' '}
                          <span className="dark:text-slate-300">{record.status}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground dark:text-slate-400">Source:</span>{' '}
                          <span className="dark:text-slate-300">{record.source}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-foreground mb-2 font-medium dark:text-slate-200">Timing & Size</h4>
                      <div className="space-y-1">
                        <div>
                          <span className="text-muted-foreground dark:text-slate-400">Duration:</span>{' '}
                          <span className="dark:text-slate-300">{formatDuration(record.duration || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground dark:text-slate-400">Request Size:</span>{' '}
                          <span className="dark:text-slate-300">{formatSize(record.requestSize || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground dark:text-slate-400">Response Size:</span>{' '}
                          <span className="dark:text-slate-300">{formatSize(record.responseSize || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground dark:text-slate-400">Total Size:</span>{' '}
                          <span className="dark:text-slate-300">{formatSize(record.size)}</span>
                        </div>
                        {record.timing && (
                          <>
                            <div>
                              <span className="text-muted-foreground dark:text-slate-400">Start:</span>{' '}
                              <span className="dark:text-slate-300">
                                {record.timing.requestStart
                                  ? new Date(record.timing.requestStart).toLocaleTimeString()
                                  : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground dark:text-slate-400">End:</span>{' '}
                              <span className="dark:text-slate-300">
                                {record.timing.requestEnd
                                  ? new Date(record.timing.requestEnd).toLocaleTimeString()
                                  : 'N/A'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default WaterfallView;
