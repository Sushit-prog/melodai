import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Music, X, Check, Loader } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTrackStore } from '../store/trackStore';
import { useSocket } from '../hooks/useSocket';
import { tracksApi } from '../api/tracks';
import Button from '../components/Button';
import Input, { Textarea } from '../components/Input';
import UploadProgress from '../components/UploadProgress';

export const UploadPage = () => {
  const navigate = useNavigate();
  const { user, requireAuth } = useAuth();
  useSocket();
  
  const { 
    uploadStatus, 
    uploadProgress, 
    uploadError, 
    setUploadProgress,
    setUploadStatus,
    setUploadError,
    resetUpload,
    addTrack
  } = useTrackStore();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    tags: '',
    isPublic: true,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!requireAuth()) return;
  }, []);

  useEffect(() => {
    return () => resetUpload();
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      setFile(droppedFile);
      if (!formData.title && droppedFile.name) {
        const nameWithoutExt = droppedFile.name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, title: nameWithoutExt }));
      }
    } else {
      setErrors(prev => ({ ...prev, file: 'Please drop an audio file' }));
    }
  }, [formData.title]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('audio/')) {
      setFile(selectedFile);
      setErrors(prev => ({ ...prev, file: '' }));
      if (!formData.title && selectedFile.name) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, title: nameWithoutExt }));
      }
    } else {
      setErrors(prev => ({ ...prev, file: 'Please select an audio file' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!file) {
      newErrors.file = 'Audio file is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setUploadStatus('uploading');

    try {
      const uploadData = new FormData();
      uploadData.append('audio', file);
      uploadData.append('title', formData.title);
      uploadData.append('description', formData.description);
      uploadData.append('genre', formData.genre);
      uploadData.append('tags', formData.tags);
      uploadData.append('isPublic', formData.isPublic);

      const response = await tracksApi.uploadTrack(uploadData, (progress) => {
        setUploadProgress(progress);
      });

      setUploadStatus('processing');

      setTimeout(() => {
        setUploadStatus('analyzing');
      }, 2000);

      setTimeout(() => {
        setUploadStatus('complete');
        addTrack(response.data.track);
        
        setTimeout(() => {
          navigate(`/track/${response.data.track._id}`);
        }, 1500);
      }, 4000);

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error.response?.data?.error || 'Upload failed');
    }
  };

  const handleRetry = () => {
    resetUpload();
    setFile(null);
    setFormData({
      title: '',
      description: '',
      genre: '',
      tags: '',
      isPublic: true,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Upload Track</h1>
        <p className="text-zinc-400 mb-8">Share your music with the world</p>

        {(uploadStatus === 'uploading' || uploadStatus === 'processing' || 
          uploadStatus === 'analyzing' || uploadStatus === 'complete' || uploadStatus === 'error') && (
          <div className="mb-8">
            <UploadProgress 
              progress={uploadProgress}
              status={uploadStatus}
              error={uploadError}
              onRetry={handleRetry}
            />
          </div>
        )}

        {uploadStatus === 'idle' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive
                  ? 'border-purple-500 bg-purple-500/5'
                  : errors.file
                  ? 'border-red-500 bg-red-500/5'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              {file ? (
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <Music className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-zinc-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFile(null);
                    }}
                    className="ml-auto p-2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-zinc-600" />
                  </div>
                  <p className="text-white font-medium mb-1">
                    Drop your audio file here
                  </p>
                  <p className="text-sm text-zinc-400">
                    or click to browse (MP3, WAV, FLAC, OGG)
                  </p>
                </>
              )}
            </div>
            {errors.file && (
              <p className="text-red-500 text-sm -mt-4">{errors.file}</p>
            )}

            <Input
              label="Title"
              value={formData.title}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, title: e.target.value }));
                if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
              }}
              placeholder="Enter track title"
              error={errors.title}
            />

            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell us about your track..."
              rows={3}
            />

            <Input
              label="Genre"
              value={formData.genre}
              onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
              placeholder="e.g., Electronic, Hip Hop, Ambient"
            />

            <Input
              label="Tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="Comma-separated tags"
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="isPublic" className="text-zinc-300">
                Make this track public
              </label>
            </div>

            <Button type="submit" className="w-full" size="lg">
              <Upload className="w-5 h-5" />
              Upload Track
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
