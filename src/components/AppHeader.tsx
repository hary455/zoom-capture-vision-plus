
import React from "react";
import { Button } from "@/components/ui/button";
import { Settings, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const AppHeader = () => {
  const { toast } = useToast();
  
  const handleInfoClick = () => {
    toast({
      title: "ZoomCapture Vision+",
      description: "A feature-rich camera app with streaming capabilities. Developed with Lovable.",
    });
  };
  
  return (
    <header className="px-4 py-3 bg-zinc-800 flex items-center justify-between">
      <h1 className="text-lg font-bold text-white">ZoomCapture Vision+</h1>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={handleInfoClick}>
          <Info className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
