export module Error {
    const PREFIX: string = "[Error]  ";
    
    // App

    export function appNotFound(appName: string): string {
        return PREFIX + "App \"" + appName + "\" does not exist.";
    }

    export function appConflict(appName: string): string {
        return PREFIX + "An app named '" + appName + "' already exists.";
    }
    
    // Deployment

    export function deploymentNotFound(deploymentName: string): string {
        return PREFIX + "Deployment \"" + deploymentName + "\" does not exist.";
    }

    export function deploymentConflict(deploymentName: string): string {
        return PREFIX + "A deployment named '" + deploymentName + "' already exists.";
    }
}