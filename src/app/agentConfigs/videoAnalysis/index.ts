import { videoAnalysisAgent } from './videoAnalysisAgent';
import type { RealtimeAgent } from '@openai/agents/realtime';

export const videoAnalysisScenario: RealtimeAgent[] = [
  videoAnalysisAgent
];