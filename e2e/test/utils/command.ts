export module Command {
    
    function getCommand(args: string) {
        return "code-push " + args;
    }

    function getCommandJsonFormat(args: string) {
        return "code-push " + args + " --format json";
    }
    
    // App commands

    export function appLs(): string {
        return getCommandJsonFormat("app ls");
    }

    export function appAdd(appName: string): string {
        return getCommand("app add " + appName);
    }

    export function appRename(oldAppName: string, newAppName: string): string {
        return getCommand("app rename " + oldAppName + " " + newAppName);
    }

    export function appRm(appName: string): string {
        return getCommand("app rm " + appName);
    }

    // Deployment commands

    export function deploymentLs(appName: string): string {
        return getCommandJsonFormat("deployment ls " + appName);
    }

    export function deploymentAdd(deploymentName: string, appName: string): string {
        return getCommand("deployment add " + appName + " " + deploymentName);
    }

    export function deploymentRename(oldDeploymentName: string, newDeploymentName: string, appName: string): string {
        return getCommand("deployment rename " + appName + " " + oldDeploymentName + " " + newDeploymentName);
    }

    export function deploymentRm(deploymentName: string, appName: string): string {
        return getCommand("deployment rm " + appName + " " + deploymentName);
    }
    
    // Prompt
    
    // NOTE: this is not "Are you sure? (Y/n): " but it works the same
    export const PROMPT_ARE_YOU_SURE: RegExp = /.*/;
    
    export const RESPONSE_ACCEPT: string = "Y\n";
    
    export const RESPONSE_REJECT: string = "n\n";
}