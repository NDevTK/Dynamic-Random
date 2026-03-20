/**
 * @file webgpu_fluid_architecture.js
 * @description Grid-based 2D fluid simulation. WebGPU: 128×128 grid via compute
 * shaders. Canvas 2D fallback: 64×64 JS Navier-Stokes. Dye injected at mouse;
 * rendered via ImageData pixel-blitting.
 */

import { Architecture } from './background_architectures.js';
import { webgpuCompute } from './webgpu_compute.js';
import { mouse } from './state.js';

// WGSL: single-pass diffuse (one Gauss-Seidel step, caller loops)
const DIFFUSE_WGSL = `
struct U { N:u32, a:f32, c:f32, _p:f32 }
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var<storage,read> x0:array<f32>;
@group(0) @binding(2) var<storage,read_write> x:array<f32>;
fn IX(i:u32,j:u32)->u32{return i+(u.N+2u)*j;}
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) id:vec3<u32>){
  let i=id.x+1u; let j=id.y+1u;
  if(i>u.N||j>u.N){return;}
  x[IX(i,j)]=(x0[IX(i,j)]+u.a*(x[IX(i-1u,j)]+x[IX(i+1u,j)]+x[IX(i,j-1u)]+x[IX(i,j+1u)]))/u.c;
}`;

// WGSL: semi-Lagrangian advect
const ADVECT_WGSL = `
struct U { N:u32, dt0:f32, _p0:u32, _p1:u32 }
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var<storage,read> d0:array<f32>;
@group(0) @binding(2) var<storage,read> uu:array<f32>;
@group(0) @binding(3) var<storage,read> vv:array<f32>;
@group(0) @binding(4) var<storage,read_write> d:array<f32>;
fn IX(i:u32,j:u32)->u32{return i+(u.N+2u)*j;}
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) id:vec3<u32>){
  let i=id.x+1u; let j=id.y+1u;
  if(i>u.N||j>u.N){return;}
  let N=f32(u.N);
  var px=clamp(f32(i)-u.dt0*uu[IX(i,j)],0.5,N+0.5);
  var py=clamp(f32(j)-u.dt0*vv[IX(i,j)],0.5,N+0.5);
  let i0=u32(px);let i1=i0+1u; let j0=u32(py);let j1=j0+1u;
  let s1=px-f32(i0);let s0=1.0-s1; let t1=py-f32(j0);let t0=1.0-t1;
  d[IX(i,j)]=s0*(t0*d0[IX(i0,j0)]+t1*d0[IX(i0,j1)])+s1*(t0*d0[IX(i1,j0)]+t1*d0[IX(i1,j1)]);
}`;

// WGSL: divergence for projection
const DIV_WGSL = `
struct U { N:u32, _p0:u32, _p1:u32, _p2:u32 }
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var<storage,read> vx:array<f32>;
@group(0) @binding(2) var<storage,read> vy:array<f32>;
@group(0) @binding(3) var<storage,read_write> div:array<f32>;
@group(0) @binding(4) var<storage,read_write> p:array<f32>;
fn IX(i:u32,j:u32)->u32{return i+(u.N+2u)*j;}
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) id:vec3<u32>){
  let i=id.x+1u;let j=id.y+1u;
  if(i>u.N||j>u.N){return;}
  let N=f32(u.N);
  div[IX(i,j)]=-0.5/N*(vx[IX(i+1u,j)]-vx[IX(i-1u,j)]+vy[IX(i,j+1u)]-vy[IX(i,j-1u)]);
  p[IX(i,j)]=0.0;
}`;

// WGSL: pressure gradient subtraction
const GRAD_WGSL = `
struct U { N:u32, _p0:u32, _p1:u32, _p2:u32 }
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var<storage,read> p:array<f32>;
@group(0) @binding(2) var<storage,read_write> vx:array<f32>;
@group(0) @binding(3) var<storage,read_write> vy:array<f32>;
fn IX(i:u32,j:u32)->u32{return i+(u.N+2u)*j;}
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) id:vec3<u32>){
  let i=id.x+1u;let j=id.y+1u;
  if(i>u.N||j>u.N){return;}
  let N=f32(u.N);
  vx[IX(i,j)]-=0.5*N*(p[IX(i+1u,j)]-p[IX(i-1u,j)]);
  vy[IX(i,j)]-=0.5*N*(p[IX(i,j+1u)]-p[IX(i,j-1u)]);
}`;

const GPU_N = 128, CPU_N = 64;

function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0)*255), Math.round(f(8)*255), Math.round(f(4)*255)];
}

