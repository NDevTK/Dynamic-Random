let params = (new URL(document.location)).searchParams;
unsplash = params.has('unsplash');
subject = (params.has('subject')) ? encodeURI(params.get('subject')) : getSeason();
type = "featured";
res = window.innerHeight + "x" + window.innerWidth;

function getSeason() {
    const month = new Date().getMonth() + 1;
    switch (Math.ceil(month / 4)) {
        case 1:
            return "Spring";
        case 2:
            return "Summer";
        case 3:
            return "Autumn";
        case 4:
            return "Winter";
    }
}

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
