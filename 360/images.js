let params = (new URL(document.location)).searchParams;
unsplash = params.has('unsplash');
subject = (params.has('subject')) ? encodeURI(params.get('subject')) : "nature";
type = (params.has('subject')) ? "featured" : "random";

function Start() {
    if (window !== window.top && window.origin !== 'null') { console.error('Please use a sandboxed iframe'); return }
    var prefix = "&";
    if (unsplash) {
        src = "https://source.unsplash.com/" + type;
        if (params.has('subject')) {
            src = src.concat("/?" + subject);
        } else {
            prefix = "?";
        }
    } else {
    }
    var i = 1;
    bg.setAttribute("height", window.innerHeight);
    bg.setAttribute("width", window.innerWidth);
    bg.setAttribute("src", src + prefix + "c=" + i);
    setInterval(_ => {
        bg.setAttribute("src", src + prefix + "c=" + i);
        i += 1;
    }, 5000);
}
