import { useEffect, useMemo, useState } from 'react';

import { API_BASE_URL, APP_BASE_URL } from '@extension/env';
import { getInitials } from '@extension/shared';
import { useGetWorkspacesQuery } from '@extension/store';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from '@extension/ui';

interface Props {
  onChange?: (workspaceId: string) => void;
}

export const WorkspacesDropdown = ({ onChange }: Props) => {
  const {
    isLoading,
    isError,
    data: workspaces,
    refetch: refetchWorkspaces,
  } = useGetWorkspacesQuery({ limit: 1, take: 10 }, { refetchOnMountOrArgChange: true, refetchOnReconnect: true });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');

  useEffect(() => {
    const defaultWorkspace = workspaces?.items?.find(workspace => workspace.isDefault);

    if (defaultWorkspace?.id) {
      setActiveWorkspaceId(defaultWorkspace.id);
      if (onChange) {
        onChange(defaultWorkspace.id);
      }
    }

    if (!workspaces) {
      /**
       * @todo
       * Workaround. Improve.
       * On Firefox first call is not happening.
       */
      refetchWorkspaces();
    }
  }, [workspaces?.items]);

  const activeWorkspace = useMemo(
    () => workspaces?.items?.find(workspace => workspace.id === activeWorkspaceId),
    [activeWorkspaceId, workspaces?.items],
  );

  /**
   * @todo
   * - use skeleton when loading
   * - hide when error
   * - add search field if more than 10 workspaces
   */

  const handleOnCreateWorkspace = () => {
    const newWindow = window?.open(`${APP_BASE_URL}/workspaces`, '_blank');
    newWindow?.focus();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="h-[35px] gap-x-2 px-[10px] hover:bg-[#EDECE8]">
          <Avatar className="size-[25px] border-[0.5px] border-slate-400">
            <AvatarImage
              src={`${API_BASE_URL}/uploads/workspaces/${activeWorkspace?.avatarId}`}
              crossOrigin="anonymous"
            />
            <AvatarFallback>
              <span className="text-[9px] font-medium">{getInitials(activeWorkspace?.name || '')}</span>
            </AvatarFallback>
          </Avatar>

          {/* <span>{activeWorkspace?.name || defaultWorkspace?.name} </span> */}

          <Icon name="ChevronDownIcon" size={16} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-[250px]">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>

        <DropdownMenuRadioGroup
          value={activeWorkspaceId}
          onValueChange={value => {
            setActiveWorkspaceId(value);

            if (onChange) onChange(value);
          }}>
          {workspaces?.items?.map(workspace => (
            <DropdownMenuRadioItem
              key={workspace.id}
              value={workspace.id}
              className={cn('gap-x-2 capitalize', {
                'text-muted-foreground': activeWorkspaceId !== workspace.id,
              })}>
              <Avatar className="hover:bg-primary h-8 w-8">
                <AvatarImage src={`${API_BASE_URL}/uploads/workspaces/${workspace.avatarId}`} crossOrigin="anonymous" />
                <AvatarFallback>
                  <span className="text-xs font-medium text-[rgba(39,36,29,0.4)]">{getInitials(workspace.name)}</span>
                </AvatarFallback>
              </Avatar>

              <span>{workspace.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-x-2 text-[rgba(39,36,29,0.4)]" onClick={handleOnCreateWorkspace}>
          <div className="flex h-8 w-8 items-center justify-center">
            <Icon name="PlusIcon" className="h-3.5 w-3.5" />
          </div>

          <span>Create Workspace</span>
          {/* <DropdownMenuShortcut>⇧⌘W</DropdownMenuShortcut> */}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
