import * as assert from "assert";
import * as CodePush from "rest-definitions";
var tryJSON = require("try-json");

export module Validate {
    
    // Types
    
    /** Throws if the nixt response provided is invalid. */
    export type responseValidatorFunction = (result: any) => void;
    
    /** Throws if the object (app, deployment, etc) provided is invalid. */
    export type objectValidatorFunction = (object: any) => void;
    
    /** 
     * Returns a function that throws if the container object being validated does not contain the member in the correct state.
     * 
     * Logically, this is equivalent to `assert.equal(member in object, isIn)`
     */
    export type memberValidatorFunction = (member: string, isIn: boolean) => objectValidatorFunction;
    
    /**
     * Returns a function that throws if the container object being validated does not contain the members in the correct states.
     * 
     * Logically, this is equivalent to `for each member to check { assert(member in object, isIn) }`
     */
    export type groupValidatorFunction = (membersToCheck: { [member: string]: boolean }) => objectValidatorFunction;
    
    export interface Validator {
        (): responseValidatorFunction;
        
        internal: objectValidatorFunction;
    }
    
    export interface ContainerValidator extends Validator {
        checkFor: memberValidatorFunction;
        checkForMany: groupValidatorFunction;
    }
    
    // Validators
    
    export const App: Validator = getValidator(validateApp);
    
    export const Apps: ContainerValidator = getContainerValidator(validateApps, checkForApps);
    
    export const CollaboratorMap: ContainerValidator = getContainerValidator(validateCollaboratorMap, checkForCollaboratorMap);
    
    export const Deployments: ContainerValidator = getContainerValidator(validateDeployments, checkForDeployments);
    
    ////////////////////////////////////////////////////////////////////
    // Implementation Details
    
    function getValidator(internal: (object: any) => void): Validator {
        var validator = <Validator>function(): (result: any) => void {
            return validateResponse(internal);
        }
        validator.internal = internal;
        return validator;
    }
    
    function getContainerValidator(internal: responseValidatorFunction, checkForMembers: groupValidatorFunction): ContainerValidator {
        var containerValidator = <ContainerValidator>getValidator(internal);
        containerValidator.checkForMany = (result: any) => { return validateResponse(checkForMembers); };
        containerValidator.checkFor = function(memberName: string, isIn: boolean): responseValidatorFunction {
            return validateResponse(checkForMembers({ [memberName]: isIn }));
        };
        return containerValidator;
    }
    
    function validateResponse(validateResponseFunction: objectValidatorFunction): responseValidatorFunction {
        return (result: any) => {
            assert(result);
            assert(result.stdout);
            validateResponseFunction(tryJSON(result.stdout));
        };
    }
    
    // App validation functions
    
    function validateApp(app: CodePush.App): void {
        assert(app);

        // An app must have a name.
        assert(app.name);

        validateCollaboratorMap(app.collaborators);
    }
    
    function validateApps(apps: CodePush.App[]): void {
        assert(apps);

        // A user cannot have two apps of the same name.
        var doesNameExist: { [name: string]: boolean } = {};

        apps.forEach((app: CodePush.App) => {
            assert(!doesNameExist[app.name]);
            doesNameExist[app.name] = true;
            
            validateApp(app);
        });
    }

    function checkForApps(appTuplesToCheck: { [appName: string]: boolean }): objectValidatorFunction {
        return (apps: CodePush.App[]) => {
            validateApps(apps);
            
            apps.forEach((app: CodePush.App) => {
                assert(appTuplesToCheck[app.name] === true || appTuplesToCheck[app.name] === undefined);
                if (appTuplesToCheck[app.name]) {
                    delete appTuplesToCheck[app.name];
                }
            });
            
            // At this point, all app tuples remaining in the map should be ones that should not be in the list of apps.
            for (var appName in appTuplesToCheck) {
                assert(appTuplesToCheck[appName] === false);
            }
        };
    }
    
    // Collaborator validation functions
    
    function validateCollaboratorMap(collaboratorMap: CodePush.CollaboratorMap): void {
        assert(collaboratorMap);

        // An app must have exactly one owner and an infinite amount of collaborators in its collaborator list.
        var hasOwner: boolean = false;
        // An app must have exactly one collaborator marked as the current account.
        var hasCurrentAccount: boolean = false;

        // No two collaborators can share the same email.
        var doesEmailExist: { [email: string]: boolean } = {};

        for (var email in collaboratorMap) {
            assert(!doesEmailExist[email]);
            doesEmailExist[email] = true;

            var collaboratorProperties: CodePush.CollaboratorProperties = collaboratorMap[email];

            var isOwner: boolean = collaboratorProperties.permission === "Owner";
            assert(!(isOwner && hasOwner));
            hasOwner = isOwner;

            var isCurrentAccount: boolean = collaboratorProperties.isCurrentAccount;
            assert(!(isCurrentAccount && hasCurrentAccount));
            hasCurrentAccount = isCurrentAccount;
        }

        assert(hasOwner);
        assert(hasCurrentAccount);
    }

    function checkForCollaboratorMap(collaboratorTuplesToCheck: { [email: string]: boolean }): (collaboratorMap: CodePush.CollaboratorMap) => void {
        return (collaboratorMap: CodePush.CollaboratorMap) => {
            validateCollaboratorMap(collaboratorMap);
            
            for (var email in collaboratorTuplesToCheck) {
                assert.equal(email in collaboratorMap, collaboratorTuplesToCheck[email]);
            }
        };
    }
    
    // Deployment validation functions
    
    function validateDeployments(deployments: CodePush.Deployment[]): void {
        assert(deployments);
        
        // No two deployments for a single app can share the same name or key.
        var doesNameExist: { [name: string]: boolean } = {};
        var doesKeyExist: { [key: string]: boolean } = {};
        
        deployments.forEach((deployment: CodePush.Deployment) => {
            assert(!doesNameExist[deployment.name]);
            doesNameExist[deployment.name] = true;
            
            assert(!doesKeyExist[deployment.key]);
            doesKeyExist[deployment.key] = true;
        });
    }

    function checkForDeployments(deploymentTuplesToCheck: { [deploymentName: string]: boolean }): objectValidatorFunction {
        return (deployments: CodePush.Deployment[]) => {
            validateDeployments(deployments);
            
            deployments.forEach((deployment: CodePush.Deployment) => {
                assert(deploymentTuplesToCheck[deployment.name] === true || deploymentTuplesToCheck[deployment.name] === undefined);
                if (deploymentTuplesToCheck[deployment.name]) {
                    delete deploymentTuplesToCheck[deployment.name];
                }
            });
            
            // At this point, all deployment tuples remaining in the map should be ones that should not be in the list of deployments.
            for (var deploymentName in deploymentTuplesToCheck) {
                assert(deploymentTuplesToCheck[deploymentName] === false);
            }
        };
    }
}