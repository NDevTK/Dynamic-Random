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
	    await fetch(src).then(img => addImage(img.url));
            await sleep(3000);
    }
}

function addImage(url) {
    bg.images.push(url);
    while(bg.images.length > 3) {
        bg.images.shift();
    }
}

function Start() {
    if (unsplash) {
        src = "https://source.unsplash.com/" + type + "/" + res;
	    if (params.has('subject')) {
            src = src.concat("/?" + subject);
	    }
    } else {
	    src = "https://imgapi.ndev.tk/"+subject+"/embed"
    }
    bg.images = [src];
    imagemgr();
}
