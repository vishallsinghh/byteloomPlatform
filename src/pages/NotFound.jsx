import React, { useRef, useEffect } from 'react';

function NotFoundPage() {
  const overlayRef = useRef(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const handleMouseMove = (e) => {
      const { clientX: x, clientY: y } = e;
      const pos = `${x}px ${y}px`;
      const mask = `radial-gradient(circle 120px at ${pos}, transparent 0%, black 150px)`;
      overlay.style.maskImage = mask;
      overlay.style.webkitMaskImage = mask;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-gray-900 text-white overflow-hidden">
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <h1 className="text-6xl font-bold mb-4">Page Not Found</h1>
        <p className="text-xl">
          Sorry, we couldn’t find the page you’re looking for.
        </p>
        <a
          href="/"
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
        >
          Go Home
        </a>
      </div>

      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black z-20 pointer-events-none"
        style={{
          // initial spotlight centered
          maskImage: 'radial-gradient(circle 120px at 50% 50%, transparent 0%, black 150px)',
          WebkitMaskImage: 'radial-gradient(circle 120px at 50% 50%, transparent 0%, black 150px)',
        }}
      />
    </div>
  );
}

export default NotFoundPage