export class WebGPUFluidArchitecture extends Architecture {
    constructor() {
        super();
        this.N = 0; this.useGPU = false; this.hueBase = 200; this.tick = 0;
        this.prevMx = 0; this.prevMy = 0;
        this._offscreen = null; this._offCtx = null; this._imageData = null;
        // CPU arrays
        this._vx=null;this._vy=null;this._vxP=null;this._vyP=null;
        this._dyeR=null;this._dyeG=null;this._dyeB=null;
        this._dyeRP=null;this._dyeGP=null;this._dyeBP=null;
        // GPU
        this._bufs=null; this._pipes=null; this._gpuReady=false;
        this._gpuDye=null; this._stagingBuf=null; this._stagingMapped=false;
    }

    async init(system) {
        this.hueBase = system.hue || 200;
        this.prevMx = mouse.x; this.prevMy = mouse.y; this.tick = 0;
        if (!webgpuCompute.available) await webgpuCompute.init();
        if (webgpuCompute.available) this._initGPU(system); else this._initCPU(system);
        const N = this.N;
        this._offscreen = document.createElement('canvas');
        this._offscreen.width = N; this._offscreen.height = N;
        this._offCtx = this._offscreen.getContext('2d');
        this._imageData = this._offCtx.createImageData(N, N);
    }

    _seedFields(N, vxArr, vyArr, drArr, dgArr, dbArr, hueBase) {
        for (let j=1; j<=N; j++) for (let i=1; i<=N; i++) {
            const idx = i+(N+2)*j;
            vxArr[idx] =  Math.sin(j/N*Math.PI*2)*3;
            vyArr[idx] =  Math.cos(i/N*Math.PI*2)*3;
            const v = Math.sin(i/N*Math.PI*3)*Math.cos(j/N*Math.PI*3)*0.5+0.5;
            if (v > 0.4) {
                const rgb = hslToRgb((hueBase+v*120)%360, 80, 55);
                const k = (v-0.4)*1.6;
                drArr[idx]=rgb[0]/255*k; dgArr[idx]=rgb[1]/255*k; dbArr[idx]=rgb[2]/255*k;
            }
        }
    }

