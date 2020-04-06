FlickrRND.JSONP = false;

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
	    await fetch(src).then(img => addImages([img.url]));
	    await sleep(3000);
    }
}

function addImages(array) {
    array.forEach(url => {
        if(!bg.hasOwnProperty("images")) {
            bg.images = [url];
        } else {
	    bg.images.push(url);
            // Preload images
            while(bg.images.length > 5) {
                bg.images.shift();
            }
	}
    })
}

function Start() {
	document.body.style.backgroundImage = 'url(' + src +')';
	if (unsplash) {
		imagemgr(); // Unsplash
	} else {
		InitFlickrRandom(subject);
		window.addEventListener("onFlickrImage", function(event) { // Flickr
			addImages(event.detail.urls);
		})
	}
}
