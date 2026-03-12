import { NativeScriptConfig } from "@nativescript/core";

export default {
  id: "dev.mlaadd.mblem",
  appPath: "app",
  appResourcesPath: "App_Resources",
  android: {
    v8Flags: "--expose_gc",
    markingMode: "none",
  },
  projectName: "MBLEM",
} as NativeScriptConfig;
