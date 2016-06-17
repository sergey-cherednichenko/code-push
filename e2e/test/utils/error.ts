const prefix: string = "[Error]  ";

export function getErrorAppNotFound(appName: string): string {
    return prefix + "App \"" + appName + "\" does not exist.";
}

export function getErrorAppConflict(appName: string): string {
    return prefix + "An app named '" + appName + "' already exists.";
}

export function getErrorDeploymentNotFound(deploymentName: string): string {
    return prefix + "Deployment \"" + deploymentName + "\" does not exist.";
}

export function getErrorDeploymentConflict(deploymentName: string): string {
    return prefix + "A deployment named '" + deploymentName + "' already exists.";
}