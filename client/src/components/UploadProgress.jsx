import { CheckCircle, Music, Zap, AlertCircle } from 'lucide-react';
import Spinner from './Spinner';

export const UploadProgress = ({ progress = 0, status = 'uploading', error = null, onRetry }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'uploading':
        return {
          icon: <Music className="w-5 h-5" />,
          label: 'Uploading...',
          sublabel: `${progress}%`,
          color: 'text-purple-400',
        };
      case 'processing':
        return {
          icon: <Spinner size="sm" />,
          label: 'Processing audio...',
          sublabel: 'Generating waveform',
          color: 'text-yellow-400',
        };
      case 'analyzing':
        return {
          icon: <Zap className="w-5 h-5" />,
          label: 'AI Analysis',
          sublabel: 'Detecting BPM, key, mood...',
          color: 'text-blue-400',
        };
      case 'complete':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          label: 'Complete!',
          sublabel: 'Ready to play',
          color: 'text-green-400',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          label: 'Upload failed',
          sublabel: error || 'Something went wrong',
          color: 'text-red-400',
        };
      default:
        return {
          icon: <Music className="w-5 h-5" />,
          label: 'Preparing...',
          sublabel: '',
          color: 'text-zinc-400',
        };
    }
  };

  const { icon, label, sublabel, color } = getStatusInfo();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className={`${color}`}>{icon}</div>
        <div className="flex-1">
          <p className="font-medium text-white">{label}</p>
          <p className="text-sm text-zinc-400">{sublabel}</p>
        </div>
        {status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        )}
      </div>

      {(status === 'uploading' || status === 'processing') && (
        <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-300"
            style={{ width: `${status === 'uploading' ? progress : 100}%` }}
          />
          {status === 'processing' && (
            <div className="absolute inset-0 animate-pulse bg-purple-400/30" />
          )}
        </div>
      )}

      {status === 'analyzing' && (
        <div className="flex items-center gap-2 text-sm text-blue-400">
          <Spinner size="sm" />
          <span>AI is analyzing your track...</span>
        </div>
      )}

      {status === 'complete' && (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>Your track is ready!</span>
        </div>
      )}
    </div>
  );
};

export default UploadProgress;
