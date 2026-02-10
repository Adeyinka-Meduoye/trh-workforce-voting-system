
export interface Organisation {
  name: string;
  description: string;
  url: string;
  bgImage: string;
}

export interface Winner {
  name: string;
  org: string;
  month: string;
  year: number;
  image: string;
}

export enum View {
  HOME = 'HOME',
  ABOUT = 'ABOUT',
  WINNERS = 'WINNERS'
}
