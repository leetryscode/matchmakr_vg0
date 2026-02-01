'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  user_photos: string[] | null;
  parent_post_id: string | null;
  created_at: string;
  like_count: number;
  reply_count: number;
  author_id?: string;
  profiles?: {
    id: string;
    name: string;
    user_type: string;
    photos: string[] | null;
  };
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isDeleting: boolean;
}

function DeleteModal({ isOpen, onClose, onConfirm, title, message, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-red-400">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        
        <p className="text-white/80 mb-6 leading-relaxed">{message}</p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 text-white/60 hover:text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d`;
  }
}

// Helper function to format user type for display
function formatUserType(userType: string): string {
  if (userType === 'MATCHMAKR') {
    return 'SPONSOR';
  }
  return userType;
}

export default function ForumPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>('a5d6eff5-087b-47f1-b61d-28fd83324c24'); // Default to General Chatter
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentUserType, setCurrentUserType] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<Record<string, Post[]>>({});
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [deletingReply, setDeletingReply] = useState<string | null>(null);
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'post' | 'reply';
    id: string;
    parentPostId?: string;
  }>({
    isOpen: false,
    type: 'post',
    id: '',
  });

  const supabase = createClientComponentClient();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Debug authentication state
  useEffect(() => {
    console.log('Auth state:', { user: user?.id, authLoading });
  }, [user, authLoading]);

  // Fetch current user's profile and type
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!error && profile) {
          setCurrentUserProfile(profile);
          setCurrentUserType(profile.user_type || null);
        }
      }
    };
    fetchUserProfile();
  }, [user, supabase]);

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

  const handleCreateReply = async (parentPostId: string) => {
    if (!user || !replyContent.trim()) return;

    setSubmittingReply(true);
    setError('');

    try {
      const response = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent.trim(),
          parent_post_id: parentPostId,
          user_id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reply');
      }

      // Refresh replies for this post
      await fetchReplies(parentPostId);
      setReplyContent('');
      setReplyingTo(null);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmittingReply(false);
    }
  };

  const fetchReplies = async (postId: string) => {
    try {
      console.log('Fetching replies for post:', postId);
      const response = await fetch(`/api/forum/posts/${postId}/replies`);
      const data = await response.json();
      console.log('Replies response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch replies');
      }

      setReplies(prev => ({
        ...prev,
        [postId]: data.replies || []
      }));
      console.log('Updated replies state for post:', postId, data.replies);
    } catch (error: any) {
      console.error('Error fetching replies:', error);
    }
  };

  const toggleReplies = async (postId: string) => {
    console.log('Toggle replies called for post:', postId);
    console.log('Current expanded replies:', Array.from(expandedReplies));
    console.log('Current replies state:', replies);
    
    if (expandedReplies.has(postId)) {
      console.log('Hiding replies for post:', postId);
      setExpandedReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } else {
      console.log('Showing replies for post:', postId);
      setExpandedReplies(prev => new Set(prev).add(postId));
      if (!replies[postId]) {
        console.log('Fetching replies for post:', postId);
        await fetchReplies(postId);
      } else {
        console.log('Replies already loaded for post:', postId);
      }
    }
  };

  const openDeleteModal = (type: 'post' | 'reply', id: string, parentPostId?: string) => {
    setDeleteModal({
      isOpen: true,
      type,
      id,
      parentPostId,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      type: 'post',
      id: '',
    });
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) {
      return;
    }

    console.log('Attempting to delete post:', postId);
    setDeletingPost(postId);
    try {
      const deleteUrl = `/api/forum-delete/${postId}`;
      console.log('Making POST request to:', deleteUrl);
      const response = await fetch(deleteUrl, {
        method: 'POST',
      });

      const data = await response.json();
      console.log('Delete response:', { status: response.status, data });
      console.log('Response data details:', {
        message: data.message,
        timestamp: data.timestamp,
        route: data.route,
        postId: data.postId
      });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete post');
      }

      console.log('Post deleted successfully, refreshing posts...');
      // Remove the post from local state immediately
      setPosts(prevPosts => {
        const filteredPosts = prevPosts.filter(post => post.id !== postId);
        console.log('Local state update:', { 
          beforeCount: prevPosts.length, 
          afterCount: filteredPosts.length,
          removedPostId: postId 
        });
        return filteredPosts;
      });
      // Also refresh from server to ensure consistency
      await fetchPosts();
    } catch (error: any) {
      console.error('Delete error:', error);
      setError(error.message);
    } finally {
      setDeletingPost(null);
      closeDeleteModal();
    }
  };

  const handleDeleteReply = async (replyId: string, parentPostId: string) => {
    if (!user) {
      return;
    }

    console.log('Attempting to delete reply:', replyId);
    setDeletingReply(replyId);
    try {
      const deleteUrl = `/api/forum-delete/${replyId}`;
      console.log('Making POST request to:', deleteUrl);
      const response = await fetch(deleteUrl, {
        method: 'POST',
      });

      const data = await response.json();
      console.log('Delete reply response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete reply');
      }

      console.log('Reply deleted successfully, refreshing replies...');
      // Remove the reply from local state immediately
      setReplies(prevReplies => ({
        ...prevReplies,
        [parentPostId]: prevReplies[parentPostId]?.filter(reply => reply.id !== replyId) || []
      }));
      // Also refresh from server to ensure consistency
      await fetchReplies(parentPostId);
    } catch (error: any) {
      console.error('Delete reply error:', error);
      setError(error.message);
    } finally {
      setDeletingReply(null);
      closeDeleteModal();
    }
  };

  const confirmDelete = () => {
    if (deleteModal.type === 'post') {
      handleDeletePost(deleteModal.id);
    } else {
      handleDeleteReply(deleteModal.id, deleteModal.parentPostId!);
    }
  };

  const handleReplyClick = async (postId: string) => {
    // If replies aren't expanded, expand them first
    if (!expandedReplies.has(postId)) {
      setExpandedReplies(prev => new Set(prev).add(postId));
      if (!replies[postId]) {
        await fetchReplies(postId);
      }
    }
    // Then open the reply form
    setReplyingTo(replyingTo === postId ? null : postId);
  };

  const selectedCategoryName = categories.find(cat => cat.id === selectedCategory)?.name;

  return (
    <div className="min-h-screen bg-background-main">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push('/dashboard/matchmakr');
              }
            }}
            className="flex items-center gap-2 px-3 py-2 text-text-light hover:text-text-dark transition-colors"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="text-center">
            <h1 className="text-xl font-light text-text-dark tracking-[0.1em] uppercase font-brand">THE GREEN ROOM</h1>
            <p className="text-sm text-text-light mt-1">Help us build this platform by sharing your thoughts. The Dev Team is listening!</p>
          </div>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                selectedCategory === cat.id 
                  ? 'bg-background-card border-border-light text-text-dark ring-2 ring-primary-blue/50' 
                  : 'bg-background-card text-text-dark border-border-light hover:bg-background-card/90'
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
          {selectedCategory && (
            <button
              className="px-3 py-1.5 rounded-lg border text-sm font-medium bg-background-card text-text-dark border-border-light hover:bg-background-card/90"
              onClick={() => setSelectedCategory(null)}
            >
              Show All
            </button>
          )}
        </div>

        {/* New Post Form - Twitter Style */}
        {selectedCategory && user && (
          <div className="mb-6 bg-background-card rounded-xl shadow-card p-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Post to the Green Room"
                  className="w-full bg-transparent text-text-dark placeholder-text-light resize-none border-none outline-none text-lg"
                  rows={1}
                  maxLength={280}
                />
                <div className="flex items-center justify-between mt-4 pt-4">
                  <div className="text-sm text-text-light">
                    {newPostContent.length}/280
                  </div>
                  <button
                    onClick={handleCreatePost}
                    disabled={submitting || !newPostContent.trim()}
                    className="rounded-cta min-h-[44px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-primary px-6 py-2 border-0"
                  >
                    {submitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="mt-3 p-3 bg-red-500/20 border border-red-400/30 text-red-200 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}
        
        {/* Login prompt if not authenticated */}
        {selectedCategory && !user && !authLoading && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
            <p className="text-yellow-200 mb-2 text-sm">
              Please log in to create posts.
            </p>
            <div className="flex space-x-2">
              <a href="/login" className="text-primary-blue-light underline font-semibold text-sm">Log In</a>
            </div>
          </div>
        )}

        {/* Posts List - Twitter Style */}
        <div className="space-y-0">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue-light mx-auto"></div>
              <p className="mt-2 text-text-light">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-dark">No posts yet in this category.</p>
              {selectedCategory && (
                <p className="text-sm text-text-light mt-1">Be the first to start a conversation!</p>
              )}
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="p-4 hover:bg-background-card/50 transition-colors">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border-light bg-background-card flex-shrink-0">
                    {post.user_photos && post.user_photos.length > 0 ? (
                      <img 
                        src={post.user_photos[0]} 
                        alt={post.user_name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-text-dark">
                        {post.user_name?.charAt(0).toUpperCase() || ''}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-text-dark text-sm">
                        {currentUserType === 'MATCHMAKR' ? (
                          <Link 
                            href={`/profile/${post.user_id}`}
                            className="hover:underline"
                          >
                            {post.user_name}
                          </Link>
                        ) : (
                          post.user_name
                        )}
                      </span>
                      <span className="text-text-light text-sm">·</span>
                      <span className="text-text-light text-sm">{formatRelativeTime(post.created_at)}</span>
                      <span className="text-text-light text-sm">·</span>
                      <span className="text-text-light text-sm">{formatUserType(post.user_type)}</span>
                    </div>
                    <div className="text-text-dark text-sm leading-relaxed mb-3">{post.content}</div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center justify-between max-w-md">
                      <button className="flex items-center gap-2 text-text-light hover:text-primary-blue text-sm transition-colors">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M14 9V5a3 3 0 0 0-6 0v4" />
                          <rect x="2" y="9" width="20" height="12" rx="2" ry="2" />
                        </svg>
                        {post.like_count}
                      </button>
                      <button 
                        onClick={() => handleReplyClick(post.id)}
                        className="flex items-center gap-2 text-text-light hover:text-primary-blue text-sm transition-colors"
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {post.reply_count}
                      </button>
                      {post.reply_count > 0 && (
                        <button 
                          onClick={() => toggleReplies(post.id)}
                          className="flex items-center gap-2 text-text-light hover:text-primary-blue text-sm transition-colors"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M7 8l4-4 4 4M7 16l4 4 4-4" />
                          </svg>
                          {expandedReplies.has(post.id) ? 'Hide' : 'Show'}
                        </button>
                      )}
                      {user && post.user_id === user.id && (
                        <button 
                          onClick={() => openDeleteModal('post', post.id)}
                          disabled={deletingPost === post.id}
                          className="flex items-center gap-2 text-text-light hover:text-red-400 text-sm transition-colors disabled:opacity-50"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Reply Form */}
                    {replyingTo === post.id && user && (
                      <div className="mt-6 pt-6">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Post your reply"
                              className="w-full bg-transparent text-text-dark placeholder-text-light resize-none border-none outline-none text-sm"
                              rows={2}
                              maxLength={140}
                            />
                            <div className="flex items-center justify-between mt-2">
                              <div className="text-xs text-text-light">
                                {replyContent.length}/140
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setReplyingTo(null)}
                                  className="px-3 py-1 text-text-light hover:text-text-dark text-sm"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleCreateReply(post.id)}
                                  disabled={submittingReply || !replyContent.trim()}
                                  className="rounded-cta min-h-[40px] bg-action-primary text-primary-blue text-sm font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-primary px-4 py-1 border-0"
                                >
                                  {submittingReply ? 'Posting...' : 'Reply'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Replies Section */}
                    {expandedReplies.has(post.id) && (
                      <div className="mt-4 space-y-3">
                        {replies[post.id] ? (
                          replies[post.id].map((reply) => (
                            <div key={reply.id} className="ml-1 border-l border-white/10 pl-2">
                              <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 bg-gray-200 flex-shrink-0">
                                  {reply.profiles?.photos && reply.profiles.photos.length > 0 ? (
                                    <img 
                                      src={reply.profiles.photos[0]} 
                                      alt={reply.profiles.name} 
                                      className="w-full h-full object-cover" 
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                      {reply.profiles?.name?.charAt(0).toUpperCase() || ''}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-white text-sm">
                                      {currentUserType === 'MATCHMAKR' ? (
                                        <Link 
                                          href={`/profile/${reply.author_id}`}
                                          className="hover:underline"
                                        >
                                          {reply.profiles?.name}
                                        </Link>
                                      ) : (
                                        reply.profiles?.name
                                      )}
                                    </span>
                                    <span className="text-white/60 text-sm">·</span>
                                    <span className="text-white/60 text-sm">{formatRelativeTime(reply.created_at)}</span>
                                    <span className="text-white/60 text-sm">·</span>
                                    <span className="text-white/60 text-sm">{formatUserType(reply.profiles?.user_type || '')}</span>
                                  </div>
                                  <div className="text-white/90 text-sm leading-relaxed">{reply.content}</div>
                                  {user && reply.author_id === user.id && (
                                    <div className="flex justify-end mt-2">
                                      <button 
                                        onClick={() => openDeleteModal('reply', reply.id, post.id)}
                                        disabled={deletingReply === reply.id}
                                        className="flex items-center gap-1 text-white/60 hover:text-red-400 text-xs transition-colors disabled:opacity-50"
                                      >
                                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-white/60">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-blue-light mx-auto mb-2"></div>
                            Loading replies...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Warning Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title={deleteModal.type === 'post' ? 'Delete Post' : 'Delete Reply'}
        message={
          deleteModal.type === 'post' 
            ? 'Are you sure you want to delete this post? This will also delete all replies and cannot be undone.'
            : 'Are you sure you want to delete this reply? This action cannot be undone.'
        }
        isDeleting={deletingPost === deleteModal.id || deletingReply === deleteModal.id}
      />
    </div>
  );
} 