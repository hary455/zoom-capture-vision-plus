import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Video } from "lucide-react";
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  
  // Keep track of touch for pinch zoom
  const touchRef = useRef({
    initialDistance: 0,
    initialZoom: 1,
    maxZoom: 10,
    minZoom: 1
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
        
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
  
  // Handle pinch zoom gestures
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    // Calculate distance between two touch points
    const getDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    
    // Handle touch start
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        touchRef.current.initialDistance = getDistance(e.touches);
        touchRef.current.initialZoom = zoomLevel;
        e.preventDefault();
      }
    };
    
    // Handle touch move (for pinch)
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        const currentDistance = getDistance(e.touches);
        const initialDistance = touchRef.current.initialDistance;
        
        if (initialDistance > 0) {
          // Calculate new zoom level based on pinch
          const scale = currentDistance / initialDistance;
          let newZoomLevel = touchRef.current.initialZoom * scale;
          
          // Clamp zoom level between min and max
          newZoomLevel = Math.max(touchRef.current.minZoom, Math.min(touchRef.current.maxZoom, newZoomLevel));
          
          // Apply zoom
          setZoomLevel(newZoomLevel);
          videoElement.style.transform = `scale(${newZoomLevel})`;
        }
        e.preventDefault();
      }
    };
    
    // Add event listeners
    videoElement.addEventListener('touchstart', handleTouchStart);
    videoElement.addEventListener('touchmove', handleTouchMove);
    
    // Clean up
    return () => {
      videoElement.removeEventListener('touchstart', handleTouchStart);
      videoElement.removeEventListener('touchmove', handleTouchMove);
    };
  }, [zoomLevel]);
  
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
  
  const handleRecordVideo = async () => {
    if (!videoRef.current) return;
    
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      
      // We don't set isRecording to false here, because we'll do that after saving the video
    } else {
      // Start recording with both audio and video
      try {
        const currentStream = videoRef.current.srcObject as MediaStream;
        
        // Get audio stream
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        
        // Combine video and audio tracks
        const combinedStream = new MediaStream();
        
        // Add video tracks from the current stream
        currentStream.getVideoTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
        
        // Add audio tracks from audio stream
        audioStream.getAudioTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
        
        // Create new media recorder with combined stream
        chunksRef.current = [];
        const mediaRecorder = new MediaRecorder(combinedStream);
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          
          // Save to localStorage (as base64)
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64data = reader.result;
            const videos = JSON.parse(localStorage.getItem('capturedVideos') || '[]');
            const newVideo = {
              id: Date.now(),
              data: base64data,
              timestamp: new Date().toISOString()
            };
            localStorage.setItem('capturedVideos', JSON.stringify([...videos, newVideo]));
          };
          
          setIsRecording(false);
          
          toast({
            title: "Recording Stopped",
            description: "Video saved to gallery.",
          });
          
          // Clean up audio tracks
          audioStream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
        
        toast({
          title: "Recording Started",
          description: "Recording video with audio...",
        });
      } catch (error) {
        console.error("Error starting recording:", error);
        toast({
          title: "Recording Error",
          description: "Could not start recording. Please check permissions.",
          variant: "destructive",
        });
      }
    }
  };
  
  const handleFlipCamera = () => {
    setIsFrontCamera(!isFrontCamera);
    toast({
      title: "Camera Flipped",
      description: `Using ${!isFrontCamera ? "front" : "back"} camera`,
    });
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
        
        {/* Pinch instructions overlay - show briefly */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 px-4 py-2 rounded-lg text-white text-sm animate-fade-out">
            Pinch to zoom (up to 10x)
          </div>
        </div>
      </div>
      
      <CameraControls 
        onTakePhoto={handleTakePhoto}
        onRecordVideo={handleRecordVideo}
        isRecording={isRecording}
        onFlipCamera={handleFlipCamera}
        onFlashToggle={() => setFlashMode(flashMode === "off" ? "on" : "off")}
        flashMode={flashMode}
      />
    </div>
  );
};

export default CameraView;
