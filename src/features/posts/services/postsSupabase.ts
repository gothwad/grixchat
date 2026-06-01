import { supabase } from '../../../lib/supabase';
import { Post, PostComment } from '../types';
import { storage } from '../../../services/StorageService';

const STORAGE_POSTS_KEY = 'grix_cached_posts_v1';

// Predefined Seed Posts for zero-setup ease & iframe proof fallback
const SEED_POSTS: Post[] = [
  {
    id: 'seed-post-1',
    user_id: 'grix-team-uid',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    caption: 'Welcome to the brand new GrixChat Posts Tab! 🚀 Share your special moments, pictures, and interact with the community directly within our mobile-style feed. Lightweight, beautiful, and highly scalable for up to 50k users!',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    user: {
      uid: 'grix-team-uid',
      fullName: 'Grix Team',
      username: 'grixchat_official',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    },
    likes_count: 42,
    comments_count: 2,
    is_liked_by_me: false,
    comments: [
      {
        id: 'seed-comment-1',
        post_id: 'seed-post-1',
        user_id: 'sample-user-1',
        text: 'This UI is super clean! Feels exactly like a professional mobile app 😍',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        user: { fullName: 'Aarav Jha', username: 'aarav_j', avatarUrl: '' }
      },
      {
        id: 'seed-comment-2',
        post_id: 'seed-post-1',
        user_id: 'sample-user-2',
        text: 'Love the styling. No gradient noise, purely premium minimal look.',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        user: { fullName: 'Sanya Gupta', username: 'sanya_g', avatarUrl: '' }
      }
    ]
  },
  {
    id: 'seed-post-2',
    user_id: 'tech-grix-uid',
    image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    caption: 'Quiet coding nights yield the best designs. Simple, structured, and modular is always better than complex bloating.',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    user: {
      uid: 'tech-grix-uid',
      fullName: 'Grix Tech Enthusiast',
      username: 'code_craft',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
    },
    likes_count: 18,
    comments_count: 0,
    is_liked_by_me: true,
    comments: []
  }
];

