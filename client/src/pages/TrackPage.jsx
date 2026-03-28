import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Play, Pause, Share2, Heart, Users, Zap, Music2, 
  MessageSquare, Clock, BarChart3, Send
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTrackRoom } from '../hooks/useTrackRoom';
import { tracksApi } from '../api/tracks';
import { commentsApi } from '../api/comments';
import { aiApi } from '../api/ai';
import WaveformPlayer from '../components/WaveformPlayer';
import CommentThread from '../components/CommentThread';
import PresenceAvatars from '../components/PresenceAvatars';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { formatDuration, formatNumber, formatDate } from '../utils/formatters';

export const TrackPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [track, setTrack] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [mixFeedback, setMixFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackQuestion, setFeedbackQuestion] = useState('');
  
  const { presence, isInRoom } = useTrackRoom(id);

  const loadTrack = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await tracksApi.getTrack(id);
      setTrack(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load track');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadComments = useCallback(async () => {
    try {
      const response = await commentsApi.getComments(id);
      setComments(response.data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  }, [id]);

  useEffect(() => {
    loadTrack();
    loadComments();
  }, [loadTrack, loadComments]);

  useEffect(() => {
    if (!track) return;
    
    const handleNewComment = (comment) => {
      if (comment.trackId === id) {
        setComments(prev => [...prev, comment]);
      }
    };

    const handleCommentDeleted = ({ commentId }) => {
      setComments(prev => prev.filter(c => c._id !== commentId));
    };

    const socket = window.socket;
    if (socket) {
      socket.on('new-comment', handleNewComment);
      socket.on('comment-deleted', handleCommentDeleted);
    }

    return () => {
      if (socket) {
        socket.off('new-comment', handleNewComment);
        socket.off('comment-deleted', handleCommentDeleted);
      }
    };
  }, [track, id]);

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  const handleSeekTo = (time) => {
    setCurrentTime(time);
  };

  const handleRequestFeedback = async () => {
    if (!feedbackQuestion.trim()) return;

    setFeedbackLoading(true);
    try {
      const response = await aiApi.requestMixFeedback(id, feedbackQuestion);
      setMixFeedback('Your feedback request has been submitted. You will receive the results shortly.');
      setShowFeedbackForm(false);
      setFeedbackQuestion('');
    } catch (err) {
      console.error('Failed to request feedback:', err);
      setMixFeedback('Failed to request feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleReanalyze = async () => {
    try {
      await aiApi.reanalyzeTrack(id);
      loadTrack();
    } catch (err) {
      console.error('Failed to reanalyze:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="max-w-5xl mx-auto px-4">
          <PageSpinner />
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-white mb-2">Track not found</h2>
            <p className="text-zinc-400 mb-6">{error || 'This track may have been deleted'}</p>
            <Link to="/dashboard" className="text-purple-400 hover:text-purple-300">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const owner = track.userId;
  const isOwner = user?._id === track.userId?._id || user?._id === track.userId;

  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">{track.title}</h1>
                  <Link 
                    to={`/user/${owner?._id}`}
                    className="text-zinc-400 hover:text-white flex items-center gap-2"
                  >
                    {owner?.avatar ? (
                      <img src={owner.avatar} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">
                          {owner?.username?.[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span>{owner?.displayName || owner?.username}</span>
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  {isInRoom && <PresenceAvatars presence={presence} />}
                </div>
              </div>

              <WaveformPlayer
                audioUrl={track.url}
                waveformData={track.waveformData}
                comments={comments}
                onTimeUpdate={handleTimeUpdate}
                onCommentClick={(comment) => handleSeekTo(comment.timestamp)}
              />

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Play className="w-4 h-4" />
                    {formatNumber(track.plays || 0)} plays
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(track.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {comments.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-zinc-400 hover:text-white transition-colors">
                    <Heart className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-zinc-400 hover:text-white transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {track.description && (
              <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                <h3 className="text-lg font-semibold text-white mb-3">About</h3>
                <p className="text-zinc-300 whitespace-pre-wrap">{track.description}</p>
              </div>
            )}

            <CommentThread
              trackId={id}
              comments={comments}
              currentTime={currentTime}
              onSeekTo={handleSeekTo}
            />
          </div>

          <div className="space-y-6">
            {track.aiAnalysis && Object.keys(track.aiAnalysis).length > 0 && (
              <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    AI Analysis
                  </h3>
                  {isOwner && (
                    <button
                      onClick={handleReanalyze}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Re-analyze
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {track.aiAnalysis.bpm && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        BPM
                      </span>
                      <span className="text-white font-medium">{track.aiAnalysis.bpm}</span>
                    </div>
                  )}

                  {track.aiAnalysis.key && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-2">
                        <Music2 className="w-4 h-4" />
                        Key
                      </span>
                      <span className="text-white font-medium">{track.aiAnalysis.key}</span>
                    </div>
                  )}

                  {track.aiAnalysis.energy !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-400">Energy</span>
                        <span className="text-white font-medium">
                          {Math.round(track.aiAnalysis.energy * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{ width: `${track.aiAnalysis.energy * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {track.aiAnalysis.mood && (
                    <div className="pt-3 border-t border-zinc-800">
                      <span className="text-zinc-400 block mb-2">Mood</span>
                      <span className="px-3 py-1 bg-purple-900/30 text-purple-300 rounded-full text-sm capitalize">
                        {track.aiAnalysis.mood}
                      </span>
                    </div>
                  )}

                  {track.aiAnalysis.detectedGenres?.length > 0 && (
                    <div className="pt-3 border-t border-zinc-800">
                      <span className="text-zinc-400 block mb-2">Genres</span>
                      <div className="flex flex-wrap gap-2">
                        {track.aiAnalysis.detectedGenres.map((genre, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {track.aiAnalysis.instrumentation?.length > 0 && (
                    <div className="pt-3 border-t border-zinc-800">
                      <span className="text-zinc-400 block mb-2">Instrumentation</span>
                      <div className="flex flex-wrap gap-2">
                        {track.aiAnalysis.instrumentation.map((inst, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full text-sm capitalize"
                          >
                            {inst}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                Get Mix Feedback
              </h3>
              <p className="text-zinc-400 text-sm mb-4">
                Ask our AI for feedback on your mix, balance, or specific aspects.
              </p>

              {showFeedbackForm ? (
                <div className="space-y-3">
                  <textarea
                    value={feedbackQuestion}
                    onChange={(e) => setFeedbackQuestion(e.target.value)}
                    placeholder="What would you like feedback on?"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRequestFeedback}
                      loading={feedbackLoading}
                      className="flex-1"
                      size="sm"
                    >
                      <Send className="w-4 h-4" />
                      Request
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setShowFeedbackForm(false)}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowFeedbackForm(true)}
                >
                  Ask AI for Feedback
                </Button>
              )}

              {mixFeedback && (
                <div className="mt-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                  <p className="text-purple-300 text-sm">{mixFeedback}</p>
                </div>
              )}
            </div>

            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4">Track Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Created</span>
                  <span className="text-white">{formatDate(track.createdAt)}</span>
                </div>
                {track.genre && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Genre</span>
                    <span className="text-white">{track.genre}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">Status</span>
                  <span className={`${
                    track.processingStatus === 'completed' ? 'text-green-400' :
                    track.processingStatus === 'processing' ? 'text-yellow-400' :
                    'text-zinc-400'
                  }`}>
                    {track.processingStatus}
                  </span>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
                <div className="space-y-2">
                  <Link
                    to={`/track/${id}/versions`}
                    className="block w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-center transition-colors"
                  >
                    View Versions
                  </Link>
                  <Link
                    to={`/track/${id}/collaborators`}
                    className="block w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-center transition-colors"
                  >
                    Manage Collaborators
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackPage;
