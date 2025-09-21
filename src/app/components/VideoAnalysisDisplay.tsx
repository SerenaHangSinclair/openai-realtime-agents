'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Tabs, Tab, LinearProgress, Chip, List, ListItem, ListItemText } from '@mui/material';

interface VideoAnalysisDisplayProps {
  sessionId?: string;
  onCommand?: (command: string) => void;
}

interface AnalysisData {
  status: string;
  transcript?: {
    full_text: string;
    segments: Array<{ start: number; end: number; text: string }>;
  };
  scenes?: {
    timeline: Array<{ start: number; end: number; description: string }>;
    summary: string;
  };
  comparison?: {
    overall_analysis: {
      average_match_score: number;
      coherence_level: string;
      key_insights: string[];
    };
    synchronized_moments: Array<{ timestamp: number; match_score: number }>;
    mismatched_moments: Array<{ timestamp: number; discrepancies: string[] }>;
  };
}

export function VideoAnalysisDisplay({ sessionId, onCommand }: VideoAnalysisDisplayProps) {
  const [tabValue, setTabValue] = useState(0);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchAnalysisData();
      const interval = setInterval(fetchAnalysisData, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  const fetchAnalysisData = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      // Fetch status
      const statusResponse = await fetch(`/api/video-analysis?sessionId=${sessionId}`);
      const statusData = await statusResponse.json();

      if (statusData.status === 'completed' && statusData.data) {
        setAnalysisData(statusData.data);
        setLoading(false);
        return;
      }

      // If not completed, fetch individual components
      const [transcriptRes, scenesRes, comparisonRes] = await Promise.all([
        fetch(`/api/video-analysis?sessionId=${sessionId}&action=transcript`),
        fetch(`/api/video-analysis?sessionId=${sessionId}&action=scenes`),
        fetch(`/api/video-analysis?sessionId=${sessionId}&action=comparison`)
      ]);

      const [transcript, scenes, comparison] = await Promise.all([
        transcriptRes.json(),
        scenesRes.json(),
        comparisonRes.json()
      ]);

      setAnalysisData({
        status: statusData.status,
        transcript,
        scenes,
        comparison
      });
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!sessionId) {
    return (
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="body1" color="text.secondary">
          No video analysis session active. Say "analyze video" followed by a URL to start.
        </Typography>
      </Paper>
    );
  }

  if (loading && !analysisData) {
    return (
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Analyzing Video...
        </Typography>
        <LinearProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Video Analysis Results
      </Typography>

      {analysisData?.status && (
        <Chip
          label={analysisData.status}
          color={analysisData.status === 'completed' ? 'success' : 'warning'}
          sx={{ mb: 2 }}
        />
      )}

      <Tabs value={tabValue} onChange={handleTabChange}>
        <Tab label="Transcript" />
        <Tab label="Scenes" />
        <Tab label="Comparison" />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {tabValue === 0 && analysisData?.transcript && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Speech Transcript
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
              {analysisData.transcript.segments?.map((segment, index) => (
                <Box key={index} sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    [{segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s]
                  </Typography>
                  <Typography variant="body2">
                    {segment.text}
                  </Typography>
                </Box>
              )) || (
                <Typography variant="body2">
                  {analysisData.transcript.full_text}
                </Typography>
              )}
            </Paper>
          </Box>
        )}

        {tabValue === 1 && analysisData?.scenes && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Scene Timeline
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
              {analysisData.scenes.timeline?.map((scene, index) => (
                <Box key={index} sx={{ mb: 2, pb: 1, borderBottom: '1px solid #eee' }}>
                  <Typography variant="caption" color="text.secondary">
                    [{scene.start}s - {scene.end}s]
                  </Typography>
                  <Typography variant="body2">
                    {scene.description}
                  </Typography>
                </Box>
              ))}
              {analysisData.scenes.summary && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Summary:</Typography>
                  <Typography variant="body2">{analysisData.scenes.summary}</Typography>
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {tabValue === 2 && analysisData?.comparison && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Audio-Visual Comparison
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              {analysisData.comparison.overall_analysis && (
                <Box>
                  <Typography variant="body2">
                    <strong>Coherence Level:</strong> {analysisData.comparison.overall_analysis.coherence_level}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Match Score:</strong> {(analysisData.comparison.overall_analysis.average_match_score * 100).toFixed(1)}%
                  </Typography>

                  {analysisData.comparison.overall_analysis.key_insights?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Key Insights:</Typography>
                      <List dense>
                        {analysisData.comparison.overall_analysis.key_insights.map((insight, idx) => (
                          <ListItem key={idx}>
                            <ListItemText primary={insight} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              )}

              {analysisData.comparison.mismatched_moments?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Discrepancies Found:</Typography>
                  <List dense>
                    {analysisData.comparison.mismatched_moments.slice(0, 5).map((moment, idx) => (
                      <ListItem key={idx}>
                        <ListItemText
                          primary={`At ${moment.timestamp.toFixed(1)}s`}
                          secondary={moment.discrepancies.join(', ')}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </Box>

      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label="Say 'pause' to pause" variant="outlined" size="small" />
        <Chip label="Say 'describe the scene' for description" variant="outlined" size="small" />
        <Chip label="Say 'show transcript' for text" variant="outlined" size="small" />
      </Box>
    </Paper>
  );
}