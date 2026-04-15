import React, { useState, useEffect, useRef } from 'react';

const PlaylistDisplay = ({ playlist, emotion, onReset, onSave }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [player, setPlayer] = useState(null);
    const [volume, setVolume] = useState(80);
    const playerRef = useRef(null);

    const currentSong = playlist[currentIndex];

    // Initialize YouTube API
    useEffect(() => {
        const loadYT = () => {
            if (!window.YT) {
                const tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                window.onYouTubeIframeAPIReady = () => initPlayer();
            } else if (window.YT.Player) {
                initPlayer();
            }
        };

        const initPlayer = () => {
            if (playerRef.current) return;
            setTimeout(() => {
                const el = document.getElementById('youtube-player-container');
                if (!el) return;
                playerRef.current = new window.YT.Player('youtube-player-container', {
                    height: '0', width: '0',
                    videoId: currentSong?.youtubeId || '',
                    playerVars: { 'playsinline': 1, 'controls': 0, 'autoplay': 1, 'mute': 0, 'origin': window.location.origin },
                    events: {
                        'onReady': (event) => {
                            setPlayer(event.target);
                            setDuration(event.target.getDuration());
                            event.target.setVolume(volume);
                            if (currentSong) event.target.playVideo();
                        },
                        'onStateChange': (event) => {
                            if (event.data === window.YT.PlayerState.PLAYING) {
                                setIsPlaying(true);
                                setDuration(event.target.getDuration());
                            } else if (event.data === window.YT.PlayerState.PAUSED) {
                                setIsPlaying(false);
                            } else if (event.data === window.YT.PlayerState.ENDED) {
                                handleNext();
                            }
                        },
                        'onError': () => handleNext()
                    }
                });
            }, 100);
        };
        loadYT();
        return () => { if (playerRef.current?.destroy) playerRef.current.destroy(); };
    }, []);

    useEffect(() => {
        if (player && currentSong?.youtubeId) {
            player.loadVideoById(currentSong.youtubeId);
            setIsPlaying(true);
        }
    }, [currentIndex, player]);

    useEffect(() => {
        if (player?.setVolume) player.setVolume(volume);
    }, [volume, player]);

    useEffect(() => {
        let interval;
        if (isPlaying && player) {
            interval = setInterval(() => setCurrentTime(player.getCurrentTime()), 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, player]);

    const togglePlayPause = () => {
        if (!player) return;
        if (player.getPlayerState() === window.YT.PlayerState.PLAYING) player.pauseVideo();
        else player.playVideo();
    };

    const handleNext = () => currentIndex < playlist.length - 1 ? setCurrentIndex(currentIndex + 1) : setIsPlaying(false);
    const handlePrev = () => currentIndex > 0 && setCurrentIndex(currentIndex - 1);
    const handleSeek = (e) => {
        const time = Number(e.target.value);
        setCurrentTime(time);
        if (player?.seekTo) player.seekTo(time, true);
    };
    const formatTime = (time) => {
        if (isNaN(time) || time === undefined) return "0:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };
    const getAlbumArt = (song, idx) => `https://picsum.photos/seed/${encodeURIComponent(song?.title || "vibe" + (idx || 0))}/300/300`;

    return (
        <div className="flex-1 w-full h-full bg-[#0a0a12] flex flex-col font-sans text-white overflow-hidden animate-in fade-in duration-700 relative">
            <div className="absolute -top-[9999px] -left-[9999px] opacity-0 pointer-events-none"><div id="youtube-player-container"></div></div>

            <div className="flex-1 overflow-y-auto pb-44 scrollbar-hide">
                <div className={`pt-32 pb-12 px-10 bg-gradient-to-b ${emotion?.gradient || 'from-violet-500/10 to-[#0a0a12]'} to-[#0a0a12]/0 flex items-end space-x-10 relative`}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl pointer-events-none"></div>
                    <div className="w-56 h-56 md:w-72 md:h-72 shadow-[0_30px_90px_rgba(0,0,0,0.9)] bg-[#1a1a2e] relative z-10 flex-shrink-0 group overflow-hidden rounded-[2.5rem] border border-white/10 ring-1 ring-white/5">
                        <img src={getAlbumArt(currentSong, 99)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"/>
                        {!isPlaying && <div className="absolute inset-0 bg-black/40 flex items-center justify-center animate-pulse"><svg className="w-24 h-24 text-white/50" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>}
                    </div>
                    <div className="relative z-10 pb-4">
                        <p className="uppercase text-sm font-black tracking-[0.4em] text-cyan-400 mb-4 animate-pulse">Intelligence Verified</p>
                        <h1 className="text-8xl md:text-[8rem] font-black text-white mb-6 tracking-tighter leading-none drop-shadow-2xl uppercase selection:bg-cyan-500">{emotion?.name || 'Vibe'}</h1>
                        <div className="flex items-center space-x-4 text-sm font-black text-white/80">
                            <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center p-1.5 ring-2 ring-white/10"><img src="/logo.png" className="w-full h-full rounded-full" alt="" /></div>
                            <span className="hover:text-cyan-400 cursor-pointer uppercase tracking-widest transition-colors font-black">EmotiTunes Protocol</span>
                            <span className="text-white/50 tracking-widest uppercase">• {playlist.length} Sonic Elements</span>
                        </div>
                    </div>
                </div>

                <div className="px-10 bg-gradient-to-b from-black/20 to-[#0a0a12] pt-8 min-h-screen">
                    <div className="flex items-center space-x-10 mb-12">
                        <button onClick={togglePlayPause} className="w-20 h-20 rounded-3xl bg-white hover:bg-cyan-400 transition-all text-black flex items-center justify-center shadow-[0_20px_50px_rgba(255,255,255,0.15)] active:scale-90 group">
                            {isPlaying ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 ml-1"><path d="M8 5v14l11-7z"/></svg>}
                        </button>
                       
                    </div>

                    <div className="grid grid-cols-[45px_2fr_3fr] md:grid-cols-[45px_4fr_3fr_1fr] gap-7 px-10 py-6 border-b border-white/5 text-sm font-black tracking-[0.4em] text-white/70 uppercase mb-8">
                        <div>#</div><div>Track Origin</div><div className="hidden md:block">Sonic Profile</div><div className="text-right">Interval</div>
                    </div>
                    <div className="space-y-3 px-2">
                        {playlist.map((song, index) => {
                            const isCurrentlyPlaying = index === currentIndex;
                            return (
                                <div key={index} onClick={() => setCurrentIndex(index)} className={`group grid grid-cols-[40px_1fr_1fr] md:grid-cols-[40px_4fr_3fr_1fr] gap-8 px-6 py-4 rounded-[2rem] hover:bg-white/5 transition-all cursor-pointer items-center border border-transparent hover:border-white/10 ${isCurrentlyPlaying ? 'bg-white/5 border-white/10 shadow-2xl' : ''}`}>
                                    <div className="text-center font-black">
                                        {isCurrentlyPlaying && isPlaying ? <div className="flex justify-center space-x-1 h-4"><div className="w-1 bg-cyan-400 animate-bounce"></div><div className="w-1 bg-violet-400 animate-bounce delay-150"></div><div className="w-1 bg-cyan-400 animate-bounce delay-300"></div></div> : <span className={`text-[11px] ${isCurrentlyPlaying ? 'text-cyan-400' : 'text-white/70'}`}>{index + 1}</span>}
                                    </div>
                                    <div className="flex items-center min-w-0">
                                        <div className="w-14 h-14 bg-[#1a1a2e] flex-shrink-0 mr-6 rounded-2xl shadow-xl overflow-hidden group-hover:rotate-6 transition-transform"><img src={getAlbumArt(song, index)} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100" /></div>
                                        <div className="truncate"><div className={`font-black text-2xl truncate tracking-tighter ${isCurrentlyPlaying ? 'text-cyan-400' : 'text-white'}`}>{song.title}</div><div className="text-sm font-black text-white/70 truncate uppercase tracking-widest mt-1 group-hover:text-cyan-400/50 transition-colors">{song.artist}</div></div>
                                    </div>
                                    <div className="hidden md:block text-sm font-black text-white/50 truncate uppercase tracking-widest italic group-hover:text-white/40 transition-colors">Adaptive Studio Mix</div>
                                    <div className="text-right text-[11px] font-black text-white/70 tabular-nums">3:42</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Premium Floating Player */}
            <div className="fixed bottom-8 left-8 right-8 md:left-[21.5rem] h-28 bg-[#0a0a12]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] px-12 flex items-center justify-between z-50 shadow-[0_40px_120px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-20 duration-1000">
                <div className="flex-[0.35] flex items-center min-w-0">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-[#1a1a2e] flex-shrink-0 mr-5 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden group relative ring-1 ring-white/5">
                        <img src={getAlbumArt(currentSong, currentIndex)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform cursor-pointer" />
                    </div>
                    <div className="truncate pr-6 text-left">
                        <div className="text-lg md:text-2xl font-black truncate uppercase tracking-tighter hover:text-cyan-400 cursor-pointer transition-colors leading-none mb-1 md:mb-2">{currentSong?.title}</div>
                        <div className="text-sm font-black text-white/60 uppercase tracking-[0.3em] truncate">{currentSong?.artist}</div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center max-w-xl">
                    <div className="flex items-center space-x-12 mb-4">
                            <button onClick={handlePrev} className="text-white/60 hover:text-cyan-400 transition-all active:scale-75 disabled:opacity-5 group" disabled={currentIndex === 0}>
                            <svg fill="currentColor" viewBox="0 0 16 16" className="w-7 h-7 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"><path d="M3.3 1a.7.7 0 01.7.7v5.15l9.95-5.744a.7.7 0 011.05.606v12.575a.7.7 0 01-1.05.607L4 9.149V14.3a.7.7 0 01-1.4 0V1.7a.7.7 0 01.7-.7z"/></svg>
                        </button>
                        <button onClick={togglePlayPause} className="w-14 h-14 rounded-[1.2rem] bg-white text-black flex items-center justify-center hover:scale-110 hover:bg-cyan-400 active:scale-95 transition-all shadow-2xl">
                            {isPlaying ? <svg fill="currentColor" viewBox="0 0 16 16" className="w-8 h-8"><path fillRule="evenodd" d="M2.7 1a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7H2.7zm8 0a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-2.6z"/></svg> : <svg fill="currentColor" viewBox="0 0 16 16" className="w-8 h-8 ml-1"><path d="M3 1.713a.7.7 0 011.05-.607l10.89 6.288a.7.7 0 010 1.212L4.05 14.894A.7.7 0 013 14.288V1.713z"/></svg>}
                        </button>
                        <button onClick={handleNext} className="text-white/60 hover:text-cyan-400 transition-all active:scale-75 disabled:opacity-5 group" disabled={currentIndex === playlist.length - 1}>
                            <svg fill="currentColor" viewBox="0 0 16 16" className="w-7 h-7 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"><path d="M12.7 1a.7.7 0 00-.7.7v5.15L2.05 1.107A.7.7 0 001 1.712v12.575a.7.7 0 001.05.607L12 9.149V14.3a.7.7 0 001.4 0V1.7a.7.7 0 00-.7-.7z"/></svg>
                        </button>
                    </div>
                    
                    <div className="w-full flex items-center space-x-6 text-sm font-black tracking-[0.2em] text-white/60">
                        <span className="w-12 text-right tabular-nums">{formatTime(currentTime)}</span>
                        <div className="flex-1 relative group h-1 bg-white/5 rounded-full overflow-hidden">
                           <div className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]" style={{ width: `${(currentTime / (duration || 210)) * 100}%` }}></div>
                           <input type="range" min="0" max={duration || 210} value={currentTime || 0} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                        </div>
                        <span className="w-12 text-left tabular-nums">{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="flex-[0.35] hidden md:flex justify-end items-center text-white/60 space-x-8 pr-4">
                    <div className="flex items-center space-x-4 group w-44">
                        <svg className="w-6 h-6 group-hover:text-cyan-400 transition-colors" fill="currentColor" viewBox="0 0 16 16"><path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.478 7.478 0 0 1 13.025 8c0 1.847-.665 3.538-1.766 4.852l.707.707z"/><path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.611 3.889l.707.707z"/><path d="M10.025 8a1.99 1.99 0 0 1-2.43 1.944L1 4h5.21l.363-.29A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/></svg>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
                            <div className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-300" style={{ width: `${volume}%` }}></div>
                            <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaylistDisplay;
