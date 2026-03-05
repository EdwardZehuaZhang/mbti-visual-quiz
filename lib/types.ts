export interface PersonalityState {
  signals: { EI: number; SN: number; TF: number; JP: number }
  confidence: { EI: number; SN: number; TF: number; JP: number }
  choices: Array<{
    imageUrl: string
    scene: string
    axis: string
    interpretation: string
  }>
  turn: number
}

export interface SceneResponse {
  scene: string
  pinterestQuery: string
  axis: 'EI' | 'SN' | 'TF' | 'JP'
  intent: string
}

export interface ImageItem {
  url: string
  id: string
  alt: string
  thumbUrl: string
}

export interface InterpretResponse {
  state: PersonalityState
  interpretation: string
  done: boolean
}

export interface ResultsResponse {
  type: string
  narrative: string
  traits: string[]
}

export type MBTIAxis = 'EI' | 'SN' | 'TF' | 'JP'
