import React from 'react';

const EmotionSelector = ({ emotions, onSelect, onOpenCamera, onOpenMic, isOffline }) => {
    return (
        <div className="flex-1 overflow-y-auto w-full h-full bg-[#0a0a12] relative animate-in fade-in duration-500">
            <div className="pt-32 pb-12 px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 space-y-6 md:space-y-0">
                    <div>
                        <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none mb-4 drop-shadow-2xl">Vibe Check</h2>
                        <div className="flex items-center space-x-3 text-violet-400 font-bold uppercase tracking-[0.2em] text-xs">
                           <span className="w-8 h-1 bg-violet-600 rounded-full"></span>
                           <span>Choose your mood to generate a playlist</span>
                        </div>
                    </div>
                </div>

                {/* Input Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
                    <div onClick={onOpenCamera} className="group bg-[#12121e] p-8 rounded-[2rem] border-2 border-dashed border-violet-500/20 hover:border-violet-500/50 hover:bg-violet-600/5 transition-all cursor-pointer flex flex-col items-center text-center space-y-6 shadow-2xl active:scale-95">
                        <div className="w-20 h-20 bg-violet-600/10 rounded-3xl flex items-center justify-center text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-all transform group-hover:rotate-12">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Camera Analysis</h3>
                            <p className="text-violet-300/40 text-sm font-bold uppercase tracking-widest mt-2 px-4 leading-relaxed">Let AI scan your face for emotions</p>
                        </div>
                    </div>
                    
                    <div onClick={onOpenMic} className="group bg-[#12121e] p-8 rounded-[2rem] border-2 border-dashed border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-600/5 transition-all cursor-pointer flex flex-col items-center text-center space-y-6 shadow-2xl active:scale-95">
                        <div className="w-20 h-20 bg-cyan-600/10 rounded-3xl flex items-center justify-center text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white transition-all transform group-hover:-rotate-12">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 00-3 3v8a3 3 0 006 0V5a3 3 0 00-3-3z"/></svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Voice Analysis</h3>
                            <p className="text-cyan-300/40 text-sm font-bold uppercase tracking-widest mt-2 px-4 leading-relaxed">Speak to find your sonic match</p>
                        </div>
                    </div>

                    <div className="col-span-1 lg:col-span-2 bg-gradient-to-br from-violet-900 to-indigo-950 p-10 rounded-[2rem] border border-white/5 shadow-2xl flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-cyan-400/20 transition-all duration-1000"></div>
                        <h3 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-6 relative z-10">AI Mode<br/><span className="text-cyan-400 tracking-[-0.05em]">Emotion Discovery</span></h3>
                        <p className="text-violet-200/60 font-bold max-w-sm relative z-10 leading-relaxed uppercase text-xs tracking-widest">Our proprietary Gemini 2.5 engine maps your biological signals to a curated soundscape in real-time.</p>
                    </div>
                </div>

                <div className="flex items-center space-x-6 mb-10">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Quick Mood Select</h3>
                    <div className="flex-1 h-px bg-white/5"></div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-6">
                    {emotions.map((emotion, idx) => (
                        <div 
                            key={emotion.name} 
                            onClick={() => onSelect(emotion)} 
                            className={`group bg-[#12121e] p-5 rounded-3xl hover:bg-[#1a1a2e] transition-all cursor-pointer shadow-xl border border-white/5 hover:border-violet-500/30 active:scale-95 ${isOffline ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                        >
                            <div className="w-full aspect-square rounded-2xl mb-5 shadow-2xl relative overflow-hidden bg-[#0a0a12]">
                                <img 
                                    src={`https://picsum.photos/seed/${emotion.name + idx}/300/300`} 
                                    alt={emotion.name} 
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100"
                                />
                                <div className={`absolute inset-0 bg-gradient-to-br ${emotion.gradient} opacity-20`}></div>
                                <div className="absolute right-3 bottom-3 w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-xl transition-all translate-y-2 group-hover:translate-y-0 z-20">
                                   <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                            </div>
                            <h3 className="font-black text-white uppercase tracking-tight text-lg truncate">{emotion.name}</h3>
                            <p className="text-[10px] font-black text-violet-300/30 uppercase tracking-[0.2em] mt-1 group-hover:text-violet-400 transition-colors">Vibe Mix</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EmotionSelector;
