let season = '';

// probbaly not going to be correct :/
if ([12, 1, 2].includes(month))
    season = 'winter';
if ([3, 4, 5].includes(month))
    season = 'spring';
if ([6, 7, 8].includes(month))
    season = 'summer';
if ([9, 10, 11].includes(month))
    season = 'autumn';

let params = (new URL(document.location)).searchParams;
unsplash = params.has('unsplash');
subject = (params.has('subject')) ? encodeURIComponent(params.get('subject')) : 'abstract%20nature%20' + season;
type = "featured";

function Start() {
    var prefix = "&";
    if (unsplash) {
        src = "https://source.unsplash.com/" + type;
        if (subject) {
            src = src.concat("/?" + subject);
        } else {
            prefix = "?";
        }
    } else {
        src = "https://imgapi.ndev.workers.dev/?subject=" + subject;
    }
    bg.images = Array.from({length: 100000}, (_, i) => src + prefix + "c=" + i + 1);
}

