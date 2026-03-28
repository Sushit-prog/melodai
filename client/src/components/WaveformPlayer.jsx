import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2, VolumeX, MessageSquare } from 'lucide-react';
import { formatDuration } from '../utils/formatters';

export const WaveformPlayer = ({
  audioUrl,
  waveformData,
  comments = [],
  onTimeUpdate,
  onCommentClick,
  height = 80,
}) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!waveformRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#a855f7',
      progressColor: '#7c3aed',
      cursorColor: '#c084fc',
      barWidth: 2,
      barRadius: 2,
      cursorWidth: 1,
      height,
      barGap: 1,
      normalize: true,
      backend: 'WebAudio',
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));
    wavesurfer.on('finish', () => setIsPlaying(false));
    
    wavesurfer.on('audioprocess', (time) => {
      setCurrentTime(time);
      onTimeUpdate?.(time);
    });
    
    wavesurfer.on('ready', () => {
      setDuration(wavesurfer.getDuration());
    });

    wavesurfer.on('interaction', (newTime) => {
      setCurrentTime(newTime);
      onTimeUpdate?.(newTime);
    });

    if (audioUrl) {
      wavesurfer.load(audioUrl);
    }

    return () => {
      wavesurfer.destroy();
    };
  }, [audioUrl, height]);

  useEffect(() => {
    if (wavesurferRef.current && volume >= 0) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  const togglePlayPause = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  }, []);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSeek = (time) => {
    if (wavesurferRef.current && duration > 0) {
      wavesurferRef.current.seekTo(time / duration);
    }
  };

  const commentsWithTime = comments.filter(c => c.timestamp !== undefined && c.timestamp !== null);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={togglePlayPause}
          className="w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center transition-colors shadow-lg shadow-purple-900/30"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white fill-white" />
          ) : (
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          )}
        </button>

        <div className="flex-1">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-400">{formatDuration(currentTime)}</span>
            <span className="text-zinc-400">{formatDuration(duration)}</span>
          </div>
          <div ref={waveformRef} className="w-full cursor-pointer" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>

      {commentsWithTime.length > 0 && (
        <div className="relative h-6 mt-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700" />
          </div>
          {commentsWithTime.map((comment) => {
            const position = duration > 0 ? (comment.timestamp / duration) * 100 : 0;
            return (
              <button
                key={comment._id}
                onClick={() => {
                  handleSeek(comment.timestamp);
                  onCommentClick?.(comment);
                }}
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full hover:bg-blue-400 transition-colors group"
                style={{ left: `${position}%` }}
                title={`${comment.userId?.username || 'User'}: ${comment.text}`}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  <MessageSquare className="w-3 h-3 inline mr-1" />
                  {formatDuration(comment.timestamp)}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WaveformPlayer;
