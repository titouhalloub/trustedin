export interface Experience {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  description?: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field_of_study?: string | null;
  start_date: string;
  end_date?: string | null;
}

export interface Skill {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  trust_score: number;
  reputation_points: number;
  verification_level: string;
  created_at: string;
  avatar_url: string | null;
  banner_url: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  github_username: string | null;
  interests?: string[];
  connections_count?: number;
  activity_score?: number;
  followers_count?: number;
  following_count?: number;
  experiences?: Experience[];
  education?: Education[];
  skills?: Skill[];
  role?: string | null;
  credits?: number;
}

export interface ParticipantProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface Conversation {
  id: number;
  other_participant: ParticipantProfile;
  last_message?: { content: string; sender_id: string; };
  last_message_at?: string;
}

export interface Post {
  id: number;
  author_id: string;
  content: string;
  created_at: string;
  type: string;
  likes: number;
  comments: number;
  shares: number;
  hasImage: boolean;
  timestamp: string;
  media_urls?: string[];
  user_has_liked: boolean;
  author: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    verification_level: string;
  } | null;
  post_comments: {
    id: number;
    content: string;
    created_at: string;
    media_url?: string | null;
    media_type?: 'image' | 'video' | null;
    profiles: { username: string; avatar_url: string | null };
  }[];
}

export interface Follow {
  id: number;
  follower_id: string;
  following_id: string;
}

export interface Connection {
  id: number;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
}


export interface Candidate {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  trust_score: number;
  reputation_points: number;
}

export interface Job {
  id: number;
  title: string;
  application_method: 'url' | 'email' | 'platform';
  application_contact: string | null;
  location: string | null;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  description: string | null;
  benefits: string | null;
  responsibilities: string | null;
  requirements: string | null;
  created_at: string;
  seniority_level: string;
  salary_type: string;
  application_deadline?: string | null;
}

export interface JobWithProfile extends Job {
  profiles: { full_name: string | null };
  job_applications: { candidate_id: string }[];
}

export type PapoEngine = 'legacy' | 'heyputer' | 'v0';
export type PapoVisibility = 'public' | 'unlisted' | 'private';

export type PapoMetadata = {
  headline?: string;
  description?: string;
  tags?: string[];
  category?: string;
};

export type Papo = {
  id: string;
  user_id: string;
  slug: string | null;
  title: string | null;
  prompt_used: string | null;
  ai_generated_content: any;
  edited_content: any;
  thumbnail_url: string | null;
  preview_image_url: string | null;
  engagement_metrics: { likes?: number; comments?: number; views?: number } | null;
  likes: number;
  metadata: PapoMetadata | null;
  engine: PapoEngine;
  external_url: string | null;
  external_project_id: string | null;
  visibility: PapoVisibility;
  last_synced_at: string | null;
  created_at: string;
  author?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

