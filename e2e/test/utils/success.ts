// App

export function getSuccessAppAdd(appName: string): RegExp {
    return new RegExp("Successfully added the \"" + appName + "\" app, along with the following default deployments:.*");
}

export function getSuccessAppRename(oldAppName: string, newAppName: string): RegExp {
    return new RegExp("Successfully renamed the \"" + oldAppName + "\" app to \"" + newAppName + "\"[.]")
}

export function getSuccessAppRm(appName: string): RegExp {
    return new RegExp("Successfully removed the \"" + appName + "\" app[.]");
}

// Deployment

export function getSuccessDeploymentAdd(deploymentName: string, appName: string): RegExp {
    return new RegExp("Successfully added the \"" + deploymentName + "\" deployment with key \".*\" to the \"" + appName + "\" app[.]");
}

export function getSuccessDeploymentRename(oldDeploymentName: string, newDeploymentName: string, appName: string): RegExp {
    return new RegExp("Successfully renamed the \"" + oldDeploymentName + "\" deployment to \"" + newDeploymentName + "\" for the \"" + appName + "\" app[.]")
}

export function getSuccessDeploymentRm(deploymentName: string, appName: string): RegExp {
    return new RegExp("Successfully removed the \"" + deploymentName + "\" deployment from the \"" + appName + "\" app[.]");
}