    _initGPU(system) {
        const device = webgpuCompute.device;
        const N = GPU_N; const size = (N+2)*(N+2); const bytes = size*4;
        const BU = GPUBufferUsage;
        const mk  = f => webgpuCompute.createBuffer(bytes, f);
        const mkU = s => webgpuCompute.createBuffer(s, BU.UNIFORM|BU.COPY_DST);
        const SRWC = BU.STORAGE|BU.COPY_SRC|BU.COPY_DST;
        const SRC  = BU.STORAGE|BU.COPY_DST;
        this._bufs = {
            vx:mk(SRWC),vy:mk(SRWC),vxP:mk(SRC),vyP:mk(SRC),
            dyeR:mk(SRWC),dyeG:mk(SRWC),dyeB:mk(SRWC),
            dyeRP:mk(SRC),dyeGP:mk(SRC),dyeBP:mk(SRC),
            div:mk(SRWC),p:mk(SRWC),
            uD:mkU(16),uA:mkU(16),uP:mkU(16),
        };
        const b = this._bufs;
        const vxI=new Float32Array(size),vyI=new Float32Array(size);
        const drI=new Float32Array(size),dgI=new Float32Array(size),dbI=new Float32Array(size);
        this._seedFields(N,vxI,vyI,drI,dgI,dbI,this.hueBase);
        device.queue.writeBuffer(b.vx,0,vxI); device.queue.writeBuffer(b.vy,0,vyI);
        device.queue.writeBuffer(b.dyeR,0,drI); device.queue.writeBuffer(b.dyeG,0,dgI); device.queue.writeBuffer(b.dyeB,0,dbI);

        const ro=(i)=>({binding:i,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}});
        const rw=(i)=>({binding:i,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}});
        const un=(i)=>({binding:i,visibility:GPUShaderStage.COMPUTE,buffer:{type:'uniform'}});
        const diff  =webgpuCompute.createComputePipeline(DIFFUSE_WGSL,[un(0),ro(1),rw(2)]);
        const advect=webgpuCompute.createComputePipeline(ADVECT_WGSL, [un(0),ro(1),ro(2),ro(3),rw(4)]);
        const divP  =webgpuCompute.createComputePipeline(DIV_WGSL,   [un(0),ro(1),ro(2),rw(3),rw(4)]);
        const gradP =webgpuCompute.createComputePipeline(GRAD_WGSL,  [un(0),ro(1),rw(2),rw(3)]);
        if (!diff||!advect||!divP||!gradP){this._initCPU(system);return;}
        this._pipes={diff,advect,divP,gradP};
        this._stagingBuf=webgpuCompute.createBuffer(bytes*3,BU.MAP_READ|BU.COPY_DST);
        this.N=GPU_N; this.useGPU=true; this._gpuReady=true;
    }

    _initCPU(system) {
        this.useGPU=false; const N=CPU_N; const size=(N+2)*(N+2); this.N=N;
        const mk=()=>new Float32Array(size);
        [this._vx,this._vy,this._vxP,this._vyP,
         this._dyeR,this._dyeG,this._dyeB,
         this._dyeRP,this._dyeGP,this._dyeBP]=Array.from({length:10},mk);
        this._seedFields(N,this._vx,this._vy,this._dyeR,this._dyeG,this._dyeB,this.hueBase);
    }

    update(system) {
        this.tick++;
        const N=this.N;
        const mx=Math.floor(mouse.x/system.width*N)+1;
        const my=Math.floor(mouse.y/system.height*N)+1;
        const dvx=(mouse.x-this.prevMx)*0.4, dvy=(mouse.y-this.prevMy)*0.4;
        this.prevMx=mouse.x; this.prevMy=mouse.y;
        if (this.useGPU&&this._gpuReady) this._updateGPU(system,mx,my,dvx,dvy);
        else this._updateCPU(system,mx,my,dvx,dvy);
    }

    _updateGPU(system,mx,my,dvx,dvy) {
        const device=webgpuCompute.device;
        const N=GPU_N,size=(N+2)*(N+2),bytes=size*4;
        const b=this._bufs,pipes=this._pipes;
        const wg=Math.ceil(N/8), dt=0.15*(system.speedMultiplier||1);

        // Inject mouse
        if (mx>=1&&mx<=N&&my>=1&&my<=N) {
            const vxP=new Float32Array(size),vyP=new Float32Array(size);
            const dr=new Float32Array(size),dg=new Float32Array(size),db=new Float32Array(size);
            const rgb=hslToRgb((this.hueBase+this.tick*1.5)%360,90,60);
            const r=4;
            for (let dy=-r;dy<=r;dy++) for (let dx=-r;dx<=r;dx++) {
                const ii=mx+dx,jj=my+dy;
                if(ii<1||ii>N||jj<1||jj>N)continue;
                const idx=ii+(N+2)*jj,w=Math.max(0,1-Math.sqrt(dx*dx+dy*dy)/r);
                vxP[idx]=dvx*w;vyP[idx]=dvy*w;
                dr[idx]=rgb[0]/255*0.4*w;dg[idx]=rgb[1]/255*0.4*w;db[idx]=rgb[2]/255*0.4*w;
            }
            device.queue.writeBuffer(b.vxP,0,vxP);device.queue.writeBuffer(b.vyP,0,vyP);
            device.queue.writeBuffer(b.dyeRP,0,dr);device.queue.writeBuffer(b.dyeGP,0,dg);device.queue.writeBuffer(b.dyeBP,0,db);
        }

        const enc=device.createCommandEncoder();
        const pass=enc.beginComputePass();
        const buf=r=>({buffer:r});
        const bg=(pipe,entries)=>device.createBindGroup({layout:pipe.bindGroupLayout,entries:entries.map((r,i)=>({binding:i,resource:buf(r)}))});
        const run=(pipe,entries)=>{pass.setPipeline(pipe.pipeline);pass.setBindGroup(0,bg(pipe,entries));pass.dispatchWorkgroups(wg,wg);};

        // Uniform helpers
        const setDiff=(a,c)=>{const u=new Float32Array(4);new Uint32Array(u.buffer)[0]=N;u[1]=a;u[2]=c;device.queue.writeBuffer(b.uD,0,u);};
        const setAdvect=()=>{const u=new Uint32Array(4);u[0]=N;const f=new Float32Array(u.buffer);f[1]=dt*N;device.queue.writeBuffer(b.uA,0,u);};
        const setProj=()=>{const u=new Uint32Array(4);u[0]=N;device.queue.writeBuffer(b.uP,0,u);};

        const visc=0.00001,diff=0.00008;
        const project=(vx,vy)=>{
            setProj();
            run(pipes.divP,[b.uP,vx,vy,b.div,b.p]);
            const da=dt*1*N*N; setDiff(da/4,1+da);
            for(let k=0;k<4;k++) run(pipes.diff,[b.uD,b.div,b.p]);
            run(pipes.gradP,[b.uP,b.p,vx,vy]);
        };

        // Velocity step: diffuse → project → advect → project
        const va=dt*visc*N*N; setDiff(va,1+4*va);
        for(let k=0;k<4;k++){run(pipes.diff,[b.uD,b.vx,b.vxP]);run(pipes.diff,[b.uD,b.vy,b.vyP]);}
        project(b.vxP,b.vyP);
        setAdvect();
        run(pipes.advect,[b.uA,b.vxP,b.vxP,b.vyP,b.vx]);
        run(pipes.advect,[b.uA,b.vyP,b.vxP,b.vyP,b.vy]);
        project(b.vx,b.vy);

        // Dye step: diffuse → advect
        const da=dt*diff*N*N; setDiff(da,1+4*da);
        for(const[cur,prev]of[[b.dyeR,b.dyeRP],[b.dyeG,b.dyeGP],[b.dyeB,b.dyeBP]]){
            for(let k=0;k<2;k++) run(pipes.diff,[b.uD,cur,prev]);
            run(pipes.advect,[b.uA,prev,b.vx,b.vy,cur]);
        }

        // Readback dye
        if(!this._stagingMapped){
            enc.copyBufferToBuffer(b.dyeR,0,this._stagingBuf,0,bytes);
            enc.copyBufferToBuffer(b.dyeG,0,this._stagingBuf,bytes,bytes);
            enc.copyBufferToBuffer(b.dyeB,0,this._stagingBuf,bytes*2,bytes);
        }
        pass.end();
        device.queue.submit([enc.finish()]);
        if(!this._stagingMapped){
            this._stagingMapped=true;
            this._stagingBuf.mapAsync(GPUMapMode.READ).then(()=>{
                this._gpuDye=new Float32Array(this._stagingBuf.getMappedRange().slice(0));
                this._stagingBuf.unmap(); this._stagingMapped=false;
            }).catch(()=>{this._stagingMapped=false;});
        }
    }

    _IX(i,j){return i+(this.N+2)*j;}
    _setBnd(b,x){
        const N=this.N;
        for(let i=1;i<=N;i++){
            x[this._IX(0,i)]=b===1?-x[this._IX(1,i)]:x[this._IX(1,i)];
            x[this._IX(N+1,i)]=b===1?-x[this._IX(N,i)]:x[this._IX(N,i)];
            x[this._IX(i,0)]=b===2?-x[this._IX(i,1)]:x[this._IX(i,1)];
            x[this._IX(i,N+1)]=b===2?-x[this._IX(i,N)]:x[this._IX(i,N)];
        }
        x[this._IX(0,0)]=0.5*(x[this._IX(1,0)]+x[this._IX(0,1)]);
        x[this._IX(0,N+1)]=0.5*(x[this._IX(1,N+1)]+x[this._IX(0,N)]);
        x[this._IX(N+1,0)]=0.5*(x[this._IX(N,0)]+x[this._IX(N+1,1)]);
        x[this._IX(N+1,N+1)]=0.5*(x[this._IX(N,N+1)]+x[this._IX(N+1,N)]);
    }
    _diffCPU(b,x,x0,diff,dt){
        const N=this.N,a=dt*diff*N*N,c=1+4*a;
        for(let k=0;k<4;k++){
            for(let j=1;j<=N;j++)for(let i=1;i<=N;i++){
                const idx=this._IX(i,j);
                x[idx]=(x0[idx]+a*(x[this._IX(i-1,j)]+x[this._IX(i+1,j)]+x[this._IX(i,j-1)]+x[this._IX(i,j+1)]))/c;
            }
            this._setBnd(b,x);
        }
    }
    _advCPU(b,d,d0,u,v,dt){
        const N=this.N,dt0=dt*N;
        for(let j=1;j<=N;j++)for(let i=1;i<=N;i++){
            const px=Math.max(0.5,Math.min(N+0.5,i-dt0*u[this._IX(i,j)]));
            const py=Math.max(0.5,Math.min(N+0.5,j-dt0*v[this._IX(i,j)]));
            const i0=Math.floor(px),i1=i0+1,j0=Math.floor(py),j1=j0+1;
            const s1=px-i0,s0=1-s1,t1=py-j0,t0=1-t1;
            d[this._IX(i,j)]=s0*(t0*d0[this._IX(i0,j0)]+t1*d0[this._IX(i0,j1)])+s1*(t0*d0[this._IX(i1,j0)]+t1*d0[this._IX(i1,j1)]);
        }
        this._setBnd(b,d);
    }
    _projCPU(vx,vy,p,div){
        const N=this.N;
        for(let j=1;j<=N;j++)for(let i=1;i<=N;i++){
            div[this._IX(i,j)]=-0.5/N*(vx[this._IX(i+1,j)]-vx[this._IX(i-1,j)]+vy[this._IX(i,j+1)]-vy[this._IX(i,j-1)]);
            p[this._IX(i,j)]=0;
        }
        this._setBnd(0,div);this._setBnd(0,p);
        for(let k=0;k<4;k++){
            for(let j=1;j<=N;j++)for(let i=1;i<=N;i++)
                p[this._IX(i,j)]=(div[this._IX(i,j)]+p[this._IX(i-1,j)]+p[this._IX(i+1,j)]+p[this._IX(i,j-1)]+p[this._IX(i,j+1)])/4;
            this._setBnd(0,p);
        }
        for(let j=1;j<=N;j++)for(let i=1;i<=N;i++){
            vx[this._IX(i,j)]-=0.5*N*(p[this._IX(i+1,j)]-p[this._IX(i-1,j)]);
            vy[this._IX(i,j)]-=0.5*N*(p[this._IX(i,j+1)]-p[this._IX(i,j-1)]);
        }
        this._setBnd(1,vx);this._setBnd(2,vy);
    }

    _updateCPU(system,mx,my,dvx,dvy){
        const N=this.N,dt=0.15*(system.speedMultiplier||1);
        if(mx>=1&&mx<=N&&my>=1&&my<=N){
            const r=3,rgb=hslToRgb((this.hueBase+this.tick*1.5)%360,90,60);
            for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
                const ii=mx+dx,jj=my+dy;
                if(ii<1||ii>N||jj<1||jj>N)continue;
                const idx=ii+(N+2)*jj,w=Math.max(0,1-Math.sqrt(dx*dx+dy*dy)/r);
                this._vx[idx]+=dvx*w;this._vy[idx]+=dvy*w;
                this._dyeR[idx]+=rgb[0]/255*0.4*w;
                this._dyeG[idx]+=rgb[1]/255*0.4*w;
                this._dyeB[idx]+=rgb[2]/255*0.4*w;
            }
        }
        if(this.tick%90===0){
            const pi=Math.floor(Math.random()*N)+1,pj=Math.floor(Math.random()*N)+1;
            const idx=pi+(N+2)*pj,rgb=hslToRgb((this.hueBase+Math.random()*180)%360,90,60);
            this._dyeR[idx]+=rgb[0]/255*0.6;this._dyeG[idx]+=rgb[1]/255*0.6;this._dyeB[idx]+=rgb[2]/255*0.6;
        }
        this._diffCPU(1,this._vxP,this._vx,0.00001,dt);
        this._diffCPU(2,this._vyP,this._vy,0.00001,dt);
        this._projCPU(this._vxP,this._vyP,this._vx,this._vy);
        this._advCPU(1,this._vx,this._vxP,this._vxP,this._vyP,dt);
        this._advCPU(2,this._vy,this._vyP,this._vxP,this._vyP,dt);
        this._projCPU(this._vx,this._vy,this._vxP,this._vyP);
        for(const[c,p]of[[this._dyeR,this._dyeRP],[this._dyeG,this._dyeGP],[this._dyeB,this._dyeBP]]){
            this._diffCPU(0,p,c,0.00008,dt);
            this._advCPU(0,c,p,this._vx,this._vy,dt);
        }
    }

    draw(system){
        const N=this.N,pixels=this._imageData.data;
        const size=(N+2)*(N+2);
        let p=0;
        if(this.useGPU&&this._gpuDye){
            const rB=this._gpuDye,gB=this._gpuDye.subarray(size,size*2),bB=this._gpuDye.subarray(size*2,size*3);
            for(let j=1;j<=N;j++)for(let i=1;i<=N;i++){
                const idx=i+(N+2)*j;
                pixels[p]=Math.min(255,rB[idx]*510); pixels[p+1]=Math.min(255,gB[idx]*510);
                pixels[p+2]=Math.min(255,bB[idx]*510); pixels[p+3]=220; p+=4;
            }
        } else if(!this.useGPU){
            for(let j=1;j<=N;j++)for(let i=1;i<=N;i++){
                const idx=i+(N+2)*j;
                pixels[p]=Math.min(255,this._dyeR[idx]*510); pixels[p+1]=Math.min(255,this._dyeG[idx]*510);
                pixels[p+2]=Math.min(255,this._dyeB[idx]*510); pixels[p+3]=220; p+=4;
            }
        } else return;
        this._offCtx.putImageData(this._imageData,0,0);
        const ctx=system.ctx;
        ctx.save();
        ctx.imageSmoothingEnabled=true;
        ctx.imageSmoothingQuality='high';
        ctx.drawImage(this._offscreen,0,0,system.width,system.height);
        ctx.restore();
    }
}
