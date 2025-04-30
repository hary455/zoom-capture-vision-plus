
import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Video, Trash2, Share2, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface MediaItem {
  id: number;
  data: string;
  timestamp: string;
  type: 'photo' | 'video';
}

const GalleryView = () => {
  const { toast } = useToast();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const videoThumbnailsRef = useRef<Map<number, string>>(new Map());
  
  const loadMedia = () => {
    // Load photos from localStorage
    const photos = JSON.parse(localStorage.getItem('capturedPhotos') || '[]').map(
      (photo: any) => ({ ...photo, type: 'photo' })
    );
    
    // Load videos from localStorage
    const videos = JSON.parse(localStorage.getItem('capturedVideos') || '[]').map(
      (video: any) => ({ ...video, type: 'video' })
    );
    
    // Combine and sort by timestamp (newest first)
    const allMedia = [...photos, ...videos].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    setMediaItems(allMedia);

    // Generate thumbnails for videos
    videos.forEach((video: MediaItem) => {
      generateVideoThumbnail(video);
    });
  };

  // Function to generate thumbnails from videos
  const generateVideoThumbnail = (videoItem: MediaItem) => {
    if (videoThumbnailsRef.current.has(videoItem.id)) {
      return; // Already generated thumbnail
    }

    try {
      // Create temporary video element
      const video = document.createElement('video');
      video.src = videoItem.data;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.preload = "metadata";
      
      // When video metadata is loaded, seek to an appropriate position
      video.onloadedmetadata = () => {
        // Seek to 25% of the video duration to get a representative frame
        const seekTime = video.duration * 0.25;
        video.currentTime = isNaN(seekTime) ? 1 : seekTime;
      };

      // When seeking is complete, capture the frame
      video.onseeked = () => {
        try {
          // Create a canvas to draw the video frame
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // Set canvas dimensions to video dimensions
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 180;
            
            // Draw the video frame on the canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert to data URL
            const thumbnailUrl = canvas.toDataURL('image/jpeg');
            
            // Store the thumbnail
            videoThumbnailsRef.current.set(videoItem.id, thumbnailUrl);
            
            // Force a re-render to display the thumbnails
            setMediaItems(prevItems => [...prevItems]);
          }
        } catch (error) {
          console.error("Error creating thumbnail canvas:", error);
        } finally {
          // Clean up
          video.pause();
          video.src = "";
          video.load();
        }
      };

      // Handle errors
      video.onerror = () => {
        console.error("Error loading video for thumbnail generation");
      };

      // Start loading the video
      video.load();
    } catch (error) {
      console.error("Error generating video thumbnail:", error);
    }
  };
  
  useEffect(() => {
    loadMedia();
  }, []);
  
  const handleShareMedia = () => {
    if (!selectedItem) return;
    
    // Web Share API if supported
    if (navigator.share) {
      const shareData = {
        title: `ZoomCapture ${selectedItem.type === 'photo' ? 'Photo' : 'Video'}`,
        text: `Shared from ZoomCapture Vision+`,
        // In a real app, we'd have a proper URL to the media
      };
      
      navigator.share(shareData)
        .then(() => {
          toast({
            title: "Shared",
            description: `${selectedItem.type === 'photo' ? 'Photo' : 'Video'} shared successfully.`,
          });
        })
        .catch((error) => {
          console.error("Error sharing:", error);
          toast({
            title: "Share failed",
            description: "Could not share the media.",
            variant: "destructive",
          });
        });
    } else {
      // Fallback for browsers that don't support the Web Share API
      toast({
        title: "Share not supported",
        description: "Your browser doesn't support sharing.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteMedia = () => {
    if (!selectedItem) return;
    
    setShowDeleteDialog(true);
  };
  
  const confirmDelete = () => {
    if (!selectedItem) return;
    
    try {
      if (selectedItem.type === 'photo') {
        const photos = JSON.parse(localStorage.getItem('capturedPhotos') || '[]');
        const updatedPhotos = photos.filter((photo: any) => photo.id !== selectedItem.id);
        localStorage.setItem('capturedPhotos', JSON.stringify(updatedPhotos));
      } else {
        const videos = JSON.parse(localStorage.getItem('capturedVideos') || '[]');
        const updatedVideos = videos.filter((video: any) => video.id !== selectedItem.id);
        localStorage.setItem('capturedVideos', JSON.stringify(updatedVideos));
        
        // Remove thumbnail from cache
        videoThumbnailsRef.current.delete(selectedItem.id);
      }
      
      setShowDeleteDialog(false);
      setSelectedItem(null);
      loadMedia();
      
      toast({
        title: "Deleted",
        description: `${selectedItem.type === 'photo' ? 'Photo' : 'Video'} deleted successfully.`,
      });
    } catch (error) {
      console.error("Error deleting media:", error);
      toast({
        title: "Delete failed",
        description: "Could not delete the media.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {selectedItem ? (
        <div className="flex flex-col h-full">
          <div className="p-4 flex justify-between items-center">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back
              </Button>
            </div>
            <div className="text-sm text-zinc-400">
              {new Date(selectedItem.timestamp).toLocaleString()}
            </div>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={handleShareMedia}>
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDeleteMedia}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center bg-black">
            {selectedItem.type === 'photo' ? (
              <img 
                src={selectedItem.data} 
                alt="Captured photo" 
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <video 
                src={selectedItem.data} 
                controls 
                className="max-h-full max-w-full"
                autoPlay
                controlsList="nodownload"
                playsInline
              />
            )}
          </div>
        </div>
      ) : (
        <Tabs defaultValue="photos" className="flex flex-col h-full">
          <div className="px-4 pt-2">
            <TabsList className="w-full">
              <TabsTrigger value="photos" className="flex-1">
                <Image className="mr-2 h-4 w-4" />
                Photos
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex-1">
                <Video className="mr-2 h-4 w-4" />
                Videos
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="photos" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-3 gap-1 p-1">
                {mediaItems
                  .filter(item => item.type === 'photo')
                  .map(photo => (
                    <div 
                      key={photo.id}
                      className="aspect-square cursor-pointer"
                      onClick={() => setSelectedItem(photo)}
                    >
                      <img 
                        src={photo.data} 
                        alt={`Photo ${photo.id}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                
                {mediaItems.filter(item => item.type === 'photo').length === 0 && (
                  <div className="col-span-3 py-10 text-center text-zinc-400">
                    No photos captured yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="videos" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-3 gap-1 p-1">
                {mediaItems
                  .filter(item => item.type === 'video')
                  .map(video => (
                    <div 
                      key={video.id}
                      className="aspect-square relative cursor-pointer"
                      onClick={() => setSelectedItem(video)}
                    >
                      {videoThumbnailsRef.current.has(video.id) ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={videoThumbnailsRef.current.get(video.id)} 
                            alt={`Video thumbnail ${video.id}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/60 rounded-full p-1">
                            <Video className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <Video className="h-8 w-8 text-zinc-400" />
                          <div className="absolute bottom-1 right-1">
                            <Video className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                
                {mediaItems.filter(item => item.type === 'video').length === 0 && (
                  <div className="col-span-3 py-10 text-center text-zinc-400">
                    No videos recorded yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {selectedItem?.type}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryView;
