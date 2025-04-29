
import React from "react";
import { Button } from "@/components/ui/button";
import { Minimize, Maximize, X } from "lucide-react";

interface FloatingControlsProps {
  isFloating: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

const FloatingControls = ({ isFloating, onMinimize, onMaximize, onClose }: FloatingControlsProps) => {
  if (!isFloating) return null;
  
  return (
    <div className="absolute top-0 right-0 bg-black/70 rounded-bl-lg overflow-hidden">
      <div className="flex">
        <Button variant="ghost" size="sm" className="h-8 w-8" onClick={onMinimize}>
          <Minimize className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8" onClick={onMaximize}>
          <Maximize className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default FloatingControls;
