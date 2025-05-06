
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a1fa6303db4f4329bc39973efa6e03c1',
  appName: 'zoom-capture-vision-plus',
  webDir: 'dist',
  server: {
    url: 'https://a1fa6303-db4f-4329-bc39-973efa6e03c1.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    // Configure permissions for RTSP streaming
    CapacitorHttp: {
      enabled: true
    },
    // Allow cleartext traffic for RTSP streams (many RTSP streams are not encrypted)
    AndroidConfig: {
      webContentsDebuggingEnabled: true,
      allowMixedContent: true,
      captureInput: true
    }
  },
  android: {
    // Allow cleartext traffic (non-HTTPS) for RTSP streams
    allowMixedContent: true
  }
};

export default config;
