
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { applyFilterToVideo, processLiveStream, videoFilters } from "@/utils/ffmpeg-utils";
import { Film, Save, Play, Pause, Disc, WifiOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface FFmpegProcessingProps {
  stream?: MediaStream | null;
  videoBlob?: Blob | null;
  onProcessedVideo?: (blob: Blob) => void;
}

const FFmpegProcessing: React.FC<FFmpegProcessingProps> = ({ 
  stream, 
  videoBlob,
  onProcessedVideo 
}) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [isLiveProcessing, setIsLiveProcessing] = useState(false);
  const [liveProcessController, setLiveProcessController] = useState<{ stop: () => void } | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // Monitor online/offline status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Apply filter to a video blob
  const handleApplyFilter = async () => {
    if (!videoBlob || !selectedFilter) return;
    
    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "Internet connection is required to load FFmpeg",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      setProgress(0);
      
      const filter = videoFilters[selectedFilter as keyof typeof videoFilters];
      if (!filter) throw new Error("Invalid filter selected");
      
      // Process the video with the selected filter
      const processedBlob = await applyFilterToVideo(videoBlob, filter);
      
      if (onProcessedVideo) {
        onProcessedVideo(processedBlob);
      }
      
      toast({
        title: "Filter Applied",
        description: `Successfully applied ${selectedFilter} filter to video`,
      });
    } catch (error) {
      console.error("Error applying filter:", error);
      toast({
        title: "Processing Failed",
        description: "Failed to apply filter to video",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };
  
  // Start live stream processing
  const startLiveProcessing = async () => {
    if (!stream) return;
    
    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "Internet connection is required to load FFmpeg",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLiveProcessing(true);
      
      // Use async/await properly to handle the Promise
      const controller = await processLiveStream(
        stream,
        'mp4',
        3000, // Process 3-second chunks
        (processedBlob) => {
          if (onProcessedVideo) {
            onProcessedVideo(processedBlob);
          }
        }
      );
      
      // Now controller is the resolved value, not a Promise
      setLiveProcessController(controller);
      
      toast({
        title: "Live Processing Started",
        description: "FFmpeg is now processing the stream in real-time",
      });
    } catch (error) {
      console.error("Error starting live processing:", error);
      setIsLiveProcessing(false);
      toast({
        title: "Processing Failed",
        description: "Could not start live stream processing",
        variant: "destructive",
      });
    }
  };
  
  // Stop live stream processing
  const stopLiveProcessing = () => {
    if (liveProcessController) {
      liveProcessController.stop();
      setLiveProcessController(null);
    }
    setIsLiveProcessing(false);
    toast({
      title: "Processing Stopped",
      description: "FFmpeg live stream processing has been stopped",
    });
  };
  
  return (
    <div className="p-4 bg-zinc-800 rounded-lg">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Disc className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-medium">FFmpeg Processing</h3>
        </div>
        
        {!isOnline && (
          <div className="bg-red-900/20 border border-red-800 rounded p-2 flex items-center space-x-2">
            <WifiOff className="h-4 w-4 text-red-400" />
            <span className="text-red-400 text-sm">Offline - FFmpeg features unavailable</span>
          </div>
        )}
        
        {/* Filter Selection */}
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={selectedFilter}
            onValueChange={setSelectedFilter}
            disabled={isProcessing || isLiveProcessing || !isOnline}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select filter" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(videoFilters).map(filter => (
                <SelectItem key={filter} value={filter}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {videoBlob && (
            <Button 
              variant="default" 
              onClick={handleApplyFilter}
              disabled={isProcessing || !selectedFilter || isLiveProcessing || !isOnline}
            >
              <Film className="mr-2 h-4 w-4" />
              Apply Filter
            </Button>
          )}
        </div>
        
        {/* Live Processing Controls */}
        {stream && (
          <div className="flex space-x-2">
            {!isLiveProcessing ? (
              <Button 
                variant="default" 
                className="w-full"
                onClick={startLiveProcessing}
                disabled={isProcessing || !isOnline}
              >
                <Play className="mr-2 h-4 w-4" />
                Start Live Processing
              </Button>
            ) : (
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={stopLiveProcessing}
              >
                <Pause className="mr-2 h-4 w-4" />
                Stop Processing
              </Button>
            )}
          </div>
        )}
        
        {/* Progress Indicator */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Processing video...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>
    </div>
  );
};

export default FFmpegProcessing;
