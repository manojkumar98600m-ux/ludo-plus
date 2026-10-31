import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ludoplus.app",
  appName: "LUDO PLUS",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false
  }
};

export default config;
