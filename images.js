FlickrRND.JSONP = false;
FlickrRND.per_event = 1;

function CreateURL(page) {
    return "https://imgapi.ndev.tk/" + FlickrRND.subject + "/" + page;
}

let params = (new URL(document.location)).searchParams;
unsplash = params.has('unsplash');
subject = (params.has('subject')) ? params.get('subject') : "nature";
type = (params.has('subject')) ? "featured" : "random";
res = window.screen.availHeight + "x" + window.screen.availWidth;
src = "https://source.unsplash.com/" + type + "/" + res;

if (params.has('subject')) {
    src = src.concat("/?" + subject);
}

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
    while(bg.images.length > 4) {
        bg.images.shift();
    }
}

function Start() {
    if (unsplash) {
        imagemgr();
    } else {
        window.addEventListener("onFlickrImage", function (event) {
            addImage(event.detail.urls[0]);
        })
        InitFlickrRandom(subject);
    }
}
