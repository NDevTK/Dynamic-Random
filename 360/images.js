let params = (new URL(document.location)).searchParams;
unsplash = params.has('unsplash');
subject = (params.has('subject')) ? encodeURI(params.get('subject')) : "nature";
type = (params.has('subject')) ? "featured" : "random";
res =  + "x" + ;

function Start() {
    if (unsplash) {
	    src = "https://source.unsplash.com/" + type;
	    if (params.has('subject')) {
		    src = src.concat("/?" + subject);
	    }
    } else {
	    src = "https://imgapi.ndev.workers.dev/?subject="+subject;
    }
    var count = 1;
    bg.setAttribute(height, window.screen.availHeight);
    bg.setAttribute(width, window.screen.availWidth);
    setInterval(_ => {
      bg.src = src+"&c=" + i + 1;
    }, 10000);
}
