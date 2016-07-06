import AccountManager = require("code-push");
import * as Q from "q";
import * as cli from "../definitions/cli";
import { UpdateMetrics } from "code-push/script/types";
import Promise = Q.Promise;
export interface UpdateMetricsWithTotalActive extends UpdateMetrics {
    totalActive: number;
}
export interface PackageWithMetrics {
    metrics?: UpdateMetricsWithTotalActive;
}
export declare var log: (message: string | Chalk.ChalkChain) => void;
export declare var sdk: AccountManager;
export declare var spawn: any;
export declare var execSync: any;
export declare var confirm: () => Q.Promise<boolean>;
export declare var createEmptyTempReleaseFolder: (folderPath: string) => Q.Promise<void>;
export declare var deploymentList: (command: cli.IDeploymentListCommand, showPackage?: boolean) => Q.Promise<void>;
export declare function execute(command: cli.ICommand): Promise<void>;
export declare var release: (command: cli.IReleaseCommand) => Q.Promise<void>;
export declare var releaseCordova: (command: cli.IReleaseCordovaCommand) => Q.Promise<void>;
export declare var releaseReact: (command: cli.IReleaseReactCommand) => Q.Promise<void>;
export declare var runReactNativeBundleCommand: (bundleName: string, development: boolean, entryFile: string, outputFolder: string, platform: string, sourcemapOutput: string) => Q.Promise<void>;
