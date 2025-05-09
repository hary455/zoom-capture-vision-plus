import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, Maximize, ZoomIn, ZoomOut, Save, X, Camera, Film, Image, Disc } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Slider } from "@/components/ui/slider";
import FloatingControls from "./FloatingControls";
import ReactPlayer from "react-player";
import { Capacitor } from '@capacitor/core';
import MobileRtspPlayer from "./MobileRtspPlayer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FFmpegProcessing from "./FFmpegProcessing";
import { getFFmpeg } from "@/utils/ffmpeg-utils";

const StreamView = () => {
  const { toast } = useToast();
  const [rtspUrl, setRtspUrl] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFloating, setIsFloating] = useState(false);
  const [isExternalFloat, setIsExternalFloat] = useState(false);
  const [savedStreams, setSavedStreams] = useState<{name: string, url: string}[]>([]);
  const [isStream, setIsStream] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [useMobilePlayer, setUseMobilePlayer] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<ReactPlayer | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const externalWindowRef = useRef<Window | null>(null);
  
  // FFmpeg state
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [showFFmpegControls, setShowFFmpegControls] = useState(false);
  const [processedVideoBlob, setProcessedVideoBlob] = useState<Blob | null>(null);
  const processedVideoRef = useRef<HTMLVideoElement | null>(null);
  
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
  
  // Try to preload FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        await getFFmpeg();
        setFfmpegLoaded(true);
        console.log("FFmpeg preloaded successfully");
      } catch (error) {
        console.error("Failed to preload FFmpeg:", error);
      }
    };
    
    loadFFmpeg();
  }, []);
  
  useEffect(() => {
    // Load saved streams from localStorage
    const savedStreamsList = JSON.parse(localStorage.getItem('savedStreams') || '[]');
    setSavedStreams(savedStreamsList);
    
    // Handle window closing event for external floating window
    const handleBeforeUnload = () => {
      if (externalWindowRef.current) {
        externalWindowRef.current.close();
        externalWindowRef.current = null;
        setIsExternalFloat(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (externalWindowRef.current) {
        externalWindowRef.current.close();
        externalWindowRef.current = null;
      }
    };
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
    } else if (isFloating && !isExternalFloat) {
      // If currently in internal floating mode, toggle back to normal
      setIsFloating(false);
      if (videoContainerRef.current) {
        videoContainerRef.current.classList.remove("floating-video");
      }
    } else if (isExternalFloat) {
      // If currently in external floating mode, close the window and toggle back to normal
      if (externalWindowRef.current) {
        externalWindowRef.current.close();
        externalWindowRef.current = null;
      }
      setIsExternalFloat(false);
      setIsFloating(false);
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
  const recordingStreamRef = useRef<MediaStream | null>(null);
  
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
      if (!isRecording) {
        // Start recording the stream
        try {
          // Get the video element - either from ReactPlayer or direct video element
          let videoElement: HTMLVideoElement | null = null;
          
          if (playerRef.current) {
            try {
              // For ReactPlayer, attempt to get the internal player
              videoElement = playerRef.current.getInternalPlayer() as HTMLVideoElement;
            } catch (error) {
              console.log("Could not access ReactPlayer internal element:", error);
            }
          } else if (videoRef.current) {
            videoElement = videoRef.current;
          }
          
          if (videoElement && videoElement.captureStream) {
            // Check if captureStream is supported
            // Capture the stream from the video element
            const stream = videoElement.captureStream();
            recordingStreamRef.current = stream;
            
            // Create media recorder
            const mediaRecorder = new MediaRecorder(stream, {
              mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
            });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            
            mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                chunksRef.current.push(e.data);
              }
            };
            
            mediaRecorder.onstop = () => {
              const blob = new Blob(chunksRef.current, { 
                type: mediaRecorder.mimeType === 'video/webm' ? 'video/webm' : 'video/mp4' 
              });
              const videoURL = URL.createObjectURL(blob);
              
              // Convert blob to base64 for localStorage
              const reader = new FileReader();
              reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                  saveToGallery(reader.result, 'video');
                }
              };
              reader.readAsDataURL(blob);
              
              chunksRef.current = [];
              recordingStreamRef.current = null;
            };
            
            // Start recording with reasonable timeslices
            mediaRecorder.start(1000);
            setIsRecording(true);
            
            toast({
              title: "Recording Started",
              description: "Recording stream...",
            });
          } else {
            // Fallback for browsers without captureStream
            toast({
              title: "Recording not supported",
              description: "Your browser doesn't support recording this stream.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error starting stream recording:", error);
          toast({
            title: "Recording Failed",
            description: "Could not start recording stream",
            variant: "destructive",
          });
        }
      } else {
        // Stop recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        
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
  
  // Add the missing toggleExternalFloatingMode function
  const toggleExternalFloatingMode = () => {
    if (!isExternalFloat && isStreaming) {
      // Calculate window dimensions - make it a reasonable size
      const width = Math.min(640, window.innerWidth * 0.8);
      const height = Math.min(480, window.innerHeight * 0.8);
      
      // Open a new window with the current stream
      const newWindow = window.open(
        '', 
        'StreamWindow',
        `width=${width},height=${height},toolbar=no,menubar=no,location=no,status=no,resizable=yes`
      );
      
      if (newWindow) {
        // Set the reference to the new window
        externalWindowRef.current = newWindow;
        
        // Set the floating state
        setIsFloating(true);
        setIsExternalFloat(true);
        
        // Write content to the new window - a basic HTML page with video element
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Floating Stream</title>
            <style>
              body { margin: 0; padding: 0; overflow: hidden; background: #000; }
              .video-container { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; }
              video, iframe { max-width: 100%; max-height: 100%; }
              .controls { position: absolute; top: 10px; right: 10px; display: flex; }
              button { background: rgba(0,0,0,0.5); color: white; border: none; margin: 2px; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
              button:hover { background: rgba(0,0,0,0.7); }
            </style>
          </head>
          <body>
            <div class="video-container" id="video-container">
              ${isStream ? 
                `<iframe src="${playbackUrl}" frameborder="0" allowfullscreen></iframe>` :
                `<video src="${playbackUrl}" autoplay controls></video>`
              }
            </div>
            <div class="controls">
              <button id="close-btn">Close</button>
            </div>
            <script>
              document.getElementById('close-btn').addEventListener('click', function() {
                window.close();
              });
              window.addEventListener('beforeunload', function() {
                window.opener && window.opener.postMessage('windowClosed', '*');
              });
            </script>
          </body>
          </html>
        `);
        
        // Listen for messages from the child window
        const handleMessage = (event: MessageEvent) => {
          if (event.data === 'windowClosed') {
            externalWindowRef.current = null;
            setIsExternalFloat(false);
            setIsFloating(false);
          }
        };
        window.addEventListener('message', handleMessage);
        
        // Clean up event listener when the component unmounts
        return () => {
          window.removeEventListener('message', handleMessage);
        };
      } else {
        // If the window couldn't be opened (e.g., popup blocked)
        toast({
          title: "External Window Blocked",
          description: "Please allow popups for this site to use external floating mode.",
          variant: "destructive",
        });
      }
    } else if (isExternalFloat) {
      // If already in external floating mode, close the window
      if (externalWindowRef.current) {
        externalWindowRef.current.close();
        externalWindowRef.current = null;
      }
      setIsExternalFloat(false);
      setIsFloating(false);
    }
  };
  
  // Handle processed video
  const handleProcessedVideo = (blob: Blob) => {
    setProcessedVideoBlob(blob);
    
    // Create a URL for the processed video
    const url = URL.createObjectURL(blob);
    
    // If the processed video element exists, update its source
    if (processedVideoRef.current) {
      processedVideoRef.current.src = url;
      processedVideoRef.current.load();
    }
    
    toast({
      title: "Processing Complete",
      description: "Video has been processed with FFmpeg",
    });
  };
  
  // Download processed video
  const downloadProcessedVideo = () => {
    if (processedVideoBlob) {
      const url = URL.createObjectURL(processedVideoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  // Get current stream for FFmpeg processing
  const getCurrentStreamForProcessing = (): MediaStream | null => {
    if (isCameraActive && cameraStreamRef.current) {
      return cameraStreamRef.current;
    } else if (isStreaming && recordingStreamRef.current) {
      return recordingStreamRef.current;
    } else if (isStreaming && videoRef.current && videoRef.current.captureStream) {
      return videoRef.current.captureStream();
    }
    return null;
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
          {ffmpegLoaded && (
            <Button
              onClick={() => setShowFFmpegControls(!showFFmpegControls)}
              variant={showFFmpegControls ? "default" : "outline"}
            >
              <Disc className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* FFmpeg Controls */}
        {showFFmpegControls && (
          <div className="mt-4">
            <FFmpegProcessing 
              stream={getCurrentStreamForProcessing()}
              videoBlob={processedVideoBlob || (isRecording ? null : undefined)}
              onProcessedVideo={handleProcessedVideo}
            />
          </div>
        )}
        
        {/* Processed Video Preview */}
        {processedVideoBlob && (
          <div className="mt-4 p-4 bg-zinc-800 rounded-lg">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">Processed Output</h3>
            <div className="relative">
              <video 
                ref={processedVideoRef}
                className="w-full h-auto max-h-48 rounded" 
                controls
              />
              <div className="absolute bottom-2 right-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={downloadProcessedVideo}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}
        
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
                onClick={toggleExternalFloatingMode}
                title="Pop out stream"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleFloatingMode}
                title="Minimize stream"
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
              isExternalFloat={isExternalFloat}
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
