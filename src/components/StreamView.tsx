
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Slider } from "@/components/ui/slider";

const StreamView = () => {
  const { toast } = useToast();
  const [rtspUrl, setRtspUrl] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  
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
  
  return (
    <div className="flex flex-col h-full bg-zinc-900">
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
      </div>
      
      <div className="relative flex-1 bg-black flex items-center justify-center">
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
            
            {/* Fullscreen button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4"
              onClick={toggleFullscreen}
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <div className="text-zinc-500 text-center p-4">
            <p>Enter an RTSP URL and press Connect to start streaming</p>
            <p className="text-xs mt-2">Example: rtsp://your-camera-ip:554/stream</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamView;
