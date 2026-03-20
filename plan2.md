# Implementation Plan: 7 Advanced Web Platform Features

## Overview
Seven features connecting the background system to real-world inputs (microphone, camera, gamepad, speech, multi-tab) and GPU-level compute (WebGPU, WASM). Each follows the singleton pattern, integrates via `system.*` properties, and degrades gracefully.

## Implementation Order
1. Gamepad API (high fun, low effort)
2. Microphone-Reactive Visuals (high wow, medium effort)
3. Multi-Tab Sync (unique/novel)
4. Speech Recognition (builds on Typography)
5. Camera as Living Texture
6. WASM Physics Engine (requires build step)
7. WebGPU Compute Shaders (cutting-edge, highest effort)

## New Files
- `js/gamepad_input.js` - Gamepad polling + deadzone
- `js/mic_reactive.js` - Web Audio AnalyserNode
- `js/tab_sync.js` - BroadcastChannel multi-tab
- `js/speech_input.js` - SpeechRecognition wrapper
- `js/speech_typography_architecture.js` - Spoken word visuals
- `js/camera_input.js` - getUserMedia video sampling
- `js/camera_texture_architecture.js` - Webcam-driven visuals
- `js/wasm_physics.js` - WASM loader + JS API
- `js/cloth_architecture.js` - WASM cloth sim
- `js/softbody_architecture.js` - WASM soft-body
- `js/webgpu_compute.js` - WebGPU system
- `js/webgpu_particle_architecture.js` - GPU 100k particles
- `js/webgpu_fluid_architecture.js` - GPU fluid sim
