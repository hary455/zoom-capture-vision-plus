
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, Maximize, ZoomIn, ZoomOut, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Slider } from "@/components/ui/slider";
import FloatingControls from "./FloatingControls";

const StreamView = () => {
  const { toast } = useToast();
  const [rtspUrl, setRtspUrl] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFloating, setIsFloating] = useState(false);
  const [savedStreams, setSavedStreams] = useState<{name: string, url: string}[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Load saved streams from localStorage
    const savedStreamsList = JSON.parse(localStorage.getItem('savedStreams') || '[]');
    setSavedStreams(savedStreamsList);
  }, []);
  
  const startStream = () => {
    if (!rtspUrl) {
      toast({
        title: "Error",
        description: "Please enter an RTSP URL",
        variant: "destructive",
      });
      return;
    }
    
    // In a web environment, we need a server to proxy RTSP streams to WebRTC or HLS
    // This is a simplified demonstration - in a real app, you'd need a server component
    
    toast({
      title: "Stream Info",
      description: "In a real Android app, this would connect to the RTSP stream. For this demo, we'll show a sample video.",
    });
    
    // For demo purposes, we'll use a sample video
    if (videoRef.current) {
      videoRef.current.src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      videoRef.current.play();
    }
    
    setIsStreaming(true);
  };
  
  const stopStream = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
    setIsStreaming(false);
  };
  
  const handleZoomChange = (value: number[]) => {
    setZoomLevel(value[0]);
    if (videoRef.current) {
      // In a web environment, we simulate zoom with CSS transform
      const scale = 1 + (value[0] - 1) * 0.9; // Scale from 1x to 10x
      videoRef.current.style.transform = `scale(${scale})`;
    }
  };
  
  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };
  
  const toggleFloatingMode = () => {
    if (!isFloating && isStreaming) {
      setIsFloating(true);
      if (videoContainerRef.current) {
        videoContainerRef.current.classList.add("floating-video");
      }
    } else {
      setIsFloating(false);
      if (videoContainerRef.current) {
        videoContainerRef.current.classList.remove("floating-video");
      }
    }
  };
  
  const saveStream = () => {
    if (!rtspUrl) return;
    
    // Generate a default name if one is not provided
    const streamName = `Stream ${savedStreams.length + 1}`;
    
    const newSavedStream = {
      name: streamName,
      url: rtspUrl
    };
    
    const updatedSavedStreams = [...savedStreams, newSavedStream];
    setSavedStreams(updatedSavedStreams);
    localStorage.setItem('savedStreams', JSON.stringify(updatedSavedStreams));
    
    toast({
      title: "Stream Saved",
      description: `Stream saved as "${streamName}"`,
    });
  };
  
  const loadSavedStream = (url: string) => {
    setRtspUrl(url);
    if (isStreaming) {
      stopStream();
      setTimeout(() => {
        startStream();
      }, 300);
    }
  };
  
  const deleteSavedStream = (index: number) => {
    const updatedSavedStreams = [...savedStreams];
    updatedSavedStreams.splice(index, 1);
    setSavedStreams(updatedSavedStreams);
    localStorage.setItem('savedStreams', JSON.stringify(updatedSavedStreams));
    
    toast({
      title: "Stream Deleted",
      description: "Saved stream has been deleted",
    });
  };
  
  return (
    <div className={`flex flex-col h-full bg-zinc-900 ${isFloating ? 'has-floating-video' : ''}`}>
      <div className="p-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Enter RTSP URL (e.g., rtsp://example.com/stream)"
            value={rtspUrl}
            onChange={(e) => setRtspUrl(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={isStreaming ? stopStream : startStream}
            variant={isStreaming ? "destructive" : "default"}
          >
            {isStreaming ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Connect
              </>
            )}
          </Button>
        </div>
        
        {/* Saved streams */}
        {savedStreams.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">Saved Streams</h3>
            <div className="flex flex-wrap gap-2">
              {savedStreams.map((stream, index) => (
                <div key={index} className="flex items-center bg-zinc-800 rounded-md overflow-hidden">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="px-3 py-1 h-auto"
                    onClick={() => loadSavedStream(stream.url)}
                  >
                    {stream.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                    onClick={() => deleteSavedStream(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div 
        ref={videoContainerRef} 
        className={`relative flex-1 bg-black flex items-center justify-center ${isFloating ? 'floating-video' : ''}`}
      >
        {isStreaming ? (
          <>
            <video
              ref={videoRef}
              className="max-h-full max-w-full object-contain"
              controls
            />
            
            {/* Zoom controls */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <ZoomOut className="h-5 w-5" />
                <span className="text-white">{zoomLevel.toFixed(1)}x</span>
                <ZoomIn className="h-5 w-5" />
              </div>
              <Slider 
                min={1} 
                max={10} 
                step={0.1} 
                value={[zoomLevel]}
                onValueChange={handleZoomChange}
              />
            </div>
            
            {/* Action buttons */}
            <div className="absolute top-4 right-4 flex space-x-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={saveStream}
              >
                <Save className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleFloatingMode}
              >
                {isFloating ? (
                  <ZoomIn className="h-5 w-5" />
                ) : (
                  <ZoomOut className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleFullscreen}
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
            
            <FloatingControls 
              isFloating={isFloating} 
              onMinimize={toggleFloatingMode}
              onMaximize={toggleFullscreen}
              onClose={stopStream}
            />
          </>
        ) : (
          <div className="text-zinc-500 text-center p-4">
            <p>Enter an RTSP URL and press Connect to start streaming</p>
            <p className="text-xs mt-2">Example: rtsp://your-camera-ip:554/stream</p>
          </div>
        )}
      </div>
      
      <style jsx global>{`
        .has-floating-video .floating-video {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 250px;
          height: 150px;
          z-index: 1000;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .floating-video .absolute {
          display: none;
        }
        
        .floating-video:hover .absolute {
          display: flex;
        }
      `}</style>
    </div>
  );
};

export default StreamView;
