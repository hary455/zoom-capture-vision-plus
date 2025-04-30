
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GalleryView from "@/components/GalleryView";
import StreamView from "@/components/StreamView";
import AppHeader from "@/components/AppHeader";

const Index = () => {
  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
      <AppHeader />
      
      <Tabs defaultValue="stream" className="flex-1 flex flex-col">
        <div className="px-4 py-2 border-b border-zinc-800">
          <TabsList className="w-full bg-zinc-800">
            <TabsTrigger value="stream" className="flex-1">Live Stream</TabsTrigger>
            <TabsTrigger value="gallery" className="flex-1">Gallery</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="stream" className="flex-1 p-0 m-0 data-[state=active]:flex flex-col">
          <StreamView />
        </TabsContent>
        
        <TabsContent value="gallery" className="flex-1 p-0 m-0 data-[state=active]:flex flex-col">
          <GalleryView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
