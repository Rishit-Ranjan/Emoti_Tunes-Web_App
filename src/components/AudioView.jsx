import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

const AudioView = ({ onCapture, onClose, onError, isSidebarOpen }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);
    const streamRef = useRef(null);
    const [visualizerData, setVisualizerData] = useState(new Array(32).fill(10));

    const stopAudio = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            // Setup Web Audio API for visualizer
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const updateVisualizer = () => {
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(dataArray);
                setVisualizerData(Array.from(dataArray));
                animationFrameRef.current = requestAnimationFrame(updateVisualizer);
            };
            updateVisualizer();

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                // Simulate AER feature extraction
                const mockAerFeatures = {
                    avgFreq: 120 + Math.random() * 100,
                    avgEnergy: 0.3 + Math.random() * 0.6,
                    stability: 0.4 + Math.random() * 0.5
                };
                onCapture({ 
                    audioData: audioBlob, 
                    mimeType: 'audio/webm',
                    aerFeatures: mockAerFeatures
                });
            };

            mediaRecorderRef.current.start();
            streamRef.current = stream;
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Microphone access error:", err);
            onError("Could not access microphone.");
            closeAudio();
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
            cancelAnimationFrame(animationFrameRef.current);
            if (mediaRecorderRef.current.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }
    };

    const closeAudio = useCallback(() => {
        if (isRecording) {
            stopRecording();
        }
        stopAudio();
        onClose();
    }, [isRecording, onClose, stopAudio]);

    useEffect(() => {
        return () => {
            if (isRecording) {
                stopRecording();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isRecording]);

    const formatTime = (time) => {
        const m = Math.floor(time / 60);
        const s = time % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const audioContent = (
        <div className={`fixed top-0 bottom-0 ${isSidebarOpen ? 'left-72' : 'left-0'} right-0 z-40 flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]`}>
            <div className="absolute inset-0 bg-[#0a0a12]/95 backdrop-blur-3xl" onClick={closeAudio}></div>
            
            <div className="relative w-full max-w-4xl aspect-video bg-[#12121e] rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(139,92,246,0.3)] border border-violet-500/20 flex flex-col items-center justify-center p-12 group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent pointer-events-none"></div>

                {/* Close Button */}
                <button 
                    onClick={closeAudio}
                    className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-black/40 hover:bg-red-500/20 text-white backdrop-blur-xl transition-all border border-white/10 flex items-center justify-center group/btn z-10"
                >
                    <svg className="w-6 h-6 group-hover/btn:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>

                <div className="text-center relative z-10 w-full max-w-2xl flex flex-col items-center space-y-12">
                    {/* Visualizer bars */}
                    <div className="h-32 flex items-center justify-center space-x-1.5 w-full">
                        {visualizerData.slice(0, 32).map((val, i) => (
                            <div 
                                key={i}
                                className={`w-1.5 rounded-full bg-gradient-to-t from-violet-600 to-cyan-400 transition-all duration-75 ${isRecording ? 'opacity-100' : 'opacity-20 h-2'}`}
                                style={{ height: isRecording ? `${Math.max(10, (val / 255) * 100)}%` : '8px' }}
                            ></div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <h2 className={`text-6xl font-black text-white uppercase tracking-tighter transition-all duration-500 ${isRecording ? 'scale-110 drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]' : ''}`}>
                            {isRecording ? "Listening..." : "Speak Your Mind"}
                        </h2>
                        <p className="text-violet-300/40 text-sm font-black uppercase tracking-[0.3em] h-6">
                            {isRecording ? `Recording Time: ${formatTime(recordingTime)}` : "AER Analysis Engine Active"}
                        </p>
                    </div>

                    <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 group/rec relative shadow-2xl active:scale-90 ${isRecording ? 'bg-red-500 rotate-90 rounded-full' : 'bg-violet-600 hover:scale-110 hover:rotate-3'}`}
                    >
                        {isRecording ? (
                            <div className="w-10 h-10 bg-white rounded-lg animate-pulse"></div>
                        ) : (
                            <svg className="w-16 h-16 text-white group-hover/rec:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                        )}
                        {/* Pulse effect */}
                        {isRecording && (
                            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping -z-10"></div>
                        )}
                    </button>
                    
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                           <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"></div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-violet-200/40">Pitch</span>
                        </div>
                        <div className="flex items-center space-x-2">
                           <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-100"></div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-violet-200/40">Energy</span>
                        </div>
                        <div className="flex items-center space-x-2">
                           <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-200"></div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-violet-200/40">Timbre</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(audioContent, document.body) : audioContent;
};

export default AudioView;
