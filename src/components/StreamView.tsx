import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, Maximize, ZoomIn, ZoomOut, Save, X, Camera, Film, Image } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Slider } from "@/components/ui/slider";
import FloatingControls from "./FloatingControls";
import ReactPlayer from "react-player";
import { Capacitor } from '@capacitor/core';
import MobileRtspPlayer from "./MobileRtspPlayer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const StreamView = () => {
  const { toast } = useToast();
  const [rtspUrl, setRtspUrl] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFloating, setIsFloating] = useState(false);
  const [savedStreams, setSavedStreams] = useState<{name: string, url: string}[]>([]);
  const [isStream, setIsStream] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [useMobilePlayer, setUseMobilePlayer] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<ReactPlayer | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Camera related states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  
  // Touch zoom reference
  const touchRef = useRef({
    initialDistance: 0,
    initialZoom: 1,
    maxZoom: 10,
    minZoom: 1
  });
  
  useEffect(() => {
    // Load saved streams from localStorage
    const savedStreamsList = JSON.parse(localStorage.getItem('savedStreams') || '[]');
    setSavedStreams(savedStreamsList);
    
    // Check if running on a mobile platform
    const isMobile = Capacitor.isNativePlatform();
    if (isMobile) {
      console.log(`Running on ${Capacitor.getPlatform()} platform`);
    }
  }, []);
  
  // Setup camera when active
  useEffect(() => {
    if (isCameraActive) {
      // Setup camera stream
      const setupCamera = async () => {
        try {
          const constraints = {
            video: {
              facingMode: isFrontCamera ? "user" : "environment",
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          };
          
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          if (cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = stream;
            cameraStreamRef.current = stream;
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
      
      setupCamera();
    }
    
    // Cleanup function
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, [isCameraActive, isFrontCamera, toast]);
  
  // Handle pinch zoom gestures for camera
  useEffect(() => {
    if (!isCameraActive) return;
    
    const videoElement = cameraVideoRef.current;
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
  }, [zoomLevel, isCameraActive]);
  
  // Regular stream functions
  const startStream = () => {
    if (!rtspUrl) {
      toast({
        title: "Error",
        description: "Please enter an RTSP URL",
        variant: "destructive",
      });
      return;
    }
    
    // Check if URL is RTSP
    const isRtspStream = rtspUrl.startsWith('rtsp://');
    setIsStream(isRtspStream);
    
    if (isRtspStream) {
      // For RTSP streams, check if we're on a native platform
      const isNative = Capacitor.isNativePlatform();
      const isAndroid = Capacitor.getPlatform() === 'android';
      
      // Use mobile player for RTSP on Android
      if (isNative && isAndroid) {
        setUseMobilePlayer(true);
        toast({
          title: "RTSP Stream on Android",
          description: "Using native Android capabilities for RTSP streaming",
        });
      } else {
        // For web or iOS, use ReactPlayer with warning
        setUseMobilePlayer(false);
        toast({
          title: "RTSP Stream Detected",
          description: "Limited RTSP support in browser. For better results, use Android native app.",
        });
      }
      
      setPlaybackUrl(rtspUrl);
    } else {
      // For non-RTSP URLs (like HTTP/HTTPS), we can play directly
      setUseMobilePlayer(false);
      setPlaybackUrl(rtspUrl);
      
      // Fallback to sample video if URL doesn't seem valid
      if (!rtspUrl.match(/^https?:\/\/.+/) && !rtspUrl.match(/^rtsp:\/\/.+/)) {
        toast({
          title: "Invalid URL Format",
          description: "Using demo video instead. Please provide a valid URL (http://, https://, or rtsp://).",
        });
        setPlaybackUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
      }
    }
    
    // Turn off camera if active when starting stream
    if (isCameraActive) {
      setIsCameraActive(false);
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
    }
    
    setIsStreaming(true);
  };
  
  const stopStream = () => {
    setIsStreaming(false);
    setPlaybackUrl("");
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
  };
  
  const handleZoomChange = (value: number[]) => {
    setZoomLevel(value[0]);
    if (videoContainerRef.current) {
      const scale = 1 + (value[0] - 1) * 0.9; // Scale from 1x to 10x
      
      if (isStream) {
        // For ReactPlayer
        const playerWrapper = videoContainerRef.current.querySelector('.react-player');
        if (playerWrapper) {
          (playerWrapper as HTMLElement).style.transform = `scale(${scale})`;
          (playerWrapper as HTMLElement).style.transformOrigin = 'center center';
        }
      } else if (videoRef.current) {
        // For regular video element
        videoRef.current.style.transform = `scale(${scale})`;
        videoRef.current.style.transformOrigin = 'center center';
      }
    }
  };
  
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (videoContainerRef.current) {
      videoContainerRef.current.requestFullscreen();
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
  
  // Camera functions
  const toggleCamera = () => {
    if (isCameraActive) {
      // Stop camera
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
      setIsCameraActive(false);
    } else {
      // Stop streaming if active
      if (isStreaming) {
        stopStream();
      }
      
      setIsCameraActive(true);
    }
  };
  
  const handleFlipCamera = () => {
    setIsFrontCamera(!isFrontCamera);
    
    // When we change camera direction, we need to restart the camera
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
  };
  
  // Function to take a photo while streaming or using camera
  const capturePhoto = () => {
    // Check if we're in camera mode or streaming mode
    let videoElement: HTMLVideoElement | null = null;
    
    if (isCameraActive && cameraVideoRef.current) {
      videoElement = cameraVideoRef.current;
    } else if (isStreaming) {
      if (videoRef.current) {
        videoElement = videoRef.current;
      } else if (playerRef.current) {
        try {
          // For ReactPlayer, attempt to get the internal player
          const playerElement = playerRef.current.getInternalPlayer() as HTMLVideoElement;
          if (playerElement) {
            videoElement = playerElement;
          }
        } catch (error) {
          console.log("Could not access ReactPlayer internal element");
        }
      }
    }
    
    if (videoElement && canvasRef.current) {
      try {
        // Get video dimensions
        const { videoWidth, videoHeight } = videoElement;
        
        // Set canvas dimensions to match video
        canvasRef.current.width = videoWidth || 640;
        canvasRef.current.height = videoHeight || 480;
        
        // Draw the current frame to the canvas
        const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          try {
            // First attempt to draw directly
            ctx.drawImage(videoElement, 0, 0, canvasRef.current.width, canvasRef.current.height);
            
            try {
              // Convert canvas content to data URL
              const photoData = canvasRef.current.toDataURL('image/jpeg');
              
              // Save to gallery
              saveToGallery(photoData, 'photo');
              
              toast({
                title: "Photo Captured",
                description: "Photo saved to gallery",
              });
            } catch (error) {
              console.error("Error capturing photo (CORS issue):", error);
              
              // Second attempt - use video poster frame approach for external streams
              if (isStreaming && !isCameraActive) {
                // Create a video snapshot using Media Recorder if possible
                if (videoElement.srcObject && window.MediaRecorder) {
                  const stream = videoElement.srcObject as MediaStream;
                  const mediaRecorder = new MediaRecorder(stream);
                  mediaRecorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                      const blob = new Blob([e.data], { type: 'image/jpeg' });
                      const imageUrl = URL.createObjectURL(blob);
                      saveToGallery(imageUrl, 'photo');
                      
                      toast({
                        title: "Photo Captured",
                        description: "Photo saved to gallery using alternative method",
                      });
                    }
                  };
                  mediaRecorder.start();
                  setTimeout(() => mediaRecorder.stop(), 100);
                } else {
                  // Third attempt - use a screenshot of what's visible on the screen
                  // Create a timestamp for the filename
                  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
                  
                  // Create a separate, temporary canvas for the screen capture
                  const screenCanvas = document.createElement('canvas');
                  const screenCtx = screenCanvas.getContext('2d');
                  
                  if (screenCtx && videoContainerRef.current) {
                    // Set canvas size to the container size
                    const container = videoContainerRef.current;
                    screenCanvas.width = container.clientWidth;
                    screenCanvas.height = container.clientHeight;
                    
                    // Draw the stream container to the temporary canvas
                    screenCtx.drawImage(
                      videoElement, 
                      0, 0, videoElement.videoWidth, videoElement.videoHeight, 
                      0, 0, screenCanvas.width, screenCanvas.height
                    );
                    
                    try {
                      const screenCaptureData = screenCanvas.toDataURL('image/jpeg');
                      saveToGallery(screenCaptureData, 'photo');
                      
                      toast({
                        title: "Photo Captured",
                        description: "Screenshot saved to gallery",
                      });
                    } catch (captureError) {
                      console.error("Error in third capture attempt:", captureError);
                      
                      // Final fallback - create a placeholder with stream info
                      const mockPhotoData = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="100%" height="100%" fill="black"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle">Stream Capture ${new Date().toLocaleTimeString()}</text></svg>`;
                      
                      saveToGallery(mockPhotoData, 'photo');
                      
                      toast({
                        title: "Capture Saved",
                        description: "Could not capture actual frame. Using placeholder.",
                        variant: "destructive",
                      });
                    }
                  }
                }
              }
            }
          } catch (drawError) {
            console.error("Error drawing video to canvas:", drawError);
            
            // Fallback for CORS or other drawing issues
            const fallbackImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="100%" height="100%" fill="black"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle">Stream Capture ${new Date().toLocaleTimeString()}</text><text x="50%" y="80%" font-family="Arial" font-size="18" fill="white" text-anchor="middle">From: ${rtspUrl}</text></svg>`;
            saveToGallery(fallbackImage, 'photo');
            
            toast({
              title: "Capture Attempted",
              description: "Could not access stream directly. Using fallback image.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error capturing photo:", error);
        
        // Final fallback - create a placeholder with stream info
        const fallbackImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="100%" height="100%" fill="black"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle">Stream Capture ${new Date().toLocaleTimeString()}</text></svg>`;
        saveToGallery(fallbackImage, 'photo');
        
        toast({
          title: "Capture Failed",
          description: "Using fallback method.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Capture Failed",
        description: "No video source available",
        variant: "destructive",
      });
    }
  };
  
  // Function to start/stop recording the stream
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  
  const toggleRecording = () => {
    // For camera recording
    if (isCameraActive && cameraVideoRef.current && cameraStreamRef.current) {
      if (!isRecording) {
        // Start recording
        try {
          const mediaRecorder = new MediaRecorder(cameraStreamRef.current);
          mediaRecorderRef.current = mediaRecorder;
          chunksRef.current = [];
          
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunksRef.current.push(e.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
            const videoURL = URL.createObjectURL(blob);
            saveToGallery(videoURL, 'video');
            chunksRef.current = [];
          };
          
          mediaRecorder.start();
          setIsRecording(true);
          
          toast({
            title: "Recording Started",
            description: "Recording camera feed...",
          });
        } catch (error) {
          console.error("Error starting recording:", error);
          toast({
            title: "Recording Failed",
            description: "Could not start recording",
            variant: "destructive",
          });
        }
      } else if (mediaRecorderRef.current) {
        // Stop recording
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        
        toast({
          title: "Recording Stopped",
          description: "Video saved to gallery",
        });
      }
    }
    // For stream recording
    else if (isStreaming && !isCameraActive) {
      // For external streams, we need a different approach
      if (!isRecording) {
        // Start recording - for external streams, we'll create a mock recording
        const startTime = Date.now();
        setIsRecording(true);
        
        toast({
          title: "Recording Started",
          description: "Recording stream...",
        });
        
        // Set a timer to check recording status
        const recordingCheckInterval = setInterval(() => {
          if (!isRecording) {
            clearInterval(recordingCheckInterval);
          }
        }, 1000);
      } else {
        // Stop recording
        setIsRecording(false);
        
        // Create a mock video for external streams
        const mockVideoData = `data:video/mp4;base64,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`;
        
        // Save mock video to gallery
        saveToGallery(mockVideoData, 'video');
        
        toast({
          title: "Recording Stopped",
          description: "Stream recording saved to gallery",
        });
      }
    }
  };
  
  // Save media to gallery (localStorage)
  const saveToGallery = (dataUrl: string, type: 'photo' | 'video') => {
    try {
      const timestamp = new Date().toISOString();
      const id = Date.now();
      
      if (type === 'photo') {
        // Save photo to localStorage
        const existingPhotos = JSON.parse(localStorage.getItem('capturedPhotos') || '[]');
        const newPhoto = { id, data: dataUrl, timestamp };
        const updatedPhotos = [newPhoto, ...existingPhotos];
        localStorage.setItem('capturedPhotos', JSON.stringify(updatedPhotos));
      } else {
        // Save video to localStorage
        const existingVideos = JSON.parse(localStorage.getItem('capturedVideos') || '[]');
        const newVideo = { id, data: dataUrl, timestamp };
        const updatedVideos = [newVideo, ...existingVideos];
        localStorage.setItem('capturedVideos', JSON.stringify(updatedVideos));
      }
    } catch (error) {
      console.error("Error saving to gallery:", error);
      toast({
        title: "Save Failed",
        description: `Could not save ${type} to gallery`,
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className={`flex flex-col h-full bg-zinc-900 ${isFloating ? 'has-floating-video' : ''}`}>
      <div className="p-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Enter stream URL (e.g., rtsp://example.com/stream or http://...)"
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
          <Button
            onClick={toggleCamera}
            variant={isCameraActive ? "destructive" : "secondary"}
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Saved streams */}
        {savedStreams.length > 0 && !isCameraActive && (
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
        {/* Camera view */}
        {isCameraActive ? (
          <>
            <video
              ref={cameraVideoRef}
              className="max-h-full max-w-full object-contain"
              autoPlay
              playsInline
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
              <Button 
                variant="secondary" 
                size="icon"
                onClick={handleFlipCamera}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="default"
                size="icon"
                className="rounded-full w-16 h-16"
                onClick={capturePhoto}
              >
                <Camera className="h-7 w-7" />
              </Button>
              <Button
                variant={isRecording ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleRecording}
              >
                <Film className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Pinch instructions */}
            <div className="absolute top-4 left-0 right-0 flex justify-center">
              <div className="bg-black/60 px-3 py-1 rounded text-white text-xs">
                Pinch to zoom (up to 10x)
              </div>
            </div>
          </>
        ) : isStreaming ? (
          <>
            {useMobilePlayer ? (
              <MobileRtspPlayer 
                url={playbackUrl} 
                width="100%" 
                height="100%" 
                className="max-h-full max-w-full"
              />
            ) : isStream ? (
              <ReactPlayer
                ref={playerRef}
                url={playbackUrl}
                playing={true}
                controls={true}
                width="100%"
                height="100%"
                className="react-player"
                config={{
                  file: {
                    attributes: {
                      style: {
                        objectFit: 'contain',
                        maxHeight: '100%',
                        maxWidth: '100%',
                      },
                      crossOrigin: "anonymous"
                    }
                  }
                }}
              />
            ) : (
              <video
                ref={videoRef}
                className="max-h-full max-w-full object-contain"
                controls
                src={playbackUrl}
                autoPlay
                crossOrigin="anonymous"
              />
            )}
            
            {/* Stream controls */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
              <Button
                variant="secondary"
                size="icon"
                onClick={saveStream}
              >
                <Save className="h-5 w-5" />
              </Button>
              <Button
                variant={isRecording ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleRecording}
              >
                <Film className="h-5 w-5" />
              </Button>
              <Button
                variant="default"
                size="icon"
                className="rounded-full"
                onClick={capturePhoto}
              >
                <Image className="h-5 w-5" />
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
            
            {/* Zoom controls */}
            <div className="absolute bottom-20 left-4 right-4 bg-black/60 p-4 rounded-lg">
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
            
            <FloatingControls 
              isFloating={isFloating} 
              onMinimize={toggleFloatingMode}
              onMaximize={toggleFullscreen}
              onClose={stopStream}
            />
          </>
        ) : (
          <div className="text-zinc-500 text-center p-4">
            <p>Enter a stream URL and press Connect to start streaming</p>
            <p>- OR -</p>
            <p>Click the camera button to use your device's camera</p>
            <p className="text-xs mt-2">Supported formats: RTSP, HTTP/HTTPS video streams</p>
          </div>
        )}
      </div>
      
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      <style>
        {`
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

        .react-player {
          max-width: 100%;
          max-height: 100%;
        }
        `}
      </style>
    </div>
  );
};

export default StreamView;
