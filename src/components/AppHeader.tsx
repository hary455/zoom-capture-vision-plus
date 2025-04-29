
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const AppHeader = () => {
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [preferredCamera, setPreferredCamera] = useState("back");
  const [saveLocation, setSaveLocation] = useState("internal");
  const [videoQuality, setVideoQuality] = useState("720p");
  const [audioQuality, setAudioQuality] = useState("high");
  const [maxVideoLength, setMaxVideoLength] = useState([60]); // 60 seconds
  
  const handleInfoClick = () => {
    toast({
      title: "ZoomCapture Vision+",
      description: "A feature-rich camera app with streaming capabilities. Developed with Lovable.",
    });
  };
  
  const saveSettings = () => {
    // Save settings to localStorage
    const settings = {
      darkMode,
      preferredCamera,
      saveLocation,
      videoQuality,
      audioQuality,
      maxVideoLength: maxVideoLength[0]
    };
    
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    toast({
      title: "Settings Saved",
      description: "Your preferences have been saved.",
    });
    
    setShowSettings(false);
  };
  
  // Load settings on component mount
  React.useEffect(() => {
    const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    
    if (savedSettings.darkMode !== undefined) setDarkMode(savedSettings.darkMode);
    if (savedSettings.preferredCamera) setPreferredCamera(savedSettings.preferredCamera);
    if (savedSettings.saveLocation) setSaveLocation(savedSettings.saveLocation);
    if (savedSettings.videoQuality) setVideoQuality(savedSettings.videoQuality);
    if (savedSettings.audioQuality) setAudioQuality(savedSettings.audioQuality);
    if (savedSettings.maxVideoLength) setMaxVideoLength([savedSettings.maxVideoLength]);
  }, []);
  
  return (
    <header className="px-4 py-3 bg-zinc-800 flex items-center justify-between">
      <h1 className="text-lg font-bold text-white">ZoomCapture Vision+</h1>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={handleInfoClick}>
          <Info className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
          <Settings className="h-5 w-5" />
        </Button>
      </div>
      
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your ZoomCapture Vision+ preferences
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <Switch 
                id="dark-mode" 
                checked={darkMode} 
                onCheckedChange={setDarkMode}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="preferred-camera">Preferred Camera</Label>
              <Select 
                value={preferredCamera} 
                onValueChange={setPreferredCamera}
              >
                <SelectTrigger id="preferred-camera">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="front">Front Camera</SelectItem>
                  <SelectItem value="back">Back Camera</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="save-location">Save Location</Label>
              <Select 
                value={saveLocation} 
                onValueChange={setSaveLocation}
              >
                <SelectTrigger id="save-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal Storage</SelectItem>
                  <SelectItem value="sdcard">SD Card</SelectItem>
                  <SelectItem value="cloud">Cloud Storage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="video-quality">Video Quality</Label>
              <Select 
                value={videoQuality} 
                onValueChange={setVideoQuality}
              >
                <SelectTrigger id="video-quality">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="480p">480p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="4k">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="audio-quality">Audio Quality</Label>
              <Select 
                value={audioQuality} 
                onValueChange={setAudioQuality}
              >
                <SelectTrigger id="audio-quality">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <div className="flex justify-between">
                <Label htmlFor="max-video-length">Max Video Length (seconds)</Label>
                <span>{maxVideoLength[0]}s</span>
              </div>
              <Slider 
                id="max-video-length"
                min={10} 
                max={300} 
                step={10} 
                value={maxVideoLength}
                onValueChange={setMaxVideoLength}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default AppHeader;
