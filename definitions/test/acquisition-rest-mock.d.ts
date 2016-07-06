import * as acquisitionSdk from "../script/acquisition-sdk";
import * as rest from "rest-definitions";
export declare var validDeploymentKey: string;
export declare var latestPackage: rest.UpdateCheckResponse;
export declare var serverUrl: string;
export declare class HttpRequester implements acquisitionSdk.Http.Requester {
    request(verb: acquisitionSdk.Http.Verb, url: string, requestBodyOrCallback: string | acquisitionSdk.Callback<acquisitionSdk.Http.Response>, callback?: acquisitionSdk.Callback<acquisitionSdk.Http.Response>): void;
}
export declare class CustomResponseHttpRequester implements acquisitionSdk.Http.Requester {
    response: acquisitionSdk.Http.Response;
    constructor(response: acquisitionSdk.Http.Response);
    request(verb: acquisitionSdk.Http.Verb, url: string, requestBodyOrCallback: string | acquisitionSdk.Callback<acquisitionSdk.Http.Response>, callback?: acquisitionSdk.Callback<acquisitionSdk.Http.Response>): void;
}
