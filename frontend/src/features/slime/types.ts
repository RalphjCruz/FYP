export interface SlimeData {
  id: number;
  name: string;
  level: number;
  experience: number;
  color: string;
  evolutionStage: number;
  user: {
    id: number;
    username: string;
    email: string;
  };
}
