let params = (new URL(document.location)).searchParams;
unsplash = params.has('unsplash');
subject = (params.has('subject')) ? encodeURI(params.get('subject')) : "nature";
type = (params.has('subject')) ? "featured" : "random";
res = window.screen.availHeight + "x" + window.screen.availWidth;

function Start() {
    var prefix = "?";
    if (unsplash) {
	    src = "https://source.unsplash.com/" + type + "/" + res;
	    if (params.has('subject')) {
		    src = src.concat("/"+ prefix + subject);
		    prefix = "&";
	    }
    } else {
	    src = "https://imgapi.ndev.workers.dev/?subject="+subject;
    }
    bg.images = Array.from({length: 100000}, (_, i) => src + prefix + "c=" + i + 1);
}