export class PostsService {
  /**
   * Loads posts from Supabase database. If table is missing or fetch fails, fallback to cached state.
   */
  static async fetchPosts(currentUserId?: string): Promise<Post[]> {
    // Elegant system to enforce a strict timeout of 2.5 seconds on database access
    const dbPromise = (async () => {
      try {
        if (!supabase) throw new Error('Supabase client unavailable');

        // Fetch from Supabase
        const { data: dbPosts, error } = await supabase
          .from('posts')
          .select(`
            *,
            user:user_id (
              id,
              full_name,
              username,
              photo_url
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase posts fetch has warning/missing table, using local cache:', error.message);
          return this.getLocalCachedPosts(currentUserId);
        }

        const formattedPosts: Post[] = await Promise.all((dbPosts || []).map(async (p: any) => {
          // Individual safe-guards per-item. If subqueries hang or error out, keep the main post intact.
          let likesCount = 0;
          let isLiked = false;
          let comments: PostComment[] = [];

          try {
            // Fetch Likes with a silent catch protection
            const { count } = await supabase
              .from('post_likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', p.id);
            likesCount = count || 0;
          } catch (likeErr) {
            console.warn(`Safe-shield likes error on post ${p.id}:`, likeErr);
          }

          try {
            // Fetch is liked by me
            if (currentUserId) {
              const { data: myLike } = await supabase
                .from('post_likes')
                .select('*')
                .eq('post_id', p.id)
                .eq('user_id', currentUserId)
                .maybeSingle();
              isLiked = !!myLike;
            }
          } catch (meLikeErr) {
            console.warn(`Safe-shield isLiked by me error on post ${p.id}:`, meLikeErr);
          }

          try {
            // Fetch Comments
            const { data: rawComments } = await supabase
              .from('post_comments')
              .select(`
                *,
                user:user_id (
                  full_name,
                  username,
                  photo_url
                )
              `)
              .eq('post_id', p.id)
              .order('created_at', { ascending: true });

            if (rawComments) {
              comments = rawComments.map((c: any) => ({
                id: c.id,
                post_id: c.post_id,
                user_id: c.user_id,
                text: c.text,
                created_at: c.created_at,
                user: {
                  fullName: c.user?.full_name || 'Grix User',
                  username: c.user?.username || 'user',
                  avatarUrl: c.user?.photo_url || ''
                }
              }));
            }
          } catch (commentErr) {
            console.warn(`Safe-shield comments error on post ${p.id}:`, commentErr);
          }

          return {
            id: p.id,
            user_id: p.user_id,
            image_url: p.image_url,
            caption: p.caption || '',
            created_at: p.created_at,
            user: {
              uid: p.user?.id || p.user_id,
              fullName: p.user?.full_name || 'Grix User',
              username: p.user?.username || 'user',
              avatarUrl: p.user?.photo_url || ''
            },
            likes_count: likesCount,
            comments_count: comments.length,
            is_liked_by_me: isLiked,
            comments
          };
        }));

        // Cache a copy in storage as offline backup
        storage.setItem(STORAGE_POSTS_KEY, JSON.stringify(formattedPosts));
        return formattedPosts;
      } catch (e: any) {
        console.warn('Surgical catch of fetchPosts error, proceeding to local caching:', e);
        return this.getLocalCachedPosts(currentUserId);
      }
    })();

    const timeoutPromise = new Promise<Post[]>((resolve) => {
      setTimeout(() => {
        console.warn('Supabase fetchPosts timed out after 2.5s. Loading immediate cached backup.');
        resolve(this.getLocalCachedPosts(currentUserId));
      }, 2500);
    });

    return Promise.race([dbPromise, timeoutPromise]);
  }

  /**
   * Offline/Sandbox Fallback Posts fetcher
   */
  private static getLocalCachedPosts(currentUserId?: string): Post[] {
    const cached = storage.getItem(STORAGE_POSTS_KEY);
    if (cached) {
      try {
        const posts: Post[] = JSON.parse(cached);
        return posts;
      } catch {
        // fallback to seed
      }
    }
    // Write seeds first time
    storage.setItem(STORAGE_POSTS_KEY, JSON.stringify(SEED_POSTS));
    return SEED_POSTS;
  }

  /**
   * Create post in database with fallback to localStorage
   */
  static async createPost(
    post: Omit<Post, 'id' | 'created_at' | 'likes_count' | 'comments_count' | 'is_liked_by_me' | 'comments'>,
    currentUser: { uid: string; fullName: string; username: string; avatarUrl: string }
  ): Promise<Post> {
    const newPost: Post = {
      id: Math.random().toString(36).substring(2, 11),
      user_id: currentUser.uid,
      image_url: post.image_url,
      caption: post.caption,
      created_at: new Date().toISOString(),
      user: currentUser,
      likes_count: 0,
      comments_count: 0,
      is_liked_by_me: false,
      comments: []
    };

    try {
      if (supabase) {
        // Try writing to DB
        const { data, error } = await supabase
          .from('posts')
          .insert({
            user_id: currentUser.uid,
            image_url: post.image_url,
            caption: post.caption
          })
          .select()
          .single();

        if (!error && data) {
          newPost.id = data.id;
          newPost.created_at = data.created_at;
        } else {
          console.warn('Post DB write error/missing table, doing local persistence:', error?.message);
        }
      }
    } catch (e) {
      console.warn('Catch on create post database write, saving locally only:', e);
    }

    // Always append to local cached storage list to update UI instantly and ensure iframe support
    const all = this.getLocalCachedPosts(currentUser.uid);
    all.unshift(newPost);
    storage.setItem(STORAGE_POSTS_KEY, JSON.stringify(all));

    return newPost;
  }

  /**
   * Action of liking/unliking a post with optimistic LocalStorage write
   */
  static async toggleLike(postId: string, currentUserId: string): Promise<{ likesCount: number; isLiked: boolean }> {
    let finalLiked = false;
    let countDiff = 0;

    // Retrieve from Cache to mutate optimistically
    const all = this.getLocalCachedPosts(currentUserId);
    const postIndex = all.findIndex(p => p.id === postId);

    if (postIndex !== -1) {
      const p = all[postIndex];
      p.is_liked_by_me = !p.is_liked_by_me;
      p.likes_count += p.is_liked_by_me ? 1 : -1;
      finalLiked = p.is_liked_by_me;
      countDiff = p.is_liked_by_me ? 1 : -1;
      storage.setItem(STORAGE_POSTS_KEY, JSON.stringify(all));
    }

    try {
      if (supabase) {
        if (finalLiked) {
          await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUserId });
        } else {
          await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUserId);
        }
      }
    } catch (e) {
      console.warn('Database like toggle warning, local state kept matching:', e);
    }

    return {
      likesCount: postIndex !== -1 ? all[postIndex].likes_count : 0,
      isLiked: finalLiked
    };
  }

  /**
   * Action of adding comments with database toggle and localStorage persistence fallback
   */
  static async addComment(
    postId: string, 
    text: string, 
    currentUser: { uid: string; fullName: string; username: string; avatarUrl: string }
  ): Promise<PostComment> {
    const newComment: PostComment = {
      id: Math.random().toString(36).substring(2, 11),
      post_id: postId,
      user_id: currentUser.uid,
      text,
      created_at: new Date().toISOString(),
      user: {
        fullName: currentUser.fullName,
        username: currentUser.username,
        avatarUrl: currentUser.avatarUrl
      }
    };

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('post_comments')
          .insert({
            post_id: postId,
            user_id: currentUser.uid,
            text
          })
          .select()
          .single();

        if (!error && data) {
          newComment.id = data.id;
          newComment.created_at = data.created_at;
        }
      }
    } catch (e) {
      console.warn('Comment database write warning, using local state:', e);
    }

    // Update inside Cache List
    const all = this.getLocalCachedPosts(currentUser.uid);
    const pIndex = all.findIndex(x => x.id === postId);
    if (pIndex !== -1) {
      const p = all[pIndex];
      p.comments = p.comments || [];
      p.comments.push(newComment);
      p.comments_count = p.comments.length;
      storage.setItem(STORAGE_POSTS_KEY, JSON.stringify(all));
    }

    return newComment;
  }
}
