FlickrRND = {}
FlickrRND.update_rate = 2000; // Get new images every second :D
FlickrRND.bufferAmount = 5;
FlickrRND.skip = ":D";
FlickrRND.queue = [];

function Data(name, altdata) { // If local storage does not have the key return with altdata
    var item = FlickrRND.subject + "#" + name; // eg "cats#seed"
    if (data = FlickrRND.store.getItem(item)) {
        return data
    } else {
        FlickrRND.store.setItem(item, altdata);
        return altdata
    }
}

function InitFlickrRandom(subject = "", license = 10) { // Start Function
    FlickrRND.subject = encodeURI(subject);
    FlickrRND.license = license;
    FlickrRND.store = window.localStorage;
    FlickrRND.seed = Data("seed", Math.random());
    FlickrRND.state = Data("state", 0);
    FlickrRND.SessionRNG = Math.seed(FlickrRND.seed);
    FlickrImageApi("1", "event");
}

function GetImage() {
    FlickrRND.state = parseInt(FlickrRND.state) + 1; // add one to state
    FlickrRND.store.setItem(FlickrRND.subject + "#state", FlickrRND.state); // save state
    FlickrImageApi(FlickrRND.order[FlickrRND.state]); // Get
}

function CreateURL(page) { // Template
    return "https://imgapi.ndev.tk/"+ FlickrRND.subject + "/" + page;
}

Math.seed = function(s) { // Magic seed function I did not make
    FlickrRND.seed = s;
    var mask = 0xffffffff;
    var m_w = (123456789 + s) & mask;
    var m_z = (987654321 - s) & mask;

    return function() {
        m_z = (36969 * (m_z & 65535) + (m_z >>> 16)) & mask;
        m_w = (18000 * (m_w & 65535) + (m_w >>> 16)) & mask;

        var result = ((m_z << 16) + (m_w & 65535)) >>> 0;
        result /= 4294967296;
        return result;
    }
}

function FlickrImageApi(page) { // Run JSONP
    var url = CreateURL(page);
    var s = document.createElement("script");
    s.src = url;
    document.body.appendChild(s);
    s.remove();
}

function shuffle(a) { // Shuffle array using seed
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(FlickrRND.SessionRNG() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function RandomOrder(pages) {
	if(pages > 10000) pages = 10000; // Fix API bug (im guessing)
    var numbers = [...Array(pages)].map((_, i) => i + 1);
    return shuffle(numbers);
}

function SendEvent(){
	if(FlickrRND.queue.length > 1) FlickrRND.queue.shift();
	if(FlickrRND.queue.length == 0) {
		GetImage();
		return false;
	}
	var event1 = new CustomEvent("onFlickrImage", FlickrRND.queue[0]);
    window.dispatchEvent(event1);
	GetImage();
}

function event(data) { // Main callback from flickr (returns true if event)
    if(FlickrRND.bufferAmount == FlickrRND.queue.length) return false;
    if(FlickrRND.skip == data.photos.photo[0].id){
		GetImage();
		return false;
	}
    if(data.stat == "fail" && data.message){
		var error = "FlickrAPI: "+data.message;
		alert(error);
		console.log(error);
	}
    FlickrRND.pages = data.photos.pages; // Get total pages
	if (FlickrRND.state > FlickrRND.pages) {
		FlickrRND.state = 0; // If state is invalid reset to 0
    }
    if (data.photos.page === 1) { // On first page start loop
        FlickrRND.skip = data.photos.photo[0].id;
        FlickrRND.order = RandomOrder(FlickrRND.pages); // Put requests in an random order
		GetImage();
        setInterval(SendEvent, FlickrRND.update_rate);
        if (FlickrRND.state > 0) return false // Dont send event
    }
	if(data.photos.photo[0].url_o && data.photos.photo[0].owner){ // Check response has url_o, owner
	FlickrRND.queue.push({detail: {url: data.photos.photo[0].url_o,credit: data.photos.photo[0].owner}});
	}
	GetImage();
    return true
}
