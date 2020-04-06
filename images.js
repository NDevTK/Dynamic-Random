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

oldCount = 0;
function addImages(array) {
    array.forEach(url => {
        if(bg.images === undefined) {
            bg.images = [url];
        } else {
	    bg.images.push(url);
            // Cleanup images
            while(bg._zCounter !== oldCount) {
	        bg.images.shift();
            }
            oldCount = bg._zCounter;
	}
    })
}

function Start() {
	if (unsplash) {
		imagemgr(); // Unsplash
	} else {
		document.body.style.backgroundImage = 'url(' + src +')';
		window.addEventListener("onFlickrImage", function(event) { // Flickr
			addImages(event.detail.urls);
		})
		InitFlickrRandom(subject);
	}
}
