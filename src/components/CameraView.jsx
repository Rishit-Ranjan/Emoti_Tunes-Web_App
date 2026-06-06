import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const CameraView = ({ onCapture, onClose, onError }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const faceDetectorRef = useRef(null);
    const streamRef = useRef(null);
    const isMountedRef = useRef(true);
    const [stream, setStream] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [isFaceVisible, setIsFaceVisible] = useState(false);
    const [faceStatus, setFaceStatus] = useState('Position face in center');

    useEffect(() => {
        if ('FaceDetector' in window) {
            faceDetectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        } else {
            setFaceStatus('Face detection not supported; capture enabled when camera is active');
            setIsFaceVisible(true); // fallback
        }
    }, []);

    const stopCamera = useCallback(() => {
        const activeStream = streamRef.current;
        if (activeStream) {
            activeStream.getTracks().forEach(track => track.stop());
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.srcObject = null;
            }
            streamRef.current = null;
            setStream(null);
        }
    }, []);

    const closeCamera = useCallback(() => {
        stopCamera();
        onClose();
    }, [onClose, stopCamera]);

    const startCamera = useCallback(async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
            });

            if (!isMountedRef.current) {
                s.getTracks().forEach(track => track.stop());
                return;
            }

            setStream(s);
            streamRef.current = s;
            if (videoRef.current) {
                videoRef.current.srcObject = s;
                videoRef.current.play().catch(err => {
                    console.warn('Video play was prevented:', err);
                });
            }
        } catch (err) {
            console.error("Camera access error:", err);
            onError("Could not access camera. Please check permissions.");
            closeCamera();
        }
    }, [onError, closeCamera]);

    useEffect(() => {
        isMountedRef.current = true;
        startCamera();
        return () => {
            isMountedRef.current = false;
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    useEffect(() => {
        if (!videoRef.current) return;

        const checkFace = async () => {
            const video = videoRef.current;
            if (video.readyState < 2 || !canvasRef.current) {
                return;
            }

            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            if (faceDetectorRef.current) {
                try {
                    const faces = await faceDetectorRef.current.detect(canvas);
                    const hasFace = Array.isArray(faces) && faces.length > 0;
                    setIsFaceVisible(hasFace);
                    setFaceStatus(hasFace ? 'Face detected - tap CAPTURE' : 'No face detected, align your face');
                } catch (err) {
                    console.warn('Face detection error:', err);
                    setFaceStatus('Face detector error, tap CAPTURE when ready');
                    setIsFaceVisible(true);
                }
            }
        };

        const interval = setInterval(checkFace, 400);
        return () => clearInterval(interval);
    }, [stream]);

    const capturePhoto = () => {
        if (isCapturing) return;
        if (!isFaceVisible) {
            setFaceStatus('Face not detected - capturing anyway.');
        }

        setIsCapturing(true);
        setCountdown(3);

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    executeCapture();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const executeCapture = () => {
        if (!videoRef.current || !canvasRef.current) {
            setIsCapturing(false);
            return;
        }
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(imageData);
        setIsCapturing(false);
        setFaceStatus('Captured! Generating mood');
    };

    const cameraContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050714]/95 backdrop-blur-2xl animate-in fade-in duration-500 overflow-hidden">
            <div className="absolute inset-0 bg-black/70" onClick={closeCamera}></div>

            <div className="relative w-full max-w-6xl h-[calc(100vh-6rem)] bg-[#12121e] rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(139,92,246,0.3)] border border-violet-500/20 flex flex-col">
                {/* Video Feed */}
                <div className="relative flex-1 bg-black">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className={`w-full h-full object-cover transition-all duration-700 ${isCapturing && !countdown ? 'brightness-150 scale-105' : ''}`}
                    />
                    
                    {/* UI Overlays */}
                    <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
                        <div className="flex justify-between items-start">
                            <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 flex items-center space-x-3">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Live Emotion Feed</span>
                            </div>
                            <button 
                                onClick={closeCamera}
                                className="w-12 h-12 rounded-3xl bg-black/40 hover:bg-red-500/20 text-white backdrop-blur-xl transition-all border border-white/10 pointer-events-auto flex items-center justify-center"
                                title="Close camera"
                            >
                                <svg className="w-6 h-6 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        {countdown && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-8xl md:text-[12rem] font-black text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.5)] animate-pulse">{countdown}</span>
                            </div>
                        )}

                        <div className="absolute inset-x-0 top-6 flex justify-center pointer-events-none">
                            <div className="bg-black/80 backdrop-blur-xl px-5 py-2 rounded-2xl border border-violet-500/40 text-white flex items-center space-x-3 max-w-[90vw] md:max-w-xl">
                                <div className={`w-3 h-3 rounded-full ${isFaceVisible ? 'bg-emerald-400 animate-pulse' : 'bg-red-400 animate-pulse'}`}></div>
                                <span className="text-sm md:text-base font-bold text-cyan-300 leading-tight text-center whitespace-nowrap">{faceStatus}</span>
                            </div>
                        </div>

                        {!isCapturing && !countdown && (
                            <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-auto">
                                <button
                                    onClick={capturePhoto}
                                    className="uppercase text-xs tracking-widest px-8 py-4 rounded-full bg-violet-600 hover:bg-violet-500 border border-white/20 text-white font-black shadow-[0_0_30px_rgba(139,92,246,0.35)] transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    {isFaceVisible ? 'Capture Photo' : 'Capture Anyway'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="h-24 bg-[#12121e] border-t border-white/5 flex items-center justify-center px-10 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-cyan-500/5 pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-4 text-xs uppercase tracking-[0.25em] font-black text-white/60">
                        <span>Face detection is {window.FaceDetector ? 'supported' : 'not supported'}</span>
                        <span className="text-cyan-300">Camera ready</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(cameraContent, document.body) : cameraContent;
};

export default CameraView;

