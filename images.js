  
FlickrRND.JSONP = false;
FlickrRND.per_event = 1;
oldCount = 1;

function CreateURL(page){ // Override from flickrRandom
    return "https://imgapi.ndev.tk/" + FlickrRND.subject + "/" + page;
}

let params = (new URL(document.location)).searchParams;

// Unsplash Start
unsplash = params.has('unsplash');
subject = encodeURI(params.get('subject'));

type = (params.has('subject')) ? "featured" : "random";

res =  window.screen.availHeight+"x"+window.screen.availWidth;

src = "https://source.unsplash.com/" + type + "/" + res;

if(params.has('subject')) {
    src = src.concat("/?"+subject);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function imagemgr() {
    while (true) {
        if(bg.images.length < 3) {
            await fetch(src).then(img => addImage(img.url));
            await sleep(3000);
        }
    }
}


function addImage(url) {
	if(bg.images.length > 3) return
        bg.images.push(url);
        // Cleanup images
	if(bg._zCounter > oldCount) {
	    while(bg._zCounter > oldCount) {
	        bg.images.shift();
            }
	    oldCount = bg._zCounter;
	}
}

function Start() {
	return console.warn("Dynamic-Random NOT WORKING :-(");
	bg.images = [src];
	if (unsplash) {
		imagemgr(); // Unsplash
	} else {
		window.addEventListener("onFlickrImage", function(event) { // Flickr
			addImage(event.detail.urls[0]);
		})
		InitFlickrRandom(subject);
	}
}
