FlickrRND.JSONP = false;
function CreateURL(page){ // Override from flickrRandom
return "https://imgapi.ndev.tk/" + FlickrRND.subject + "/" + page;
}

let params = (new URL(document.location)).searchParams;

// Unsplash Start
unsplash = params.has('unsplash');
subject = encodeURI(params.get('subject'));
if (params.has('subject')) {
    end = "featured/?" + subject;
} else {
    end = 'random';
}
document.body.style.backgroundImage = 'url(https://source.unsplash.com/' + end + ')'

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function imagemgr() {
    while (true) {
        await getimages(1).then(urls => document.getElementById('bg').images = urls);
    }
}
async function getimages(amount) {
    var images = [];
    for (i = 0; i < amount; i++) {
        await fetch('https://source.unsplash.com/' + end).then(img => images.push(img.url));
        await sleep(2000);
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
                document.getElementById('bg').images = event.detail.urls;
            });
        }
    }
});
