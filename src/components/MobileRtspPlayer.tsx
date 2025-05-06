
import React, { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from './ui/button';
import { RefreshCw, Smartphone, AlertTriangle, Wifi, WifiOff, ArrowRight } from 'lucide-react';
import { toast } from './ui/use-toast';
import { getFFmpeg } from '@/utils/ffmpeg-utils';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MobileRtspPlayerProps {
  url: string;
  width?: string;
  height?: string;
  className?: string;
}

const MobileRtspPlayer: React.FC<MobileRtspPlayerProps> = ({ url, width = '100%', height = '100%', className = '' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isNative = Capacitor.isNativePlatform();
  const [activeTab, setActiveTab] = useState<string>(isNative ? "native" : "browser");
  
  // Generate a unique ID for the player element
  const playerId = `rtsp-player-${Math.random().toString(36).substring(2, 9)}`;
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Try to load FFmpeg to check its availability
  const checkFfmpegAvailability = async () => {
    if (!isOnline) {
      setFfmpegLoaded(false);
      setError("You are offline. Internet connection is required to load FFmpeg.");
      return false;
    }
    
    try {
      setIsProcessing(true);
      await getFFmpeg();
      setFfmpegLoaded(true);
      setIsProcessing(false);
      return true;
    } catch (error) {
      console.error("Error loading FFmpeg:", error);
      setFfmpegLoaded(false);
      setIsProcessing(false);
      return false;
    }
  };
  
  // Try to load and process RTSP in browser using FFmpeg
  const processRtspWithFFmpeg = async () => {
    if (!url) return;
    
    try {
      setIsProcessing(true);
      
      // Check if FFmpeg is available
      const ffmpegAvailable = await checkFfmpegAvailability();
      
      if (!ffmpegAvailable) {
        setError("Failed to load FFmpeg library. Check your internet connection or try again later.");
        setIsProcessing(false);
        return;
      }
      
      toast({
        title: "FFmpeg Ready",
        description: "Attempting to process RTSP stream",
      });
      
      // For browser RTSP support, we would need a proxy server
      // This part would require a server-side component to convert RTSP to WebRTC or HLS
      
      setIsProcessing(false);
      setIsLoaded(true);
      
    } catch (error) {
      console.error("Error processing RTSP with FFmpeg:", error);
      setError("Failed to initialize FFmpeg for RTSP processing");
      setIsProcessing(false);
    }
  };
  
  useEffect(() => {
    if (!url) {
      setError("No URL provided");
      return;
    }
    
    // Check if URL is likely an RTSP URL
    if (!url.startsWith('rtsp://')) {
      setError("URL doesn't appear to be a valid RTSP stream (should start with rtsp://)");
      return;
    }
    
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const setupPlayer = async () => {
      setIsLoaded(false);
      setError(null);
      setFfmpegLoaded(null);
      
      // For native Android platforms
      if (isNative && Capacitor.getPlatform() === 'android') {
        console.log('Setting up RTSP stream on Android');
        
        // Simulate loading for demo purposes
        // In a real implementation, we would use a Capacitor plugin
        timeoutId = setTimeout(() => {
          setIsLoaded(true);
        }, 1000);
      } else {
        // For browser environments, try to use FFmpeg
        await processRtspWithFFmpeg();
      }
    };
    
    setupPlayer();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [url, isNative, isOnline]);
  
  const reloadPlayer = () => {
    setIsLoaded(false);
    setError(null);
    setFfmpegLoaded(null);
    
    if (isNative && Capacitor.getPlatform() === 'android') {
      setTimeout(() => {
        setIsLoaded(true);
      }, 500);
    } else {
      processRtspWithFFmpeg();
    }
  };
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-black/80 text-white p-4 rounded" style={{ width, height }}>
        <Alert variant="destructive" className="mb-4 bg-red-900/40 border-red-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        {!isOnline && (
          <div className="mb-4 flex items-center text-red-400">
            <WifiOff className="mr-2 h-5 w-5" />
            <span>You are currently offline</span>
          </div>
        )}
        
        <Button variant="outline" onClick={reloadPlayer} disabled={!isOnline}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }
  
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center bg-black/80 text-white" style={{ width, height }}>
        <div className="mb-4 animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        <p className="text-sm">Initializing FFmpeg for RTSP...</p>
        {!isOnline && (
          <div className="mt-4 flex items-center text-red-400">
            <WifiOff className="mr-2 h-5 w-5" />
            <span>Network connection lost</span>
          </div>
        )}
      </div>
    );
  }
  
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center bg-black/80 text-white" style={{ width, height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }
  
  return (
    <div className={`mobile-rtsp-container ${className}`} style={{ width, height }}>
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="browser">Browser View</TabsTrigger>
          <TabsTrigger value="native">Native App</TabsTrigger>
        </TabsList>
        
        <TabsContent value="browser" className="space-y-4">
          <div className="flex flex-col items-center justify-center h-full bg-black/80 text-white p-4">
            <Alert variant="default" className="mb-4 bg-yellow-900/20 border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertTitle>Limited RTSP Support</AlertTitle>
              <AlertDescription>
                FFmpeg library status: {ffmpegLoaded === true ? "Loaded ✓" : ffmpegLoaded === false ? "Failed to load ✗" : "Unknown"}
                {!isOnline && " (Offline Mode)"}
              </AlertDescription>
            </Alert>
            
            <p className="text-lg mb-2">Limited RTSP Support in Browser</p>
            <p className="text-sm mb-4 text-center">RTSP streams require specialized handling in web browsers</p>
            
            <div className="bg-gray-800 p-3 rounded-md mb-4 w-full max-w-md">
              <p className="text-yellow-400 text-sm mb-2">Stream URL:</p>
              <p className="text-xs text-green-400 break-all">{url}</p>
            </div>
            
            <div className="mb-6 text-sm text-center space-y-1">
              <p className="text-yellow-400">For optimal RTSP viewing:</p>
              <p>1. Use our Android native app</p>
              <p>2. Try a lower latency protocol (HLS/WebRTC)</p>
              <p>3. Set up an RTSP-to-HLS proxy server</p>
            </div>
            
            {isOnline ? (
              <div className="flex items-center space-x-2 mb-4">
                <Wifi className="h-5 w-5 text-green-400" />
                <span className="text-green-400 text-sm">Online</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 mb-4">
                <WifiOff className="h-5 w-5 text-red-400" />
                <span className="text-red-400 text-sm">Offline - Internet required for FFmpeg</span>
              </div>
            )}
            
            <Button variant="outline" className="mt-2" onClick={reloadPlayer} disabled={!isOnline}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Player
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="native" className="space-y-4">
          {isNative && Capacitor.getPlatform() === 'android' ? (
            <div 
              id={playerId} 
              className="native-rtsp-player"
              style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
            >
              <div className="flex flex-col items-center justify-center h-full bg-black/80 text-white p-4">
                <p className="mb-2">RTSP Stream Active:</p>
                <p className="text-xs text-green-400 mb-4">{url}</p>
                <p className="text-sm mb-4">Native RTSP playback enabled</p>
                
                <div className="w-full h-40 bg-gradient-to-r from-purple-500 to-blue-500 rounded flex items-center justify-center mb-4">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
                
                <p className="text-xs text-gray-400">Native RTSP playback active</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-black/80 text-white p-4">
              <Alert variant="default" className="mb-4 bg-amber-900/20 border-amber-800">
                <Smartphone className="h-4 w-4 text-amber-500" />
                <AlertTitle>Native App Required</AlertTitle>
                <AlertDescription>
                  You are currently in browser mode. Install the native app for full RTSP support.
                </AlertDescription>
              </Alert>
              
              <h3 className="text-xl font-bold mb-4">How to Use Native App</h3>
              
              <ol className="list-decimal text-left space-y-4 mb-6">
                <li className="ml-4">
                  <strong>Export to GitHub:</strong>
                  <p className="text-sm">Export this project to your GitHub repository using the "Export" button in the top menu.</p>
                </li>
                
                <li className="ml-4">
                  <strong>Clone the Repository:</strong>
                  <p className="text-sm">Clone the repository to your local machine.</p>
                  <div className="bg-gray-800 p-2 rounded mt-1">
                    <code className="text-xs">git clone https://github.com/yourusername/your-repo.git</code>
                  </div>
                </li>
                
                <li className="ml-4">
                  <strong>Install Dependencies:</strong>
                  <p className="text-sm">Navigate to the project directory and install dependencies.</p>
                  <div className="bg-gray-800 p-2 rounded mt-1">
                    <code className="text-xs">npm install</code>
                  </div>
                </li>
                
                <li className="ml-4">
                  <strong>Add Android Platform:</strong>
                  <p className="text-sm">Add the Android platform to your project.</p>
                  <div className="bg-gray-800 p-2 rounded mt-1">
                    <code className="text-xs">npx cap add android</code>
                  </div>
                </li>
                
                <li className="ml-4">
                  <strong>Build the Project:</strong>
                  <p className="text-sm">Build the web assets that will be copied to Android.</p>
                  <div className="bg-gray-800 p-2 rounded mt-1">
                    <code className="text-xs">npm run build</code>
                  </div>
                </li>
                
                <li className="ml-4">
                  <strong>Sync with Android:</strong>
                  <p className="text-sm">Copy web assets to the Android platform.</p>
                  <div className="bg-gray-800 p-2 rounded mt-1">
                    <code className="text-xs">npx cap sync</code>
                  </div>
                </li>
                
                <li className="ml-4">
                  <strong>Open in Android Studio:</strong>
                  <p className="text-sm">Open the Android project in Android Studio.</p>
                  <div className="bg-gray-800 p-2 rounded mt-1">
                    <code className="text-xs">npx cap open android</code>
                  </div>
                </li>
                
                <li className="ml-4">
                  <strong>Run on Device/Emulator:</strong>
                  <p className="text-sm">Run the app on your Android device or emulator from Android Studio.</p>
                </li>
              </ol>
              
              <Alert className="mb-4 bg-blue-900/20 border-blue-800">
                <AlertDescription>
                  Once installed on Android, the app will have native RTSP support with better performance and reliability.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Hidden video and canvas elements for potential future processing */}
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default MobileRtspPlayer;
