/**
 * @file loading_animation.js
 * @description Smooth fade-in loading animation on initial page load.
 * CSP-safe: uses only createElement/textContent/style.cssText.
 */

export const loadingAnimation = {
    _overlay: null,

    init() {
        // Create a full-screen black overlay that fades out
        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:9999',
            'background:#000', 'pointer-events:none',
            'transition:opacity 1.5s ease',
            'opacity:1'
        ].join(';');

        // Centered loading text
        const text = document.createElement('div');
        text.style.cssText = [
            'position:absolute', 'top:50%', 'left:50%',
            'transform:translate(-50%,-50%)',
            'color:rgba(255,255,255,0.3)',
            'font-family:"Exo 2",sans-serif',
            'font-size:14px', 'font-weight:300',
            'letter-spacing:4px', 'text-transform:uppercase',
            'transition:opacity 0.5s ease'
        ].join(';');
        text.textContent = 'loading';

        // Animated shimmer bar
        const shimmer = document.createElement('div');
        shimmer.style.cssText = [
            'position:absolute', 'top:calc(50% + 24px)', 'left:50%',
            'transform:translateX(-50%)',
            'width:120px', 'height:2px',
            'background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)',
            'animation:loadShimmer 1.2s ease-in-out infinite'
        ].join(';');

        // Inject keyframe animation
        const style = document.createElement('style');
        style.textContent = '@keyframes loadShimmer{0%{transform:translateX(-50%) scaleX(0.3);opacity:0.3}50%{transform:translateX(-50%) scaleX(1);opacity:1}100%{transform:translateX(-50%) scaleX(0.3);opacity:0.3}}';
        document.head.appendChild(style);

        overlay.appendChild(text);
        overlay.appendChild(shimmer);
        document.body.appendChild(overlay);
        this._overlay = overlay;

        // Start fade-out after a brief delay to ensure content is rendered
        setTimeout(() => {
            overlay.style.opacity = '0';
            // Remove overlay after transition completes
            setTimeout(() => {
                overlay.remove();
                this._overlay = null;
            }, 1600);
        }, 800);
    }
};
