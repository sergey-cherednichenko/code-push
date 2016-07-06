export declare enum CommandType {
    accessKeyAdd = 0,
    accessKeyPatch = 1,
    accessKeyList = 2,
    accessKeyRemove = 3,
    appAdd = 4,
    appList = 5,
    appRemove = 6,
    appRename = 7,
    appTransfer = 8,
    collaboratorAdd = 9,
    collaboratorList = 10,
    collaboratorRemove = 11,
    debug = 12,
    deploymentAdd = 13,
    deploymentHistory = 14,
    deploymentHistoryClear = 15,
    deploymentList = 16,
    deploymentMetrics = 17,
    deploymentRemove = 18,
    deploymentRename = 19,
    link = 20,
    login = 21,
    logout = 22,
    patch = 23,
    promote = 24,
    register = 25,
    release = 26,
    releaseCordova = 27,
    releaseReact = 28,
    rollback = 29,
    sessionList = 30,
    sessionRemove = 31,
    whoami = 32,
}
export interface ICommand {
    type: CommandType;
}
export interface IAccessKeyAddCommand extends ICommand {
    name: string;
    ttl?: number;
}
export interface IAccessKeyPatchCommand extends ICommand {
    newName?: string;
    oldName: string;
    ttl?: number;
}
export interface IAccessKeyListCommand extends ICommand {
    format: string;
}
export interface IAccessKeyRemoveCommand extends ICommand {
    accessKey: string;
}
export interface IAppAddCommand extends ICommand {
    appName: string;
}
export interface IAppListCommand extends ICommand {
    format: string;
}
export interface IAppRemoveCommand extends ICommand {
    appName: string;
}
export interface IAppRenameCommand extends ICommand {
    currentAppName: string;
    newAppName: string;
}
export interface IAppTransferCommand extends ICommand {
    appName: string;
    email: string;
}
export interface ICollaboratorAddCommand extends ICommand {
    appName: string;
    email: string;
}
export interface ICollaboratorListCommand extends ICommand {
    appName: string;
    format: string;
}
export interface ICollaboratorRemoveCommand extends ICommand {
    appName: string;
    email: string;
}
export interface IDebugCommand extends ICommand {
    platform: string;
}
export interface IDeploymentAddCommand extends ICommand {
    appName: string;
    deploymentName: string;
}
export interface IDeploymentHistoryClearCommand extends ICommand {
    appName: string;
    deploymentName: string;
}
export interface IDeploymentHistoryCommand extends ICommand {
    appName: string;
    deploymentName: string;
    format: string;
    displayAuthor: boolean;
}
export interface IDeploymentListCommand extends ICommand {
    appName: string;
    format: string;
    displayKeys: boolean;
}
export interface IDeploymentRemoveCommand extends ICommand {
    appName: string;
    deploymentName: string;
}
export interface IDeploymentRenameCommand extends ICommand {
    appName: string;
    currentDeploymentName: string;
    newDeploymentName: string;
}
export interface ILinkCommand extends ICommand {
    serverUrl?: string;
}
export interface ILoginCommand extends ICommand {
    serverUrl?: string;
    accessKey: string;
    proxy?: string;
    noProxy?: boolean;
}
export interface IPackageInfo {
    description?: string;
    disabled?: boolean;
    mandatory?: boolean;
    rollout?: number;
}
export interface IPatchCommand extends ICommand, IPackageInfo {
    appName: string;
    appStoreVersion?: string;
    deploymentName: string;
    label: string;
}
export interface IPromoteCommand extends ICommand, IPackageInfo {
    appName: string;
    appStoreVersion?: string;
    sourceDeploymentName: string;
    destDeploymentName: string;
}
export interface IRegisterCommand extends ICommand {
    serverUrl?: string;
    proxy?: string;
    noProxy?: boolean;
}
export interface IReleaseBaseCommand extends ICommand, IPackageInfo {
    appName: string;
    appStoreVersion: string;
    deploymentName: string;
}
export interface IReleaseCommand extends IReleaseBaseCommand {
    package: string;
}
export interface IReleaseCordovaCommand extends IReleaseBaseCommand {
    build: boolean;
    platform: string;
}
export interface IReleaseReactCommand extends IReleaseBaseCommand {
    bundleName?: string;
    development?: boolean;
    entryFile?: string;
    platform: string;
    plistFile?: string;
    plistFilePrefix?: string;
    sourcemapOutput?: string;
}
export interface IRollbackCommand extends ICommand {
    appName: string;
    deploymentName: string;
    targetRelease: string;
}
export interface ISessionListCommand extends ICommand {
    format: string;
}
export interface ISessionRemoveCommand extends ICommand {
    machineName: string;
}
