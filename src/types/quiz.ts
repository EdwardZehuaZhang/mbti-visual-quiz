export interface PersonalityState {
  signals: { EI: number; SN: number; TF: number; JP: number };
  confidence: { EI: number; SN: number; TF: number; JP: number };
  choices: Array<{
    scene: string;
    imageDescription: string;
    interpretation: string;
  }>;
  turn: number;
}

export interface SceneResponse {
  scene: string;
  imageQuery: string;
  axis: string;
  intent: string;
}

export interface ImageResult {
  id: string;
  url: string;
  description: string;
  alt: string;
}

export interface InterpretResponse {
  state: PersonalityState;
  interpretation: string;
}

export interface ResultsResponse {
  type: string;
  paragraph: string;
  traitBreakdown: {
    EI: { label: string; score: number };
    SN: { label: string; score: number };
    TF: { label: string; score: number };
    JP: { label: string; score: number };
  };
}

export function createInitialState(): PersonalityState {
  return {
    signals: { EI: 0, SN: 0, TF: 0, JP: 0 },
    confidence: { EI: 0, SN: 0, TF: 0, JP: 0 },
    choices: [],
    turn: 0,
  };
}

export function isQuizComplete(state: PersonalityState): boolean {
  const { confidence } = state;
  const allConfident =
    confidence.EI > 0.75 &&
    confidence.SN > 0.75 &&
    confidence.TF > 0.75 &&
    confidence.JP > 0.75;
  return allConfident || state.turn >= 15;
}
