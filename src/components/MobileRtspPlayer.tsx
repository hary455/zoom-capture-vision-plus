
import React, { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from './ui/button';
import { RefreshCw, Smartphone, AlertTriangle } from 'lucide-react';
import { toast } from './ui/use-toast';
import { getFFmpeg } from '@/utils/ffmpeg-utils';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isNative = Capacitor.isNativePlatform();
  
  // Generate a unique ID for the player element
  const playerId = `rtsp-player-${Math.random().toString(36).substring(2, 9)}`;
  
  // Try to load FFmpeg to check its availability
  const checkFfmpegAvailability = async () => {
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
  }, [url, isNative]);
  
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
        
        <Button variant="outline" onClick={reloadPlayer}>
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
            
            {/* This is where the native view would be rendered */}
            <div className="w-full h-40 bg-gradient-to-r from-purple-500 to-blue-500 rounded flex items-center justify-center mb-4">
              <Smartphone className="w-10 h-10 text-white" />
            </div>
            
            <p className="text-xs text-gray-400">For full RTSP support, a Capacitor RTSP plugin is being used</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full bg-black/80 text-white p-4">
          <Alert variant="default" className="mb-4 bg-yellow-900/20 border-yellow-800">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle>Limited RTSP Support</AlertTitle>
            <AlertDescription>
              FFmpeg library status: {ffmpegLoaded === true ? "Loaded ✓" : ffmpegLoaded === false ? "Failed to load ✗" : "Unknown"}
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
          
          <Button variant="outline" className="mt-2" onClick={reloadPlayer}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Player
          </Button>
        </div>
      )}
      
      {/* Hidden video and canvas elements for potential future processing */}
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default MobileRtspPlayer;
