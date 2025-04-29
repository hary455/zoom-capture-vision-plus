
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Video } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MediaItem {
  id: number;
  data: string;
  timestamp: string;
  type: 'photo' | 'video';
}

const GalleryView = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  
  useEffect(() => {
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
  }, []);
  
  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {selectedItem ? (
        <div className="flex flex-col h-full">
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-lg font-medium">
              {new Date(selectedItem.timestamp).toLocaleString()}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
              Back to Gallery
            </Button>
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
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                        <Video className="h-8 w-8 text-zinc-400" />
                      </div>
                      <div className="absolute bottom-1 right-1">
                        <Video className="h-4 w-4 text-white" />
                      </div>
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
    </div>
  );
};

import { Button } from "@/components/ui/button";
export default GalleryView;
