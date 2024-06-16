/*jshint esversion: 8 */
// NDev 2023 https://github.com/NDevTK/Dynamic-Random
"use strict";

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

const hour = new Date().getHours();
season += (hour > 6 && hour < 20) ? '' : '%20night';
