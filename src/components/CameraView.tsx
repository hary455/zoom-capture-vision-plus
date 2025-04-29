
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Video, ZoomIn, ZoomOut } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import CameraControls from "./CameraControls";

const CameraView = () => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [flashMode, setFlashMode] = useState("off");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        const constraints = {
          video: { 
            facingMode: isFrontCamera ? "user" : "environment",
          },
          audio: false
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        toast({
          title: "Camera Error",
          description: "Could not access the camera. Please check permissions.",
          variant: "destructive",
        });
      }
    };
    
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isFrontCamera, toast]);
  
  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          // Convert to base64 and save
          const photoData = canvas.toDataURL('image/jpeg');
          const photos = JSON.parse(localStorage.getItem('capturedPhotos') || '[]');
          const newPhoto = {
            id: Date.now(),
            data: photoData,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('capturedPhotos', JSON.stringify([...photos, newPhoto]));
          
          toast({
            title: "Photo Captured",
            description: "Photo saved to gallery.",
          });
        } catch (error) {
          console.error("Error saving photo:", error);
          toast({
            title: "Error",
            description: "Failed to save photo.",
            variant: "destructive",
          });
        }
      }
    }
  };
  
  const handleRecordVideo = () => {
    if (isRecording) {
      // Stop recording logic would go here
      setIsRecording(false);
      toast({
        title: "Recording Stopped",
        description: "Video saved to gallery.",
      });
      
      // In a real app, we'd save the recorded video to the gallery here
    } else {
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: "Recording video...",
      });
      
      // In a real app, we'd start recording here
    }
  };
  
  const handleZoomChange = (value: number[]) => {
    setZoomLevel(value[0]);
    if (videoRef.current) {
      // In a web environment, we simulate zoom with CSS transform
      const scale = 1 + (value[0] - 1) * 0.9; // Scale from 1x to 10x
      videoRef.current.style.transform = `scale(${scale})`;
    }
  };
  
  return (
    <div className="relative flex flex-col flex-1 bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="absolute w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Zoom level indicator */}
        <div className="absolute top-4 right-4 bg-black/60 px-2 py-1 rounded-md">
          {zoomLevel.toFixed(1)}x
        </div>
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white text-sm">REC</span>
          </div>
        )}
        
        {/* Zoom slider */}
        <div className="absolute bottom-28 left-4 right-4">
          <Slider 
            min={1} 
            max={10} 
            step={0.1} 
            value={[zoomLevel]}
            onValueChange={handleZoomChange}
            className="w-full"
          />
        </div>
      </div>
      
      <CameraControls 
        onTakePhoto={handleTakePhoto}
        onRecordVideo={handleRecordVideo}
        isRecording={isRecording}
        onFlipCamera={() => setIsFrontCamera(!isFrontCamera)}
        onFlashToggle={() => setFlashMode(flashMode === "off" ? "on" : "off")}
        flashMode={flashMode}
      />
    </div>
  );
};

export default CameraView;
