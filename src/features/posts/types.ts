export interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  user?: {
    uid: string;
    fullName?: string;
    username?: string;
    avatarUrl?: string;
  };
  likes_count: number;
  comments_count: number;
  is_liked_by_me: boolean;
  comments?: PostComment[];
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  user?: {
    fullName?: string;
    username?: string;
    avatarUrl?: string;
  };
}
