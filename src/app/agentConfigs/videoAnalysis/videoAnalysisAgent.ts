import { tool, type RealtimeAgent, type FunctionTool } from '../types';

const analyzeVideo: FunctionTool = tool({
  name: 'analyzeVideo',
  description: 'Analyze a video URL for speech transcription and scene descriptions',
  parameters: {
    type: 'object',
    properties: {
      videoUrl: {
        type: 'string',
        description: 'The URL of the video to analyze'
      },
      analysisType: {
        type: 'string',
        enum: ['full', 'transcript', 'scenes', 'comparison'],
        description: 'Type of analysis to perform'
      }
    },
    required: ['videoUrl']
  },
  async execute(params: { videoUrl: string; analysisType?: string }) {
    const { videoUrl, analysisType = 'full' } = params;

    try {
      // Start analysis
      const startResponse = await fetch('/api/video-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_input: videoUrl,
          transcribe_model: 'gpt-4o-mini-transcribe',
          vision_model: 'gpt-4o-mini',
          frame_sample_rate: 1.0
        })
      });

      const { session_id, status } = await startResponse.json();

      if (!session_id) {
        return { error: 'Failed to start analysis' };
      }

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max wait

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(`/api/video-analysis?sessionId=${session_id}`);
        const statusData = await statusResponse.json();

        if (statusData.status === 'completed') {
          return {
            success: true,
            sessionId: session_id,
            analysis: statusData.data
          };
        } else if (statusData.status === 'error') {
          return { error: statusData.error || 'Analysis failed' };
        }

        attempts++;
      }

      return { error: 'Analysis timeout' };
    } catch (error) {
      return { error: `Analysis error: ${error}` };
    }
  }
});

const getTranscript: FunctionTool = tool({
  name: 'getTranscript',
  description: 'Get the transcript from a video analysis session',
  parameters: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'The analysis session ID'
      },
      timestamp: {
        type: 'number',
        description: 'Optional timestamp to get specific transcript segment'
      }
    },
    required: ['sessionId']
  },
  async execute(params: { sessionId: string; timestamp?: number }) {
    const { sessionId, timestamp } = params;

    try {
      let url = `/api/video-analysis?sessionId=${sessionId}&action=transcript`;
      if (timestamp !== undefined) {
        url += `&timestamp=${timestamp}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      return {
        success: true,
        transcript: data
      };
    } catch (error) {
      return { error: `Failed to get transcript: ${error}` };
    }
  }
});

const getSceneDescription: FunctionTool = tool({
  name: 'getSceneDescription',
  description: 'Get scene descriptions from a video analysis session',
  parameters: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'The analysis session ID'
      },
      timestamp: {
        type: 'number',
        description: 'Optional timestamp to get specific scene'
      }
    },
    required: ['sessionId']
  },
  async execute(params: { sessionId: string; timestamp?: number }) {
    const { sessionId, timestamp } = params;

    try {
      let url = `/api/video-analysis?sessionId=${sessionId}&action=scenes`;
      if (timestamp !== undefined) {
        url += `&timestamp=${timestamp}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      return {
        success: true,
        scenes: data
      };
    } catch (error) {
      return { error: `Failed to get scenes: ${error}` };
    }
  }
});

const compareAudioVisual: FunctionTool = tool({
  name: 'compareAudioVisual',
  description: 'Get comparison between audio and visual content',
  parameters: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'The analysis session ID'
      }
    },
    required: ['sessionId']
  },
  async execute(params: { sessionId: string }) {
    const { sessionId } = params;

    try {
      const response = await fetch(`/api/video-analysis?sessionId=${sessionId}&action=comparison`);
      const data = await response.json();

      return {
        success: true,
        comparison: data
      };
    } catch (error) {
      return { error: `Failed to get comparison: ${error}` };
    }
  }
});

const searchVideoContent: FunctionTool = tool({
  name: 'searchVideoContent',
  description: 'Search for content in video transcript and scenes',
  parameters: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'The analysis session ID'
      },
      query: {
        type: 'string',
        description: 'Search query'
      }
    },
    required: ['sessionId', 'query']
  },
  async execute(params: { sessionId: string; query: string }) {
    const { sessionId, query } = params;

    try {
      const response = await fetch(
        `/api/video-analysis?sessionId=${sessionId}&action=search&query=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      return {
        success: true,
        results: data
      };
    } catch (error) {
      return { error: `Search failed: ${error}` };
    }
  }
});

const processVoiceCommand: FunctionTool = tool({
  name: 'processVoiceCommand',
  description: 'Process voice commands for video control',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Voice command text (e.g., "pause", "stop", "describe the scene")'
      },
      sessionId: {
        type: 'string',
        description: 'Optional session ID for context'
      }
    },
    required: ['command']
  },
  async execute(params: { command: string; sessionId?: string }) {
    const { command, sessionId } = params;

    // Process command locally first
    const commandLower = command.toLowerCase();

    // Check for direct playback commands
    if (commandLower.includes('play') || commandLower.includes('resume')) {
      return { action: 'play', message: 'Playing video' };
    } else if (commandLower.includes('pause')) {
      return { action: 'pause', message: 'Video paused' };
    } else if (commandLower.includes('stop')) {
      return { action: 'stop', message: 'Video stopped' };
    } else if (commandLower.includes('describe')) {
      if (sessionId) {
        // Get current scene description
        const response = await getSceneDescription.execute({ sessionId });
        return { action: 'describe', data: response };
      }
      return { action: 'describe', message: 'No active session' };
    } else if (commandLower.includes('transcript') || commandLower.includes('transcribe')) {
      if (sessionId) {
        // Get transcript
        const response = await getTranscript.execute({ sessionId });
        return { action: 'transcript', data: response };
      }
      return { action: 'transcript', message: 'No active session' };
    }

    return { error: 'Command not recognized' };
  }
});

export const videoAnalysisAgent: RealtimeAgent = {
  name: 'Video Analysis Assistant',
  description: 'Analyzes videos for speech transcription, scene descriptions, and audio-visual comparison',
  instructions: `You are a video analysis assistant that can:
1. Analyze videos from URLs to extract speech transcription and scene descriptions
2. Compare audio content with visual content to find correlations and discrepancies
3. Search for specific content within analyzed videos
4. Process voice commands for video playback control (play, pause, stop)
5. Describe what's happening in the video at any given moment

When a user provides a video URL:
- Start the analysis process
- Provide updates on the analysis progress
- Once complete, summarize the key findings
- Be ready to answer questions about the video content

For voice commands:
- Respond to playback controls (play, pause, stop)
- Describe scenes when asked
- Show transcripts on request
- Search for specific content when requested

Always be helpful and provide clear, concise responses about the video content.`,
  tools: [
    analyzeVideo,
    getTranscript,
    getSceneDescription,
    compareAudioVisual,
    searchVideoContent,
    processVoiceCommand
  ]
};