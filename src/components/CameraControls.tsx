
import React from "react";
import { Button } from "@/components/ui/button";
import { Camera, Video, RefreshCw, Zap, ZapOff } from "lucide-react";

interface CameraControlsProps {
  onTakePhoto: () => void;
  onRecordVideo: () => void;
  isRecording: boolean;
  onFlipCamera: () => void;
  onFlashToggle: () => void;
  flashMode: string;
}

const CameraControls = ({ 
  onTakePhoto, 
  onRecordVideo, 
  isRecording,
  onFlipCamera,
  onFlashToggle,
  flashMode
}: CameraControlsProps) => {
  return (
    <div className="p-4 bg-zinc-900 flex items-center justify-between">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onFlashToggle}
      >
        {flashMode === "on" ? (
          <Zap className="h-6 w-6 text-yellow-400" />
        ) : (
          <ZapOff className="h-6 w-6" />
        )}
      </Button>
      
      <div className="flex gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-14 w-14 rounded-full border-2"
          onClick={onTakePhoto}
        >
          <Camera className="h-6 w-6" />
        </Button>
        
        <Button 
          variant={isRecording ? "destructive" : "outline"}
          size="icon" 
          className="h-14 w-14 rounded-full border-2"
          onClick={onRecordVideo}
        >
          <Video className="h-6 w-6" />
          {isRecording && <div className="absolute w-3 h-3 bg-red-500 rounded-full animate-pulse top-1 right-1"></div>}
        </Button>
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onFlipCamera}
      >
        <RefreshCw className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default CameraControls;
