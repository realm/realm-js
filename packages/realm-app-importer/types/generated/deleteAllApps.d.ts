declare const fetch: any;
declare const getApps: (headers: any) => Promise<any>;
declare const deleteApps: (apps: any, headers: any) => Promise<void>;
declare const getLoginHeaders: () => Promise<{
    "Content-Type": string;
    Authorization: string;
}>;
declare const main: () => Promise<void>;
