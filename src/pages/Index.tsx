
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CameraView from "@/components/CameraView";
import GalleryView from "@/components/GalleryView";
import StreamView from "@/components/StreamView";
import AppHeader from "@/components/AppHeader";

const Index = () => {
  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
      <AppHeader />
      
      <Tabs defaultValue="camera" className="flex-1 flex flex-col">
        <div className="px-4 py-2 border-b border-zinc-800">
          <TabsList className="w-full bg-zinc-800">
            <TabsTrigger value="camera" className="flex-1">Camera</TabsTrigger>
            <TabsTrigger value="gallery" className="flex-1">Gallery</TabsTrigger>
            <TabsTrigger value="stream" className="flex-1">Stream</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="camera" className="flex-1 p-0 m-0 data-[state=active]:flex flex-col">
          <CameraView />
        </TabsContent>
        
        <TabsContent value="gallery" className="flex-1 p-0 m-0 data-[state=active]:flex flex-col">
          <GalleryView />
        </TabsContent>
        
        <TabsContent value="stream" className="flex-1 p-0 m-0 data-[state=active]:flex flex-col">
          <StreamView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
