/*jshint esversion: 8 */
// NDev 2023 hhttps://github.com/NDevTK/Dynamic-Random
"use strict";

const hour = new Date().getHours();
const dayState = (hour > 6 && hour < 20) ? '' : '%20night';

const month = new Date().getMonth() + 1;
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

season += dayState;

const params = (new URL(document.location)).searchParams;

const unsplash = params.has('unsplash');
const useseason = params.has('useseason');
const type = 'featured';

const suffix = useseason ? '%20' + season : '';

const subject = (params.has('subject')) ? encodeURIComponent(params.get('subject')) + suffix : 'nature%20' + season;

function Start() {
    let prefix = '&';
    let src = '';
    if (unsplash) {
        src = 'https://source.unsplash.com/' + type;
        if (subject) {
            src = src.concat('/?' + subject);
        } else {
            prefix = '?';
        }
    } else {
        src = 'https://imgapi.ndev.workers.dev/?subject=' + subject;
    }
    bg.images = Array.from({length: 100000}, (_, i) => src + prefix + "c=" + i + 1);
}

