let params = (new URL(document.location)).searchParams;
unsplash = params.has('unsplash');
subject = (params.has('subject')) ? encodeURI(params.get('subject')) : getSeason();
type = (params.has('subject')) ? "featured" : "random";
res = window.innerHeight + "x" + window.innerWidth;

function getSeason() {
    const month = new Date().getMonth() + 1;
    switch (Math.floor(month / 4)) {
        case 0:
            return "Spring";
        case 1:
            return "Summer";
        case 2:
            return "Autumn";
        case 3:
            return "Winter";
    }
}

function Start() {
    var prefix = "&";
    if (unsplash) {
        src = "https://source.unsplash.com/" + type;
        if (params.has('subject')) {
            src = src.concat("/?" + subject);
        } else {
            prefix = "?";
        }
    } else {
        src = "https://imgapi.ndev.workers.dev/?subject=" + subject;
    }
    bg.images = Array.from({length: 100000}, (_, i) => src + prefix + "c=" + i + 1);
}
