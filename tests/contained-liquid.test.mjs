import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {crearLiquidoContenido,animarLiquidoContenido} from '../src/scene/contained-liquid.js';
test('superficie contenida: fondo fijo, borde fijo, reposo y volumen medio estable',()=>{
 const c=new THREE.Group();c.add(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0,.03),new THREE.Vector2(.8,.03),new THREE.Vector2(.8,1),new THREE.Vector2(0,1)],64),new THREE.MeshStandardMaterial({transparent:true,opacity:.6})));
 crearLiquidoContenido(c,new THREE.Color(0x42accf),.6,true);
 const body=c.children[0],surface=c.children[1],initial=Array.from(body.geometry.attributes.position.array);
 assert.equal(body.material.depthWrite,true);assert.equal(c.children.length,2);
 const pos=surface.geometry.attributes.position,{top,radius}=surface.userData.superficieContenido;
 animarLiquidoContenido(c,.04,.03,.02,.2,1);
 let sum=0,weight=0;
 for(let i=0;i<pos.count;i++){const r=Math.hypot(pos.getX(i),pos.getZ(i))/radius,d=pos.getY(i)-top;sum+=d*r;weight+=r;assert.ok(Math.abs(d)<=.035001);if(r>.999)assert.ok(Math.abs(d)<1e-6);}
 assert.ok(Math.abs(sum/weight)<1e-6);assert.deepEqual(Array.from(body.geometry.attributes.position.array),initial);
 animarLiquidoContenido(c,0,0,0,0,2);for(let i=0;i<pos.count;i++)assert.ok(Math.abs(pos.getY(i)-top)<1e-6);
});
