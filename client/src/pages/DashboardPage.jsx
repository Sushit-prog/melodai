import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Music, Zap, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { tracksApi } from '../api/tracks';
import TrackCard from '../components/TrackCard';
import { Spinner, PageSpinner } from '../components/Spinner';
import { formatNumber } from '../utils/formatters';

export const DashboardPage = () => {
  const { user } = useAuth();
  useSocket();
  const [tracks, setTracks] = useState([]);
  const [stats, setStats] = useState({
    totalPlays: 0,
    totalTracks: 0,
    aiAnalyzed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?._id) {
      loadTracks();
    }
  }, [user?._id]);

  const loadTracks = async () => {
    if (!user?._id) return;

    setIsLoading(true);
    try {
      const response = await tracksApi.getUserTracks(user._id);
      const userTracks = response.data;
      setTracks(userTracks);

      const aiAnalyzed = userTracks.filter(t => 
        t.aiAnalysis && Object.keys(t.aiAnalysis).length > 0
      ).length;

      setStats({
        totalPlays: userTracks.reduce((sum, t) => sum + (t.plays || 0), 0),
        totalTracks: userTracks.length,
        aiAnalyzed,
      });
    } catch (error) {
      console.error('Failed to load tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="max-w-7xl mx-auto px-4">
          <PageSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome back, {user?.displayName || user?.username}
            </h1>
            <p className="text-zinc-400 mt-1">Manage your tracks and collaborations</p>
          </div>
          <Link
            to="/upload"
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Upload Track
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <Music className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalTracks}</p>
                <p className="text-sm text-zinc-400">Total Tracks</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{formatNumber(stats.totalPlays)}</p>
                <p className="text-sm text-zinc-400">Total Plays</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.aiAnalyzed}</p>
                <p className="text-sm text-zinc-400">AI Analyzed</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Your Tracks</h2>
        </div>

        {tracks.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No tracks yet</h3>
            <p className="text-zinc-400 mb-6">Upload your first track to get started</p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Upload Track
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tracks.map(track => (
              <TrackCard key={track._id} track={track} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
