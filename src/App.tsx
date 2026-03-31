/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Film, 
  Upload, 
  FileText, 
  Play, 
  Download, 
  Loader2, 
  Languages, 
  Volume2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateRecapScript, generateAudio } from './lib/gemini';
import { cn } from './lib/utils';

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [recapScript, setRecapScript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Charon');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.size > 500 * 1024 * 1024) {
      setError('File size exceeds 500MB limit.');
      return;
    }
    setVideoFile(file);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [] },
    multiple: false
  });

  const handleGenerateScript = async () => {
    if (!transcript && !videoFile && !videoUrl) {
      setError('Please provide a transcript, upload a video, or enter a video link.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setRecapScript('');
    setAudioUrl(null);

    try {
      let videoBase64 = undefined;
      let videoMimeType = undefined;

      if (videoFile) {
        // Note: For large files, this might be slow or crash browser memory.
        // We'll try to read it as base64 if it's small enough, otherwise we'll warn.
        if (videoFile.size > 20 * 1024 * 1024) {
          console.warn('Video file is large. Gemini might have trouble processing it directly via inlineData.');
          // In a real app, we'd use the File API, but here we'll proceed with caution.
        }
        
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(videoFile);
        });
        
        videoBase64 = await base64Promise;
        videoMimeType = videoFile.type;
      }

      const script = await generateRecapScript(transcript, videoBase64, videoMimeType, videoUrl);
      if (script) {
        setRecapScript(script);
      } else {
        throw new Error('Failed to generate script.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during script generation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!recapScript) return;

    setIsGeneratingAudio(true);
    setError(null);

    try {
      const url = await generateAudio(recapScript, selectedVoice);
      if (url) {
        setAudioUrl(url);
      } else {
        throw new Error('Failed to generate audio.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during audio generation.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const reset = () => {
    setTranscript('');
    setVideoUrl('');
    setVideoFile(null);
    setRecapScript('');
    setAudioUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans selection:bg-orange-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <Film size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Burmese Movie Recapper</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
            <span className="flex items-center gap-1">
              <Languages size={14} /> မြန်မာဘာသာ
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Input Section */}
          <div className="lg:col-span-5 space-y-8">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Step 1: Input Source</h2>
              
              <div className="space-y-6">
                {/* Transcript Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText size={16} className="text-orange-500" />
                    YouTube Transcript (Optional)
                  </label>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste the transcript here..."
                    className="w-full h-32 p-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none text-sm leading-relaxed outline-none"
                  />
                </div>

                {/* Video URL Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <LinkIcon size={16} className="text-orange-500" />
                    Video Link (YouTube, Facebook, etc.)
                  </label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.facebook.com/watch/?v=... or YouTube link"
                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm outline-none"
                  />
                </div>

                {/* Video Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Upload size={16} className="text-orange-500" />
                    Video Upload (Optional, Max 500MB)
                  </label>
                  <div 
                    {...getRootProps()} 
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
                      isDragActive ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300 hover:bg-gray-50",
                      videoFile ? "border-green-500 bg-green-50" : ""
                    )}
                  >
                    <input {...getInputProps()} />
                    {videoFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="text-green-500" size={32} />
                        <p className="text-sm font-medium text-green-700 truncate max-w-full px-4">
                          {videoFile.name}
                        </p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setVideoFile(null);
                          }}
                          className="text-xs text-red-500 hover:underline flex items-center gap-1 mt-2"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="text-gray-400" size={32} />
                        <p className="text-sm text-gray-500">
                          {isDragActive ? "Drop the video here" : "Drag & drop video, or click to select"}
                        </p>
                        <p className="text-xs text-gray-400">MP4, MOV, etc. up to 500MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleGenerateScript}
                  disabled={isProcessing || (!transcript && !videoFile && !videoUrl)}
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-xl shadow-orange-200 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processing Script...
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      Generate Recap Script
                    </>
                  )}
                </button>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm"
                  >
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </div>
            </section>
          </div>

          {/* Output Section */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {recapScript ? (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Step 2: Generated Recap Script</h2>
                      <button 
                        onClick={reset}
                        className="text-xs text-gray-400 hover:text-orange-500 transition-colors"
                      >
                        Start Over
                      </button>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm relative group">
                      <div className="prose prose-orange max-w-none">
                        <p className="whitespace-pre-wrap text-lg leading-relaxed text-gray-800 font-medium">
                          {recapScript}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Step 3: Audio Generation</h2>
                    
                    <div className="bg-orange-50 border border-orange-100 rounded-3xl p-8 flex flex-col items-center gap-6">
                        {/* Voice Selector */}
                        <div className="w-full flex items-center gap-3">
                          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">အသံရွေးချယ်:</label>
                          <select
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="flex-1 p-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400"
                          >
                            <optgroup label="ယောက်ျားလေးအသံ">
                              <option value="Charon">Charon (ဇာတ်လမ်းပြောင်း)</option>
                              <option value="Fenrir">Fenrir (ကြမ်းတမ်းသော)</option>
                              <option value="Orus">Orus (နက်သော)</option>
                              <option value="Puck">Puck (လန်းဆန်းသော)</option>
                            </optgroup>
                            <optgroup label="မိန်းကလေးအသံ">
                              <option value="Kore">Kore (ဇာတ်လမ်းပြောင်း)</option>
                              <option value="Aoede">Aoede (နူးညံ့သော)</option>
                              <option value="Leda">Leda (ရှင်းလင်းသော)</option>
                              <option value="Zephyr">Zephyr (သာယာသော)</option>
                            </optgroup>
                          </select>
                        </div>
                      {!audioUrl ? (
                        <button
                          onClick={handleGenerateAudio}
                          disabled={isGeneratingAudio}
                          className="px-8 py-4 bg-white text-orange-500 border-2 border-orange-500 rounded-2xl font-bold hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                          {isGeneratingAudio ? (
                            <>
                              <Loader2 className="animate-spin" size={20} />
                              Generating Audio...
                            </>
                          ) : (
                            <>
                              <Volume2 size={20} />
                              Convert to Burmese Audio
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="w-full space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                                <CheckCircle2 size={20} />
                              </div>
                              <div>
                                <p className="font-bold">Audio Ready</p>
                                <p className="text-xs text-gray-500">Burmese Voice (Engaging Tone)</p>
                              </div>
                            </div>
                            <a 
                              href={audioUrl} 
                              download="movie-recap.mp3"
                              className="p-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-orange-500 hover:border-orange-200 transition-all shadow-sm"
                            >
                              <Download size={20} />
                            </a>
                          </div>
                          
                          <audio controls className="w-full h-12 rounded-lg">
                            <source src={audioUrl} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                    </div>
                  </section>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-gray-200 rounded-3xl bg-white/50"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-6">
                    <Film size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-400 mb-2">No Recap Generated Yet</h3>
                  <p className="text-gray-400 max-w-xs">
                    Paste a transcript, enter a video link, or upload a video on the left to start creating your Burmese movie recap.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-400">
          <p>© 2026 Burmese Movie Recapper. Powered by Gemini AI.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-orange-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Terms</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
