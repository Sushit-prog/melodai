import { Link } from 'react-router-dom';
import { Play, MoreHorizontal, Zap } from 'lucide-react';
import { formatDuration, formatNumber } from '../utils/formatters';

export const TrackCard = ({ track, showOwner = false }) => {
  const owner = track.userId;

  return (
    <Link
      to={`/track/${track._id}`}
      className="group block bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all hover:shadow-lg hover:shadow-purple-900/10"
    >
      <div className="relative aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900">
        {track.waveformData && track.waveformData.length > 0 ? (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="flex items-end gap-0.5 h-16">
              {track.waveformData.slice(0, 50).map((value, i) => (
                <div
                  key={i}
                  className="w-1 bg-purple-500/60 rounded-full transition-colors group-hover:bg-purple-400"
                  style={{ height: `${Math.max(4, value * 64)}px` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-12 h-12 text-zinc-700" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-purple-900/50">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        </div>

        {track.processingStatus === 'processing' && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/90 rounded text-xs font-medium text-black">
            Processing...
          </div>
        )}

        {track.aiAnalysis && Object.keys(track.aiAnalysis).length > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-purple-600/90 rounded text-xs font-medium text-white">
            <Zap className="w-3 h-3" />
            AI
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-white truncate mb-1">{track.title}</h3>

        {showOwner && owner && (
          <p className="text-sm text-zinc-400 truncate mb-2">
            by {owner.displayName || owner.username}
          </p>
        )}

        <div className="flex items-center gap-3 text-sm text-zinc-500">
          {track.duration > 0 && (
            <span>{formatDuration(track.duration)}</span>
          )}
          {track.aiAnalysis?.bpm && (
            <span>{track.aiAnalysis.bpm} BPM</span>
          )}
          <span>{formatNumber(track.plays || 0)} plays</span>
        </div>

        {track.aiAnalysis?.detectedGenres?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {track.aiAnalysis.detectedGenres.slice(0, 3).map((genre, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {track.aiAnalysis?.mood && (
          <div className="mt-2">
            <span className="px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded text-xs capitalize">
              {track.aiAnalysis.mood}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default TrackCard;
