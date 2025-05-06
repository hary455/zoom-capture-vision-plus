
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { toast } from "@/components/ui/use-toast";

// Create a singleton FFmpeg instance
let ffmpeg: FFmpeg | null = null;
let isLoadingFFmpeg = false;

export const getFFmpeg = async (): Promise<FFmpeg> => {
  // Return cached instance if available
  if (ffmpeg) return ffmpeg;
  
  // Prevent multiple simultaneous load attempts
  if (isLoadingFFmpeg) {
    throw new Error('FFmpeg is already being loaded');
  }
  
  isLoadingFFmpeg = true;
  
  try {
    // Create a new FFmpeg instance
    ffmpeg = new FFmpeg();
    
    // Try multiple sources for better reliability
    const cdnSources = [
      // Try local files first (these would be in the public folder)
      '/ffmpeg/ffmpeg-core.wasm',
      // Then try multiple CDNs
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm',
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm',
      'https://cdnjs.cloudflare.com/ajax/libs/ffmpeg/0.12.6/ffmpeg-core.wasm',
      // Add more fallback URLs if needed
    ];
    
    let loaded = false;
    let lastError = null;
    
    // Try each source until one succeeds
    for (const source of cdnSources) {
      try {
        console.log(`Attempting to load FFmpeg from: ${source}`);
        
        await ffmpeg.load({
          coreURL: await toBlobURL(source, 'application/wasm')
        });
        
        loaded = true;
        console.log('FFmpeg loaded successfully from:', source);
        toast({
          title: "FFmpeg Ready",
          description: "Successfully loaded video processing engine",
        });
        break;
      } catch (error) {
        console.error(`Failed to load FFmpeg from ${source}:`, error);
        lastError = error;
      }
    }
    
    if (!loaded) {
      throw lastError || new Error('Failed to load FFmpeg from all sources');
    }
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    toast({
      title: "FFmpeg Error",
      description: "Failed to load FFmpeg library. Check your internet connection or try again later.",
      variant: "destructive",
    });
    ffmpeg = null;
    isLoadingFFmpeg = false;
    throw error;
  }
  
  isLoadingFFmpeg = false;
  return ffmpeg;
};

export const convertVideoFormat = async (
  inputBlob: Blob,
  outputFormat: string = 'mp4',
  progressCallback?: (progress: number) => void
): Promise<Blob> => {
  try {
    const ffmpeg = await getFFmpeg();
    
    // Set up progress monitoring
    if (progressCallback) {
      ffmpeg.on('progress', ({ progress }) => {
        progressCallback(Math.floor(progress * 100));
      });
    }
    
    // Generate input and output file names
    const inputFileName = `input_${Date.now()}.${inputBlob.type.split('/')[1] || 'webm'}`;
    const outputFileName = `output_${Date.now()}.${outputFormat}`;
    
    // Write the input file to FFmpeg's virtual file system
    await ffmpeg.writeFile(inputFileName, await fetchFile(inputBlob));
    
    // Run FFmpeg command to convert the video
    await ffmpeg.exec([
      '-i', inputFileName,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-c:a', 'aac',
      outputFileName
    ]);
    
    // Read the converted file
    const outputData = await ffmpeg.readFile(outputFileName);
    
    // Convert the output data to a Blob
    const outputBlob = new Blob(
      [outputData], 
      { type: `video/${outputFormat}` }
    );
    
    // Clean up files from memory
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);
    
    return outputBlob;
  } catch (error) {
    console.error('FFmpeg conversion error:', error);
    toast({
      title: "Conversion Failed",
      description: "Failed to convert video format",
      variant: "destructive",
    });
    throw error;
  }
};

export const processLiveStream = async (
  stream: MediaStream,
  outputFormat: string = 'mp4',
  durationMs: number = 5000, // Default to 5 second chunks
  onChunkProcessed: (blob: Blob) => void
): Promise<{ stop: () => void }> => {
  try {
    // Create a MediaRecorder to capture stream data
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
    });
    
    // Process data when available
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0) {
        try {
          // Convert the chunk using FFmpeg
          const processedBlob = await convertVideoFormat(event.data, outputFormat);
          onChunkProcessed(processedBlob);
        } catch (error) {
          console.error('Error processing stream chunk:', error);
        }
      }
    };
    
    // Start recording in chunks
    mediaRecorder.start(durationMs);
    
    // Return controls to stop processing
    return {
      stop: () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }
    };
  } catch (error) {
    console.error('Error setting up live stream processing:', error);
    toast({
      title: "Stream Processing Error",
      description: "Failed to set up FFmpeg stream processing",
      variant: "destructive",
    });
    throw error;
  }
};

export const applyFilterToVideo = async (
  inputBlob: Blob,
  filter: string,
  outputFormat: string = 'mp4'
): Promise<Blob> => {
  try {
    const ffmpeg = await getFFmpeg();
    
    const inputFileName = `input_${Date.now()}.${inputBlob.type.split('/')[1] || 'webm'}`;
    const outputFileName = `output_${Date.now()}.${outputFormat}`;
    
    await ffmpeg.writeFile(inputFileName, await fetchFile(inputBlob));
    
    // Apply filter using FFmpeg's filter options
    await ffmpeg.exec([
      '-i', inputFileName,
      '-vf', filter,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      outputFileName
    ]);
    
    const outputData = await ffmpeg.readFile(outputFileName);
    const outputBlob = new Blob([outputData], { type: `video/${outputFormat}` });
    
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);
    
    return outputBlob;
  } catch (error) {
    console.error('Error applying filter:', error);
    toast({
      title: "Filter Error",
      description: "Failed to apply video filter",
      variant: "destructive",
    });
    throw error;
  }
};

// This is a placeholder function for RTSP handling
// Note: Browser security restrictions prevent direct RTSP access
// A server-side proxy would be required for production use
export const prepareRtspStream = async (rtspUrl: string): Promise<{ ready: boolean; message: string }> => {
  try {
    // Attempt to load FFmpeg first to check if it's available
    try {
      await getFFmpeg();
      console.log('FFmpeg loaded for RTSP handling');
    } catch (error) {
      console.error('FFmpeg loading failed for RTSP:', error);
      return { 
        ready: false, 
        message: "Unable to initialize FFmpeg. Check your internet connection or try again later." 
      };
    }
    
    // In a real implementation:
    // 1. We would use a server-side proxy to convert RTSP to HLS or WebRTC
    // 2. Or use a native Capacitor plugin for mobile devices
    
    console.log('RTSP URL prepared (placeholder):', rtspUrl);
    
    return { 
      ready: false, 
      message: "Browser RTSP support requires a server-side proxy. Use Android app for native support." 
    };
  } catch (error) {
    console.error('Error preparing RTSP stream:', error);
    return { 
      ready: false, 
      message: "Failed to initialize FFmpeg for RTSP handling" 
    };
  }
};

// Pre-defined filters that can be applied to videos
export const videoFilters = {
  grayscale: 'hue=s=0',
  sepia: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
  blur: 'gblur=sigma=3',
  sharpen: 'unsharp=5:5:1.5:5:5:0',
  edge: 'edgedetect',
  negative: 'negate',
  vignette: 'vignette=PI/4',
};
