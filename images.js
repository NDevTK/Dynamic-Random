let params = (new URL(document.location)).searchParams;
unsplash = params.has('unsplash');
subject = (params.has('subject')) ? encodeURI(params.get('subject')) : "nature";
type = (params.has('subject')) ? "featured" : "random";
res = window.screen.availHeight + "x" + window.screen.availWidth;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function imagemgr() {
    while (true) {
        while (bg.images.length > 3) {
            bg.images.shift();
        }
        while (bg.images.length < 4) {
            bg.images.push(src + "?a=" + Math.random());
        }
        await sleep(3000);
    }
}

function Start() {
    if (unsplash) {
	    src = "https://source.unsplash.com/" + type + "/" + res;
	    if (params.has('subject')) {
		    src = src.concat("/?" + subject);
	    }
    } else {
	    src = "https://imgapi.ndev.workers.dev/?subject="+subject;
    }
    bg.images = [src];
    imagemgr();
}
