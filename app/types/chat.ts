export interface Message {
  id: string;
  content: string;
  sender: string;
  pfpUrl: string;
  timestamp: Date;
  attester: string;
  attestationId?: string;
}
