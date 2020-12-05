let params = (new URL(document.location)).searchParams;
subject = (params.has('subject')) ? encodeURI(params.get('subject')) : "nature";

function Start() {
    src = "https://imgapi.ndev.workers.dev/?subject="+subject;
    var i = 1;
    bg.setAttribute("height", window.screen.availHeight);
    bg.setAttribute("width", window.screen.availWidth); 
    bg.setAttribute("src", src+"&c=" + i);
    setInterval(_ => {
      bg.setAttribute("src", src+"&c=" + i);
      i += 1;
    }, 10000);
}
