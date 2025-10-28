/**
 * @file config.js
 * @description This file contains the base configuration for the particles.js library.
 */

export const baseConfig = {
    "particles": {
        "number": {
            "value": 150,
            "density": {
                "enable": true,
                "value_area": 800
            }
        },
        "color": {
            "value": "#ffffff"
        },
        "shape": {
            "type": "circle",
            "polygon": {
                "nb_sides": 5
            },
            "character": {
                "value": ["*"]
            }
        },
        "opacity": {
            "value": 0.5,
            "random": true
        },
        "size": {
            "value": 3,
            "random": true
        },
        "line_linked": {
            "enable": false
        },
        "move": {
            "enable": true,
            "speed": 4,
            "direction": "none",
            "straight": false,
            "out_mode": "out",
            "attract": {
                "enable": false
            },
            "trail": {
                "enable": true,
                "fillColor": "#000",
                "length": 10
            }
        }
    },
    "interactivity": {
        "detect_on": "canvas",
        "events": {
            "onhover": {
                "enable": true,
                "mode": "bubble"
            },
            "resize": true
        },
        "modes": {
            "bubble": {
                "distance": 200,
                "size": 8,
                "duration": 2
            }
        }
    },
    "retina_detect": true
};