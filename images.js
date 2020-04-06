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
if(params.has('subject')) src = src.concat("/?"+subject);

document.body.style.backgroundImage = 'url(' + src +')';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function imagemgr() {
    while (true) {
        await getimages(1).then(urls => bg.images = urls);
    }
}

async function getimages(amount) {
    var images = [];
    for (i = 0; i < amount; i++) {
        await fetch(src).then(img => images.push(img.url));
        await sleep(3000);
    }
    return images
}
// Unsplash End

if (!unsplash) InitFlickrRandom(subject);
window.addEventListener('WebComponentsReady', function(e) {
    const kenBurnsCarousel = document.createElement('script');
    kenBurnsCarousel.src = 'ken-burns-carousel.min.js';
    document.head.appendChild(kenBurnsCarousel);
    kenBurnsCarousel.onload = () => {
        if (unsplash) {
            imagemgr(); // Unsplash
        } else {
            window.addEventListener("onFlickrImage", function(event) { // Flickr
                event.detail.urls.forEach(url => {
                    bg.images.push(url);
                });
            });
        }
    }
});
