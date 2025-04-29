
import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';

interface MobileRtspPlayerProps {
  url: string;
  width?: string;
  height?: string;
  className?: string;
}

const MobileRtspPlayer: React.FC<MobileRtspPlayerProps> = ({ url, width = '100%', height = '100%', className = '' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();
  
  // Generate a unique ID for the player element
  const playerId = `rtsp-player-${Math.random().toString(36).substring(2, 9)}`;
  
  useEffect(() => {
    if (!url) {
      setError("No URL provided");
      return;
    }
    
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const setupPlayer = () => {
      setIsLoaded(false);
      setError(null);
      
      // For native Android platforms, we would ideally use a native bridge
      // But since the capacitor-rtsp-player isn't available, we'll use a fallback
      if (isNative && Capacitor.getPlatform() === 'android') {
        console.log('Setting up RTSP stream on Android');
        
        // In a real implementation, we would call our native module here
        // For now, we'll simulate loading
        timeoutId = setTimeout(() => {
          setIsLoaded(true);
        }, 1000);
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
    
    setTimeout(() => {
      setIsLoaded(true);
    }, 500);
  };
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-black/80 text-white p-4 rounded" style={{ width, height }}>
        <p className="text-red-400 mb-4">{error}</p>
        <Button variant="outline" onClick={reloadPlayer}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
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
            <p className="mb-2">RTSP Stream:</p>
            <p className="text-xs text-green-400 mb-4">{url}</p>
            <p className="text-xs mb-2">Native playback would be activated here</p>
            <p className="text-xs text-gray-400">For full RTSP support, a custom Capacitor plugin is needed</p>
          </div>
        </div>
      ) : (
        // Fallback for web/iOS - use ReactPlayer in the parent component
        <div className="flex flex-col items-center justify-center h-full bg-black/80 text-white p-4">
          <p>RTSP streaming requires:</p>
          <p className="mt-2 text-yellow-400">1. Android native implementation</p>
          <p className="text-yellow-400">2. iOS native implementation</p>
          <p className="text-yellow-400">3. Server-side proxy for web</p>
          <Button variant="outline" className="mt-4" onClick={reloadPlayer}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Player
          </Button>
        </div>
      )}
    </div>
  );
};

export default MobileRtspPlayer;
