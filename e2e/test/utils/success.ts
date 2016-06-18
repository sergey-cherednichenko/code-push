export module Success {

    // App

    export function appAdd(appName: string): RegExp {
        return new RegExp("Successfully added the \"" + appName + "\" app, along with the following default deployments:.*");
    }

    export function appRename(oldAppName: string, newAppName: string): RegExp {
        return new RegExp("Successfully renamed the \"" + oldAppName + "\" app to \"" + newAppName + "\"[.]")
    }

    export function appRm(appName: string): RegExp {
        return new RegExp("Successfully removed the \"" + appName + "\" app[.]");
    }

    // Deployment

    export function deploymentAdd(deploymentName: string, appName: string): RegExp {
        return new RegExp("Successfully added the \"" + deploymentName + "\" deployment with key \".*\" to the \"" + appName + "\" app[.]");
    }

    export function deploymentRename(oldDeploymentName: string, newDeploymentName: string, appName: string): RegExp {
        return new RegExp("Successfully renamed the \"" + oldDeploymentName + "\" deployment to \"" + newDeploymentName + "\" for the \"" + appName + "\" app[.]")
    }

    export function deploymentRm(deploymentName: string, appName: string): RegExp {
        return new RegExp("Successfully removed the \"" + deploymentName + "\" deployment from the \"" + appName + "\" app[.]");
    }

}