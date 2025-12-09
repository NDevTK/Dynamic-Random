/**
 * @file audio.js
 * @description Handles audio input and analysis for reacting to music/sound.
 */

let audioContext;
let analyser;
let microphone;
let dataArray;
let isAudioActive = false;

export async function initAudio() {
    if (isAudioActive) return true;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        isAudioActive = true;
        return true;
    } catch (err) {
        console.error('Error initializing audio:', err);
        return false;
    }
}

export function getAudioData() {
    if (!isAudioActive || !analyser) return null;

    analyser.getByteFrequencyData(dataArray);

    // Calculate some metrics
    let sum = 0;
    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;

    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
        if (i < dataArray.length * 0.1) bassSum += dataArray[i]; // Lower 10%
        else if (i < dataArray.length * 0.5) midSum += dataArray[i];
        else highSum += dataArray[i];
    }

    const average = sum / dataArray.length;

    return {
        raw: dataArray,
        average: average, // 0-255
        bass: bassSum / (dataArray.length * 0.1),
        mid: midSum / (dataArray.length * 0.4),
        high: highSum / (dataArray.length * 0.5),
        normalizedAvg: average / 255
    };
}

export function isAudioEnabled() {
    return isAudioActive;
}
