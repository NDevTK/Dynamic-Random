let params = (new URL(document.location)).searchParams;
unsplash = params.has('unsplash');
subject = (params.has('subject')) ? encodeURI(params.get('subject')) : "nature";
type = (params.has('subject')) ? "featured" : "random";

function Start() {
    var prefix = "&";
    if (unsplash) {	    
	    if (params.has('subject')) {
		    src = src.concat("/?"+subject);
	    } else {
            src = "https://source.unsplash.com/" + type;
            prefix = "?";
        }
    } else {
	    src = "https://imgapi.ndev.workers.dev/?subject="+subject;
    }
    var i = 1;
    bg.setAttribute("height", window.screen.availHeight);
    bg.setAttribute("width", window.screen.availWidth); 
    bg.setAttribute("src", src + prefix + "c=" + i);
    setInterval(_ => {
      bg.setAttribute("src", src + prefix + "c=" + i);
      i += 1;
    }, 5000);
}
