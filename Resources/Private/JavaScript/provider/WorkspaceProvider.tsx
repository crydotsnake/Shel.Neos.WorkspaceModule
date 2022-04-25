import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { SortBy } from '../components/WorkspaceTable';
import { useNotify } from './NotifyProvider';

type WorkspaceProviderProps = {
    children: ReactNode;
    userWorkspace: WorkspaceName;
    workspaceList: WorkspaceList;
    baseWorkspaceOptions: Record<WorkspaceName, WorkspaceTitle>;
    ownerOptions: Record<UserName, UserLabel>;
    endpoints: WorkspaceEndpoints;
    csrfToken: string;
    userCanManageInternalWorkspaces: boolean;
};

type WorkspaceValues = {
    userWorkspace: WorkspaceName;
    workspaces: WorkspaceList;
    setWorkspaces: (workspaces: WorkspaceList) => void;
    loadChangesCounts: () => void;
    deleteWorkspace: (workspaceName: WorkspaceName) => void;
    updateWorkspace: (formData: FormData) => Promise<void>;
    showWorkspace: (workspaceName: WorkspaceName) => void;
    sorting: SortBy;
    setSorting: (sortBy: SortBy) => void;
    selectedWorkspaceForDeletion: WorkspaceName | null;
    setSelectedWorkspaceForDeletion: (workspaceName: WorkspaceName | null) => void;
    selectedWorkspaceForEdit: WorkspaceName | null;
    setSelectedWorkspaceForEdit: (workspaceName: WorkspaceName | null) => void;
    csrfToken: string;
    baseWorkspaceOptions: Record<WorkspaceName, WorkspaceTitle>;
    ownerOptions: Record<UserName, UserLabel>;
    userCanManageInternalWorkspaces: boolean;
};

const WorkspaceContext = createContext(null);
export const useWorkspaces = (): WorkspaceValues => useContext(WorkspaceContext);

export const WorkspaceProvider = ({
    userWorkspace,
    endpoints,
    workspaceList,
    ownerOptions,
    baseWorkspaceOptions,
    csrfToken,
    children,
    userCanManageInternalWorkspaces,
}: WorkspaceProviderProps) => {
    const [workspaces, setWorkspaces] = React.useState(workspaceList);
    const [sorting, setSorting] = useState<SortBy>(SortBy.lastModified);
    const [selectedWorkspaceForDeletion, setSelectedWorkspaceForDeletion] = useState<WorkspaceName | null>(null);
    const [selectedWorkspaceForEdit, setSelectedWorkspaceForEdit] = useState<WorkspaceName | null>(null);
    const notify = useNotify();

    const handleFlashMessages = useCallback(
        (messages: FlashMessage[]) => {
            messages.forEach(({ title, message, severity }) => {
                switch (severity) {
                    case 'ok':
                        notify.ok(title || message);
                        break;
                    case 'warning':
                        notify.warning(title, message);
                        break;
                    case 'error':
                        notify.error(title, message);
                        break;
                    default:
                        notify.info(title || message);
                }
            });
        },
        [notify]
    );

    const loadChangesCounts = useCallback(() => {
        if (!workspaces) return;
        fetch(endpoints.getChanges, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            },
        })
            .then((response) => response.json())
            .then((data) => {
                const { changesByWorkspace }: { changesByWorkspace: Record<WorkspaceName, ChangesCounts> } = data;
                const updatedWorkspaces = Object.keys(workspaces).reduce<WorkspaceList>(
                    (carry: WorkspaceList, workspaceName) => {
                        const changesCounts = changesByWorkspace[workspaceName];
                        if (changesCounts) {
                            carry[workspaceName] = { ...workspaces[workspaceName], changesCounts };
                        } else {
                            carry[workspaceName] = workspaces[workspaceName];
                        }
                        return carry;
                    },
                    {} as WorkspaceList
                );
                setWorkspaces(updatedWorkspaces);
            })
            .catch((error) => {
                notify.error('Failed to load changes for workspaces', error.message);
                console.error('Failed to load changes for workspaces', error);
            });
    }, [endpoints]);

    const prepareWorkspaceActionUrl = useCallback((endpoint: string, workspaceName: WorkspaceName) => {
        return endpoint.replace('---workspace---', workspaceName);
    }, []);

    const deleteWorkspace = useCallback(
        async (workspaceName: string): Promise<void> => {
            return fetch(prepareWorkspaceActionUrl(endpoints.deleteWorkspace, workspaceName), {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify({ __csrfToken: csrfToken }),
            })
                .then((response) => response.json())
                .then(
                    ({
                        success,
                        rebasedWorkspaces,
                        messages = [],
                    }: {
                        success: boolean;
                        rebasedWorkspaces: Workspace[];
                        messages: FlashMessage[];
                    }) => {
                        if (success) {
                            setWorkspaces((workspaces) => {
                                const updatedWorkspaces = { ...workspaces };

                                // Removed deleted workspace from list
                                delete updatedWorkspaces[workspaceName];

                                // Update base workspace for all rebased workspaces
                                rebasedWorkspaces.forEach((rebasedWorkspace) => {
                                    if (updatedWorkspaces[rebasedWorkspace.name]) {
                                        updatedWorkspaces[rebasedWorkspace.name].baseWorkspace = {
                                            name: 'live',
                                            title: 'Live',
                                        };
                                    }
                                });
                                return updatedWorkspaces;
                            });
                        }
                        handleFlashMessages(messages);
                    }
                )
                .catch((error) => {
                    notify.error('Failed to delete workspace', error.message);
                    console.error('Failed to delete workspace', error);
                });
        },
        [csrfToken, endpoints.deleteWorkspace]
    );

    const updateWorkspace = useCallback(
        async (formData: FormData): Promise<void> => {
            return fetch(endpoints.updateWorkspace, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            })
                .then((response) => response.json())
                .then((workspace: Workspace) => {
                    // Keep old changes counts after updating workspace with remote data
                    setWorkspaces((workspaces) => {
                        return {
                            ...workspaces,
                            [workspace.name]: {
                                ...workspaces[workspace.name],
                                ...workspace,
                                changesCounts: workspaces[workspace.name].changesCounts,
                            },
                        };
                    });
                    notify.ok('Workspace updated');
                    return workspace[workspace.name];
                })
                .catch((error) => {
                    notify.error('Failed to update workspace', error.message);
                    console.error('Failed to update workspace', error);
                });
        },
        [csrfToken, endpoints.updateWorkspace]
    );

    const showWorkspace = useCallback((workspaceName: string) => {
        window.open(prepareWorkspaceActionUrl(endpoints.showWorkspace, workspaceName), '_self');
    }, []);

    useEffect(() => {
        if (workspaceList) loadChangesCounts();
    }, []);

    return (
        <WorkspaceContext.Provider
            value={{
                userWorkspace,
                workspaces,
                setWorkspaces,
                baseWorkspaceOptions,
                ownerOptions,
                loadChangesCounts,
                deleteWorkspace,
                updateWorkspace,
                showWorkspace,
                sorting,
                setSorting,
                selectedWorkspaceForDeletion,
                setSelectedWorkspaceForDeletion,
                selectedWorkspaceForEdit,
                setSelectedWorkspaceForEdit,
                csrfToken,
                userCanManageInternalWorkspaces,
            }}
        >
            {children}
        </WorkspaceContext.Provider>
    );
};
