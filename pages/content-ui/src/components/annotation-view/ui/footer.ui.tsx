import { Button, cn, Icon } from '@extension/ui';

interface FooterProps {
  className?: string;
  tool?: string;
  zoom?: number;
  file?: string;
  onZoomChange?: (newZoom: number) => void;
}

export const Footer: React.FC<FooterProps> = ({ className, tool, zoom, file, onZoomChange }) => {
  const incZoom = () => onZoomChange?.((zoom ?? 100) + 10);
  const decZoom = () => onZoomChange?.((zoom ?? 100) - 10);

  return (
    <footer className={cn('rounded-b-[18px] border-t border-[#EDECE8] bg-white text-xs', className)}>
      <div className="flex items-center gap-x-4 px-6 py-1.5">
        {tool && (
          <div className="flex items-center gap-x-1">
            <span className="text-muted-foreground">Tool:</span>
            <span className="text-primary">{tool}</span>
          </div>
        )}

        <div className="flex items-center gap-x-1">
          <span className="text-muted-foreground">Zoom:</span>
          <div className="flex items-center gap-x-1">
            {/* <Button
              size="icon"
              variant="ghost"
              onClick={decZoom}
              className="dark:bg-primary size-4 rounded-sm dark:text-white"
              aria-label="Decrease Zoom">
              <Icon name="ChevronDownIcon" size={10} />
            </Button> */}

            <span className="text-primary">{zoom}%</span>

            {/* <Button
              size="icon"
              variant="ghost"
              onClick={incZoom}
              className="dark:bg-primary size-4 rounded-sm dark:text-white"
              aria-label="Increase Zoom">
              <Icon name="ChevronUpIcon" size={10} />
            </Button> */}
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-x-1">
            <span className="text-muted-foreground">File:</span>
            <span className="text-primary max-w-[10rem] truncate">{file}</span>
          </div>
        )}
      </div>
    </footer>
  );
};
