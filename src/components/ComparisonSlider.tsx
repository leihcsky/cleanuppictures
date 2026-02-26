import { useState, useRef, useEffect } from "react";

const ComparisonSlider = ({ beforeUrl, afterUrl, className = "" }: {beforeUrl: string, afterUrl: string, className?: string}) => {
  const [position, setPosition] = useState(50);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-slide effect
  useEffect(() => {
    if (isHovering) return;
    let rafId: number;
    const startTime = Date.now();
    const animate = () => {
      const time = Date.now() - startTime;
      // Smooth sine wave movement between 5% and 95%
      const newPos = 50 + 45 * Math.sin(time * 0.0008);
      setPosition(newPos);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isHovering]);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setPosition(percent);
  };

  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize select-none shadow-xl ring-1 ring-slate-900/5 group ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      onTouchStart={() => setIsHovering(true)}
      onTouchEnd={() => setIsHovering(false)}
    >
        {/* Background (After/Result) */}
        <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] opacity-20 z-0"></div>
        <img src={afterUrl} alt="Result" className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" />
        <div className="absolute top-4 right-4 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm z-10 pointer-events-none">Result</div>

        {/* Foreground (Before/Original) - Clipped */}
        <div 
            className="absolute inset-0 z-10 pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
            <img src={beforeUrl} alt="Original" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm z-20">Original</div>
        </div>

        {/* Slider Handle */}
        <div 
            className="absolute inset-y-0 w-1 bg-white cursor-ew-resize z-30 shadow-[0_0_15px_rgba(0,0,0,0.5)] pointer-events-none"
            style={{ left: `${position}%` }}
        >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-400 transform transition-transform group-hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" className="rotate-90 origin-center" />
                </svg>
            </div>
        </div>
    </div>
  );
};

export default ComparisonSlider;
