'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import BottomNavigation from '@/components/dashboard/BottomNavigation';

interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
  post_count: number;
}

interface Post {
  id: string;
  content: string;
  category_id: string;
  category_name: string;
  user_id: string;
  user_name: string;
  user_type: string;
  created_at: string;
  like_count: number;
  reply_count: number;
}

export default function ForumPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClientComponentClient();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Debug authentication state
  useEffect(() => {
    console.log('Auth state:', { user: user?.id, authLoading });
  }, [user, authLoading]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/forum/categories');
      const json = await res.json();
      setCategories(json.categories || []);
    } catch (error) {
      setCategories([]);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let url = '/api/forum/posts';
      if (selectedCategory) {
        url += `?category_id=${selectedCategory}`;
      }
      console.log('Fetching posts from:', url);
      const res = await fetch(url);
      const json = await res.json();
      console.log('Posts response:', json);
      setPosts(json.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!selectedCategory) {
      setError('Please select a category first');
      return;
    }

    if (!newPostContent.trim()) {
      setError('Please enter some content');
      return;
    }

    if (newPostContent.length > 280) {
      setError('Content must be 280 characters or less');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newPostContent.trim(),
          category_id: selectedCategory,
          user_id: user?.id, // Send the user ID from frontend
        }),
      });

      const json = await res.json();
      console.log('Post creation response:', json);

      if (!res.ok) {
        throw new Error(json.error || 'Failed to create post');
      }

      // Reset form
      setNewPostContent('');
      
      // Refresh posts
      console.log('Refreshing posts...');
      await fetchPosts();
    } catch (error: any) {
      if (error.message?.includes('Authentication failed') || error.message?.includes('Please log in')) {
        setError('Please log in to create posts. You may need to refresh the page.');
      } else {
        setError(error.message || 'Failed to create post');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryName = categories.find(cat => cat.id === selectedCategory)?.name;

  return (
    <div className="min-h-screen bg-gradient-main">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Back Navigation */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => {
              // Check if we can go back in history
              if (window.history.length > 1) {
                router.back();
              } else {
                // Fallback to dashboard
                router.push('/dashboard/matchmakr');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <div></div> {/* Spacer for centering */}
        </div>

        <div className="bg-white/10 rounded-lg shadow-sm p-6 mb-6 border border-white/20">
          <h1 className="text-3xl font-bold text-white">The Green Room</h1>
          <p className="text-white/80">Share ideas and connect with GreenLight's very first users! The Dev Team is listening and needs your input! Help us grow this thing.</p>
        </div>

        {/* Categories as pinned threads */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`px-3 py-1.5 rounded-full border text-sm font-medium shadow-sm transition-colors ${selectedCategory === cat.id ? 'bg-blue-500/30 text-white border-blue-400/50' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
          {selectedCategory && (
            <button
              className="px-3 py-1.5 rounded-full border text-sm font-medium bg-white/10 text-white border-white/30 hover:bg-white/20"
              onClick={() => setSelectedCategory(null)}
            >
              Show All
            </button>
          )}
        </div>

        {/* New Post Form */}
        {selectedCategory && user && (
          <div className="mb-6 bg-white/10 rounded-lg shadow-sm p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">
              New Post in {selectedCategoryName}
            </h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                <p className="mb-2">{error}</p>
                {error.includes('log in') && (
                  <div className="flex space-x-2 text-sm">
                    <a href="/login" className="text-blue-600 underline">Log In</a>
                    <button
                      onClick={async () => {
                        // Clear all cookies that might be corrupted
                        document.cookie.split(';').forEach(function(c) {
                          const eqPos = c.indexOf('=');
                          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
                          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                        });
                        await supabase.auth.signOut();
                        window.location.reload();
                      }}
                      className="text-red-600 underline"
                    >
                      Clear Session
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full p-3 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white/10 text-white placeholder-white/60"
                rows={4}
                maxLength={280}
              />
              <div className="text-sm text-white/60 mt-1 text-right">
                {newPostContent.length}/280 characters
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCreatePost}
                disabled={submitting || !newPostContent.trim()}
                className="bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        )}
        
        {/* Login prompt if not authenticated */}
        {selectedCategory && !user && !authLoading && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
            <p className="text-yellow-200 mb-2">
              Please log in to create posts.
            </p>
            <div className="flex space-x-2">
              <a href="/login" className="text-blue-300 underline font-semibold">Log In</a>
              <button
                onClick={async () => {
                  // Clear all cookies that might be corrupted
                  document.cookie.split(';').forEach(function(c) {
                    const eqPos = c.indexOf('=');
                    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                  });
                  await supabase.auth.signOut();
                  window.location.reload();
                }}
                className="text-red-300 underline font-semibold"
              >
                Clear Session
              </button>
            </div>
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300 mx-auto"></div>
              <p className="mt-2 text-white/80">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/80">No posts yet in this category.</p>
              {selectedCategory && (
                <p className="text-sm text-white/60 mt-1">Be the first to start a conversation!</p>
              )}
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white/10 rounded-lg shadow-sm p-6 border border-white/20">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
                      <span className="text-blue-200 font-semibold">
                        {post.user_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-white">{post.user_name}</div>
                      <div className="text-sm text-white/60">
                        {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-white/60">
                    {post.user_type}
                  </div>
                </div>
                <div className="text-white/90 leading-relaxed">{post.content}</div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
                  <button className="flex items-center gap-1 text-white/60 hover:text-blue-300 text-sm">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M14 9V5a3 3 0 0 0-6 0v4" />
                      <rect x="2" y="9" width="20" height="12" rx="2" ry="2" />
                    </svg>
                    Like ({post.like_count})
                  </button>
                  <button className="flex items-center gap-1 text-white/60 hover:text-blue-300 text-sm">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Reply ({post.reply_count})
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      {user && <BottomNavigation userId={user.id} />}
    </div>
  );
} 