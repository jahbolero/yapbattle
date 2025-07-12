export interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  username: string;
  created_at: string;
  room_name: string;
  agent_response?: string;
}

export interface AgentResponse {
  id: string;
  message_id: string;
  agent_type: string;
  response: string;
  created_at: string;
}