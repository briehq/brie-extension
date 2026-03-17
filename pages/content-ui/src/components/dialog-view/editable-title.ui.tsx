import { useEffect, useRef, useState } from 'react';

import { t } from '@extension/i18n';
import { cn, Input, Tooltip, TooltipContent, TooltipTrigger } from '@extension/ui';

interface EditableTitleProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export const EditableTitle = ({ value, onChange, className }: EditableTitleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value || 'Untitled report');
  const inputRef = useRef<HTMLInputElement>(null);
  const isCancellingRef = useRef(false);

  useEffect(() => {
    if (!isEditing) setDraft(value || 'Untitled report');
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    if (isCancellingRef.current) {
      isCancellingRef.current = false;
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    if (draft.trim() && draft !== value) onChange(draft.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      isCancellingRef.current = true;
      setDraft(value);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        'hidden rounded-lg border border-transparent px-[10px] transition lg:inline',
        isEditing ? 'border-blue-500 px-1' : 'hover:border-muted hover:border',
        className,
      )}>
      {isEditing ? (
        <Input
          ref={inputRef}
          value={draft}
          type="text"
          maxLength={50}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onKeyUp={e => e.stopPropagation()}
          className="text-primary h-8 w-auto border-none bg-transparent px-1 py-0 font-normal not-italic leading-normal shadow-none focus-visible:ring-0"
        />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-8 items-center">
              <button
                onClick={() => setIsEditing(true)}
                className="text-foreground min-w-[152px] cursor-text select-text text-left text-sm font-normal not-italic leading-normal">
                {value}
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            {t('rename')}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
