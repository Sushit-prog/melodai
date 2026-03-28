import { useState, useEffect } from 'react';
import { ThumbsUp, Heart, Laugh, Frown, MessageSquare, MoreHorizontal, Send, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { commentsApi } from '../api/comments';
import { formatDuration, timeAgo } from '../utils/formatters';
import Spinner from './Spinner';

const reactionIcons = {
  like: ThumbsUp,
  heart: Heart,
  laugh: Laugh,
  sad: Frown,
};

export const CommentThread = ({ trackId, comments = [], currentTime = 0, onSeekTo }) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const rootComments = comments.filter(c => !c.parentId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await commentsApi.createComment({
        trackId,
        text: newComment,
        timestamp: Math.floor(currentTime),
      });
      setNewComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentId) => {
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    try {
      await commentsApi.createComment({
        trackId,
        text: replyText,
        parentId,
      });
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to post reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (commentId) => {
    if (!editText.trim()) return;

    setIsSubmitting(true);
    try {
      await commentsApi.updateComment(commentId, editText);
      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Failed to edit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      await commentsApi.deleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleReaction = async (commentId, type) => {
    try {
      await commentsApi.addReaction(commentId, type);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const CommentItem = ({ comment, isReply = false }) => {
    const author = comment.userId;
    const replies = comments.filter(c => c.parentId === comment._id);
    const reactionCounts = {};
    comment.reactions?.forEach(r => {
      reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
    });

    return (
      <div className={`${isReply ? 'ml-8 border-l-2 border-zinc-800 pl-4' : ''}`}>
        <div className="flex gap-3">
          {author?.avatar ? (
            <img
              src={author.avatar}
              alt={author.username}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">
                {author?.username?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm">
                {author?.displayName || author?.username || 'Unknown'}
              </span>
              {comment.timestamp !== undefined && comment.timestamp !== null && (
                <button
                  onClick={() => onSeekTo?.(comment.timestamp)}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  {formatDuration(comment.timestamp)}
                </button>
              )}
              <span className="text-xs text-zinc-500">
                {timeAgo(comment.createdAt)}
              </span>
            </div>

            {editingId === comment._id ? (
              <div className="mt-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white resize-none"
                  rows={2}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEdit(comment._id)}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 bg-zinc-700 text-zinc-300 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-zinc-300 text-sm mt-1">{comment.text}</p>
            )}

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                {Object.entries(reactionCounts).map(([type, count]) => {
                  const Icon = reactionIcons[type];
                  return (
                    <button
                      key={type}
                      onClick={() => handleReaction(comment._id, type)}
                      className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-400 transition-colors"
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setReplyingTo(comment._id)}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
              >
                <MessageSquare className="w-3 h-3" />
                Reply
              </button>

              {user && author?._id === user._id && (
                <>
                  <button
                    onClick={() => {
                      setEditingId(comment._id);
                      setEditText(comment.text);
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(comment._id)}
                    className="text-xs text-red-500 hover:text-red-400"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>

            {replyingTo === comment._id && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleReply(comment._id)}
                />
                <button
                  onClick={() => handleReply(comment._id)}
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="px-3 py-2 bg-zinc-700 text-zinc-300 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map(reply => (
              <CommentItem key={reply._id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Comments ({comments.length})
      </h3>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-3">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={`Add a comment at ${formatDuration(currentTime)}...`}
              className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-4">
        {rootComments.length === 0 ? (
          <p className="text-center text-zinc-500 py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          rootComments.map(comment => (
            <CommentItem key={comment._id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
};

export default CommentThread;
