'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

export default function ForumPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentUserType, setCurrentUserType] = useState<string | null>(null);
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

  // Fetch current user's type
  useEffect(() => {
    const fetchUserType = async () => {
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();
        setCurrentUserType(profile?.user_type || null);
      }
    };
    fetchUserType();
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
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white bg-gray-200 flex-shrink-0">
                      {post.user_photos && post.user_photos.length > 0 ? (
                        <img 
                          src={post.user_photos[0]} 
                          alt={post.user_name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                          {post.user_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {currentUserType === 'MATCHMAKR' ? (
                          <Link 
                            href={`/profile/${post.user_id}`}
                            className="hover:text-blue-300 transition-colors cursor-pointer"
                          >
                            {post.user_name}
                          </Link>
                        ) : (
                          post.user_name
                        )}
                      </div>
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
                  <button 
                    onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                    className="flex items-center gap-1 text-white/60 hover:text-white text-sm transition-colors"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Reply
                  </button>
                  {post.reply_count > 0 && (
                    <button 
                      onClick={() => toggleReplies(post.id)}
                      className="flex items-center gap-1 text-white/60 hover:text-blue-300 text-sm"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M7 8l4-4 4 4M7 16l4 4 4-4" />
                      </svg>
                      {expandedReplies.has(post.id) ? 'Hide' : 'Show'} Replies ({post.reply_count})
                    </button>
                  )}
                  {user && post.user_id === user.id && (
                    <button 
                      onClick={() => openDeleteModal('post', post.id)}
                      disabled={deletingPost === post.id}
                      className="flex items-center gap-1 text-white/60 hover:text-red-400 text-sm transition-colors disabled:opacity-50"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>

                {/* Reply Form */}
                {replyingTo === post.id && user && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="mb-3">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        className="w-full p-3 border border-white/20 rounded-lg focus:ring-2 focus:ring-white focus:border-white focus:outline-none resize-none bg-white/10 text-white placeholder-white/60"
                        rows={3}
                        maxLength={140}
                      />
                      <div className="text-sm text-white/60 mt-1 text-right">
                        {replyContent.length}/140 characters
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="px-4 py-2 text-white/60 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCreateReply(post.id)}
                        disabled={submittingReply || !replyContent.trim()}
                        className="text-white/60 hover:text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {submittingReply ? 'Posting...' : 'Reply'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Replies Section */}
                {expandedReplies.has(post.id) && (
                  <div className="mt-4 space-y-3">
                    {replies[post.id] ? (
                      replies[post.id].map((reply) => (
                        <div key={reply.id} className="ml-8 bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white bg-gray-200 flex-shrink-0">
                              {reply.profiles?.photos && reply.profiles.photos.length > 0 ? (
                                <img 
                                  src={reply.profiles.photos[0]} 
                                  alt={reply.profiles.name} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                  {reply.profiles?.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-white text-sm">
                                {currentUserType === 'MATCHMAKR' ? (
                                  <Link 
                                    href={`/profile/${reply.author_id}`}
                                    className="hover:text-blue-300 transition-colors cursor-pointer"
                                  >
                                    {reply.profiles?.name}
                                  </Link>
                                ) : (
                                  reply.profiles?.name
                                )}
                              </div>
                              <div className="text-xs text-white/60">
                                {new Date(reply.created_at).toLocaleDateString()} at {new Date(reply.created_at).toLocaleTimeString()}
                              </div>
                            </div>
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
                      ))
                    ) : (
                      <div className="text-center py-4 text-white/60">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-300 mx-auto mb-2"></div>
                        Loading replies...
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      {user && <BottomNavigation userId={user.id} />}

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